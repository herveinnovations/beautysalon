// Server only. Never put SUPABASE_SECRET_KEY in browser code.
const {createHmac}=require('node:crypto');
module.exports=async function(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).end();
 const origin=req.headers.origin;
 if(!origin||origin!==`https://${req.headers.host}`)return res.status(403).end();
 if(!process.env.SUPABASE_SECRET_KEY||!process.env.ANALYTICS_SALT)return res.status(503).json({error:'Analytics not configured'});
 const b=req.body||{};
 if(b.consent!==true||!['visit','heartbeat','treatment','booking_preview','booking_request','whatsapp'].includes(b.kind)||! /^[a-f0-9-]{36}$/i.test(b.session||''))return res.status(400).end();
 // Derive a daily, browser-specific pseudonym. Do not store IP addresses or contact data.
 const session=createHmac('sha256',process.env.ANALYTICS_SALT).update(b.session+new Date().toISOString().slice(0,10)).digest('hex');
 const id=`${session.slice(0,8)}-${session.slice(8,12)}-4${session.slice(13,16)}-a${session.slice(17,20)}-${session.slice(20,32)}`;
 const url='https://ekcbgsfmlikfsxyewpff.supabase.co/rest/v1/bloom_visit_events';
 const headers={apikey:process.env.SUPABASE_SECRET_KEY,Authorization:'Bearer '+process.env.SUPABASE_SECRET_KEY,'Content-Type':'application/json'};
 try{
  const recent=await fetch(url+'?session_id=eq.'+id+'&created_at=gte.'+encodeURIComponent(new Date(Date.now()-60000).toISOString())+'&select=id&limit=21',{headers,signal:AbortSignal.timeout(8000)});
  if(!recent.ok)throw Error('database');
  if((await recent.json()).length>=20)return res.status(429).end();
  const val=k=>{const n=Number(req.headers[k]);return req.headers[k]&&Number.isFinite(n)?n:null};
  let city=null;try{city=decodeURIComponent(req.headers['x-vercel-ip-city']||'').slice(0,100)||null}catch{}
  const row={session_id:id,kind:b.kind,country:String(req.headers['x-vercel-ip-country']||'').slice(0,2)||null,city,latitude:val('x-vercel-ip-latitude'),longitude:val('x-vercel-ip-longitude'),treatment:typeof b.treatment==='string'?b.treatment.slice(0,100):null};
  const saved=await fetch(url,{method:'POST',headers,body:JSON.stringify(row),signal:AbortSignal.timeout(8000)});
  if(!saved.ok)throw Error('database');
  return res.status(204).end();
 }catch{return res.status(503).json({error:'Analytics unavailable'})}
};
