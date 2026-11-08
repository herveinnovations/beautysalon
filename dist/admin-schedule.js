// "Schedule" tab: the week slot by slot - who booked, status, and adding studio bookings (WhatsApp, Instagram, walk-in).
(()=>{
 const TZ='Africa/Lusaka',DEFAULT_SLOTS='09:00, 10:30, 12:00, 13:30, 15:00',DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 const tab=document.createElement('button');tab.dataset.tab='schedule';tab.textContent='Schedule';tab.setAttribute('aria-pressed','false');
 const tabs=document.querySelector('.tabs');tabs.insertBefore(tab,tabs.children[1]||null);
 const panel=document.createElement('section');panel.id='schedule';panel.hidden=true;
 panel.innerHTML=`<style>
 #schedule .sched-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin:10px 0 18px}
 #schedule .sched-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:14px}
 #schedule .sday{background:#f5e8e5;border-radius:12px;padding:12px}
 #schedule .sday h3{margin:0 0 10px;font:600 17px Georgia;display:flex;justify-content:space-between;align-items:baseline}
 #schedule .sday h3 small{font:12px Arial;color:#806c77}
 #schedule .sslot{background:#fff;border:0;box-shadow:0 2px 8px rgba(52,33,44,.06);border-radius:9px;padding:10px 12px;margin-bottom:8px}
 #schedule .sslot .t{font-weight:bold;font-size:13px;color:#34212c;display:flex;justify-content:space-between;gap:8px;align-items:center}
 #schedule .sslot .who{margin-top:6px;font-size:14px;line-height:1.5;color:#34212c}
 #schedule .sslot .who small{display:block;color:#806c77;font-size:12px}
 #schedule .chip{font-size:11px;border-radius:20px;padding:3px 9px;font-weight:normal}
 #schedule .chip.pending{background:#fff1d6;color:#8a5a00}#schedule .chip.confirmed{background:#e3f3ea;color:#1e5a41}#schedule .chip.completed{background:#ece7ea;color:#5d4d55}#schedule .chip.free{background:#f3ece9;color:#806c77}
 #schedule .sslot.past{opacity:.55}
 #schedule .sslot .acts{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px}
 #schedule .sslot .acts button{padding:6px 10px;font-size:12px;border-radius:7px}
 #schedule .addform{display:grid;gap:6px;margin-top:8px}#schedule .addform input,#schedule .addform select{margin:0;padding:8px;font-size:13px}
 </style>
 <h2>Your schedule</h2>
 <p>Every booking in one place, slot by slot. Website requests arrive as <b>pending</b>; confirm them after you have messaged the client. Add bookings that come in by WhatsApp, Instagram, phone or walk-in so the website shows those times as taken.</p>
 <div class="sched-bar"><div class="toolbar"><button class="secondary" data-sweek="-1">← Previous week</button><button class="secondary" data-sweek="0">This week</button><button class="secondary" data-sweek="1">Next week →</button></div><strong id="sched-range"></strong></div>
 <p id="sched-status" class="status" role="status"></p><div id="sched-grid" class="sched-grid"></div>`;
 document.querySelector('#dashboard').append(panel);
 const ids=['appointments','schedule','treatments','content','analytics','team'];
 document.querySelectorAll('[data-tab]').forEach(b=>{const prev=b.onclick;b.onclick=e=>{document.querySelectorAll('[data-tab]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));ids.forEach(id=>{const el=document.getElementById(id);if(el)el.hidden=b.dataset.tab!==id});if(prev&&b.dataset.tab!=='schedule')prev.call(b,e);if(b===tab)load()}});

 const $=s=>panel.querySelector(s),status=t=>$('#sched-status').textContent=t;
 const today=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const nowMins=()=>{const [h,m]=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':');return +h*60+ +m};
 const addDays=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const dow=s=>new Date(s+'T12:00:00Z').getUTCDay(),toMin=t=>+t.slice(0,2)*60+ +t.slice(3,5);
 const label=t=>{let h=+t.slice(0,2);const ap=h>=12?'PM':'AM';h=h%12||12;return String(h).padStart(2,'0')+':'+t.slice(3,5)+' '+ap};
 const nice=d=>new Date(d+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'});
 let week=0,cfg={},rows=[],active=[];

 async function rpc(name,body){const r=await fetch(API+'/rest/v1/rpc/'+name,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+await token(),'Content-Type':'application/json'},body:JSON.stringify(body),signal:AbortSignal.timeout(15000)});const data=await r.json().catch(()=>null);if(!r.ok)throw Error(/one_booking_per_slot/.test(data?.message||'')?'That slot is already booked.':(data?.message||'Could not save the booking.'));return data}
 async function load(){status('Loading schedule…');
  const t=today(),from=addDays(t,-((dow(t)+6)%7)+7*week),to=addDays(from,6);
  $('#sched-range').textContent=nice(from)+' – '+nice(to);
  try{const [content,list,svc]=await Promise.all([db('bloom_site_content?id=eq.published&select=data'),db(`bloom_appointment_requests?select=id,customer_name,phone,email,service_name,preferred_date,preferred_time,status,source,note&preferred_date=gte.${from}&preferred_date=lte.${to}&status=in.(pending,confirmed,completed)&order=preferred_time`),db('bloom_services?select=name&active=eq.true&order=sort_order')]);
   cfg=content[0]?.data||{};rows=list;active=svc.map(s=>s.name);render(from);status(rows.length?rows.length+' booking'+(rows.length===1?'':'s')+' this week.':'No bookings this week yet.')}catch(err){status(err.message)}}
 function render(from){const grid=$('#sched-grid');grid.replaceChildren();
  const hours=Array.isArray(cfg.hours)?cfg.hours:[],slots=String(cfg.slot_times||DEFAULT_SLOTS).split(',').map(s=>s.trim()).filter(s=>/^\d{2}:\d{2}$/.test(s));
  for(let i=0;i<7;i++){const date=addDays(from,i),h=hours.find(x=>x.day===dow(date)),closed=h?h.closed:dow(date)===0;
   const dayRows=rows.filter(r=>r.preferred_date===date);if(closed&&!dayRows.length)continue;
   const times=[...new Set([...(closed?[]:slots),...dayRows.map(r=>r.preferred_time.slice(0,5))])].sort();
   const card=document.createElement('div');card.className='sday';const booked=dayRows.filter(r=>r.status!=='completed').length;
   card.innerHTML=`<h3>${DAYS[dow(date)]} <small>${nice(date)} · ${booked}/${slots.length} booked</small></h3>`;
   for(const t of times){const r=dayRows.find(x=>x.preferred_time.slice(0,5)===t),past=date<today()||(date===today()&&toMin(t)<=nowMins());
    const el=document.createElement('div');el.className='sslot'+(past&&!r?' past':'');
    if(r){el.innerHTML=`<div class="t">${label(t)} <span class="chip ${esc(r.status)}">${esc(r.status)}</span></div><div class="who">${esc(r.customer_name)}<small>${esc(r.service_name)} · <a href="tel:${esc(r.phone)}">${esc(r.phone)}</a>${r.source==='studio'?' · added in studio':' · website'}${r.note?'<br>'+esc(r.note):''}</small></div><div class="acts">${r.status==='pending'?`<button data-set="confirmed" data-id="${esc(r.id)}">Confirm</button>`:''}${r.status!=='completed'?`<button class="secondary" data-set="completed" data-id="${esc(r.id)}">Mark done</button>`:''}<button class="secondary" data-set="cancelled" data-id="${esc(r.id)}">Cancel</button><button class="secondary danger" data-del="${esc(r.id)}">Delete</button></div>`}
    else{el.innerHTML=`<div class="t">${label(t)} <span class="chip free">${past?'passed':'free'}</span></div>`+(past?'':`<div class="acts"><button class="secondary" data-add="${date}|${t}">+ Add booking</button></div>`)}
    card.append(el)}
   grid.append(card)}}
 panel.addEventListener('click',async e=>{
  const w=e.target.closest('[data-sweek]');if(w){week=+w.dataset.sweek===0?0:week+ +w.dataset.sweek;return load()}
  const del=e.target.closest('[data-del]');if(del){if(del.dataset.confirm!=='1'){del.dataset.confirm='1';del.textContent='Tap again to delete';return}del.disabled=true;try{await rpc('bloom_admin_delete_booking',{p_id:del.dataset.del});await load();status('Booking deleted. That time is free again on the website.')}catch(err){status(err.message);del.disabled=false}return}
  const set=e.target.closest('[data-set]');if(set){if(set.dataset.set==='cancelled'&&set.dataset.confirm!=='1'){set.dataset.confirm='1';set.textContent='Tap again to cancel';return}
   set.disabled=true;try{const r=await db('bloom_appointment_requests?id=eq.'+encodeURIComponent(set.dataset.id),{method:'PATCH',body:JSON.stringify({status:set.dataset.set})});if(!r.length)throw Error('Nothing was updated.');await load();status('Saved. No message was sent automatically.')}catch(err){status(err.message);set.disabled=false}return}
  const add=e.target.closest('[data-add]');if(add){const [date,t]=add.dataset.add.split('|');const box=add.closest('.sslot');if(box.querySelector('form'))return;
   const f=document.createElement('form');f.className='addform';f.innerHTML=`<input name="name" required maxlength="120" placeholder="Client name"><input name="phone" required placeholder="Phone, e.g. +260 97 123 4567" pattern="[+0-9() .-]{7,25}"><select name="service">${active.map(n=>`<option>${esc(n)}</option>`).join('')}</select><input name="note" maxlength="300" placeholder="Note (e.g. Booked on WhatsApp)"><div class="acts"><button>Save booking</button><button type="button" class="secondary" data-close>Close</button></div>`;
   box.append(f);f.querySelector('input').focus();
   f.querySelector('[data-close]').onclick=()=>f.remove();
   f.onsubmit=async ev=>{ev.preventDefault();const d=new FormData(f),b=ev.submitter;b.disabled=true;try{await rpc('bloom_admin_add_booking',{p_date:date,p_time:t,p_service:d.get('service'),p_name:d.get('name'),p_phone:d.get('phone'),p_note:d.get('note')});await load();status('Booking added. That time now shows as taken on the website.')}catch(err){status(err.message);b.disabled=false}}}
 });
})();
