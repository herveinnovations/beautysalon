// Server only. Called by a Supabase database trigger after a new appointment request is saved.
// Emails the studio owner through Resend. Never expose these env values in browser code.
// Required Vercel env: NOTIFY_SECRET, SUPABASE_SECRET_KEY, RESEND_API_KEY. Optional: NOTIFY_EMAIL, NOTIFY_FROM.
const {timingSafeEqual}=require('node:crypto');
const SUPABASE='https://ekcbgsfmlikfsxyewpff.supabase.co';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const same=(a,b)=>{const x=Buffer.from(String(a||'')),y=Buffer.from(String(b||''));return x.length===y.length&&x.length>0&&timingSafeEqual(x,y)};

module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).end();
 if(!process.env.NOTIFY_SECRET||!same(req.headers['x-notify-secret'],process.env.NOTIFY_SECRET))return res.status(401).end();
 if(!process.env.SUPABASE_SECRET_KEY||!process.env.RESEND_API_KEY){console.error('notify: missing SUPABASE_SECRET_KEY or RESEND_API_KEY');return res.status(503).json({error:'Notifications not configured'})}
 const id=(req.body||{}).id;
 if(!/^[0-9a-f-]{36}$/i.test(id||''))return res.status(400).end();
 try{
  // Read the saved request from the database instead of trusting the request body.
  const headers={apikey:process.env.SUPABASE_SECRET_KEY,Authorization:'Bearer '+process.env.SUPABASE_SECRET_KEY};
  const r=await fetch(`${SUPABASE}/rest/v1/bloom_appointment_requests?id=eq.${id}&select=id,created_at,customer_name,email,phone,service_name,preferred_date,preferred_time,price_zmw,duration_minutes,followup_consent,status`,{headers,signal:AbortSignal.timeout(8000)});
  if(!r.ok)throw Error('database '+r.status);
  const a=(await r.json())[0];
  if(!a)return res.status(404).end();
  if(Date.now()-new Date(a.created_at).getTime()>15*60*1000)return res.status(409).json({error:'Too old to notify'});
  const date=new Date(a.preferred_date+'T12:00:00Z').toLocaleDateString('en-GB',{weekday:'long',day:'numeric',month:'long',year:'numeric',timeZone:'UTC'});
  const time=String(a.preferred_time).slice(0,5);
  const phone=String(a.phone||'').replace(/[^\d+]/g,'');
  const wa='https://wa.me/'+phone.replace(/^\+/,'')+'?text='+encodeURIComponent(`Hello ${a.customer_name}, thank you for your Glow Bloom request for ${a.service_name} on ${date} at ${time}. `);
  const rows=[['Treatment',a.service_name],['Date',date],['Time',time+' (Zambia time)'],['Duration',a.duration_minutes+' min'],['Price','K'+Number(a.price_zmw).toLocaleString('en-ZM')],['Name',a.customer_name],['Phone',a.phone],['Email',a.email],['May contact by phone/WhatsApp',a.followup_consent?'Yes':'No']];
  const html=`<div style="font-family:Arial,sans-serif;max-width:520px;color:#34212c"><h2 style="margin:0 0 6px">New booking request</h2><p style="margin:0 0 18px;color:#85737c">Pending: reply to the customer to confirm.</p><table style="border-collapse:collapse;width:100%;font-size:14px">${rows.map(([k,v])=>`<tr><td style="padding:8px 0;border-bottom:1px solid #eee;color:#85737c;width:45%">${esc(k)}</td><td style="padding:8px 0;border-bottom:1px solid #eee"><b>${esc(v)}</b></td></tr>`).join('')}</table><p style="margin:22px 0"><a href="${esc(wa)}" style="background:#236c51;color:#fff;padding:12px 20px;border-radius:24px;text-decoration:none;font-weight:bold">Reply on WhatsApp</a></p><p style="font-size:13px"><a href="https://glowbloom.vercel.app/admin.html" style="color:#723a50">Open studio admin</a></p><p style="font-size:11px;color:#a08f97">Reference ${esc(a.id)}</p></div>`;
  const text=rows.map(([k,v])=>`${k}: ${v}`).join('\n')+`\n\nReply on WhatsApp: ${wa}\nAdmin: https://glowbloom.vercel.app/admin.html\nReference: ${a.id}`;
  const sent=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:'Bearer '+process.env.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'booking-'+a.id},body:JSON.stringify({from:process.env.NOTIFY_FROM||'Glow Bloom <onboarding@resend.dev>',to:[process.env.NOTIFY_EMAIL||'hervecreativeagency@gmail.com'],reply_to:a.email||undefined,subject:`New booking: ${a.service_name}, ${date} ${time} (${a.customer_name})`,html,text}),signal:AbortSignal.timeout(10000)});
  if(!sent.ok){console.error('notify: resend',sent.status,(await sent.text()).slice(0,300));return res.status(502).json({error:'Email failed'})}
  return res.status(200).json({ok:true});
 }catch(e){console.error('notify:',e.message);return res.status(503).json({error:'Notification unavailable'})}
};
