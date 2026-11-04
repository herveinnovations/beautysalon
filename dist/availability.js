// "Available appointments" board + fixed booking slots (one client per slot).
(()=>{
 const TZ='Africa/Lusaka',DEFAULT_SLOTS='09:00, 10:30, 12:00, 13:30, 15:00';
 const $=s=>document.querySelector(s);
 const todayStr=()=>new Intl.DateTimeFormat('en-CA',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
 const nowMins=()=>{const [h,m]=new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date()).split(':');return +h*60+ +m};
 const addDays=(s,n)=>{const d=new Date(s+'T12:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)};
 const dow=s=>new Date(s+'T12:00:00Z').getUTCDay();
 const toMin=t=>+t.slice(0,2)*60+ +t.slice(3,5);
 const label=t=>{let h=+t.slice(0,2);const ap=h>=12?'PM':'AM';h=h%12||12;return String(h).padStart(2,'0')+':'+t.slice(3,5)+' '+ap};
 const DAYS=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
 let taken=new Set(),week=0,settings={},hours=[],chosen=null;

 function slotList(){return String(settings.slot_times||DEFAULT_SLOTS).split(',').map(s=>s.trim()).filter(s=>/^\d{2}:\d{2}$/.test(s)).sort()}
 function dayHours(date){return hours.find(h=>h.day===dow(date))}
 function slotsFor(date){const h=dayHours(date);if(!h||h.closed||settings.booking_enabled===false)return[];return slotList().filter(t=>toMin(t)>=toMin(h.open)&&toMin(t)<toMin(h.close))}
 function state(date,t){const today=todayStr();if(date<today||(date===today&&toMin(t)<=nowMins()))return'past';return taken.has(date+' '+t)?'taken':'free'}
 function weekStart(){const t=todayStr();const back=(dow(t)+6)%7;return addDays(t,-back+7*week)}

 async function loadTaken(){
  const from=weekStart(),to=addDays(from,13);
  try{const r=await fetch(supabaseUrl+'/rest/v1/rpc/bloom_taken_slots',{method:'POST',headers:{apikey:supabasePublishableKey,'Content-Type':'application/json'},body:JSON.stringify({p_from:from,p_to:to}),signal:AbortSignal.timeout(10000)});
   if(r.ok)taken=new Set((await r.json()).map(x=>x.slot_date+' '+String(x.slot_time).slice(0,5)))}catch{}
 }

 function render(){
  const board=$('#slot-board');if(!board)return;board.replaceChildren();
  const start=weekStart();
  for(let i=0;i<7;i++){const date=addDays(start,i),h=dayHours(date);if(!h||h.closed)continue;
   const slots=slotsFor(date),card=document.createElement('article'),head=document.createElement('div');
   card.className='day-card';head.className='day-head';
   head.innerHTML=`<b>${DAYS[dow(date)]}</b><span>${new Date(date+'T12:00:00Z').toLocaleDateString('en-GB',{day:'numeric',month:'short',timeZone:'UTC'})}</span>`;
   card.append(head);const list=document.createElement('div');list.className='day-slots';
   let free=0;
   for(const t of slots){const st=state(date,t),b=document.createElement('button');b.type='button';b.className='slot '+st;b.textContent=label(t);
    if(st==='free'){free++;b.setAttribute('aria-label',`Book ${DAYS[dow(date)]} ${label(t)}`);b.onclick=()=>pick(date,t)}else{b.disabled=true;b.setAttribute('aria-label',`${label(t)} ${st==='taken'?'booked':'unavailable'}`)}
    if(chosen===date+' '+t)b.classList.add('selected');list.append(b)}
   card.append(list);if(!free){card.classList.add('crossed');card.setAttribute('aria-label',DAYS[dow(date)]+': no slots available')}
   board.append(card)}
  document.querySelectorAll('[data-week]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.week===week)));
 }

 function pick(date,t){chosen=date+' '+t;$('#date').value=date;times();$('#time').value=t;render();
  $('#booking').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'auto':'smooth'});
  const f=$('#booking');f.classList.remove('flash');void f.offsetWidth;f.classList.add('flash')}

 // Shows which treatment the customer chose from the menu, above the board.
 function showPicked(){const s=services[$('#service').value],el=$('#avail-picked');if(!s||!el)return;el.replaceChildren();const b=document.createElement('b');b.textContent=s.name;el.append('Booking ',b,' · '+money(s.price)+'. Now pick a free time below.');el.hidden=false}
 window.bloomShowPicked=showPicked;
 // Booking form: only the studio's fixed start times; taken or past ones are disabled.
 function fixedTimes(){const date=$('#date').value,sel=$('#time'),old=sel.value;sel.replaceChildren();
  if(!date){sel.add(new Option('Choose a date first',''));sel.options[0].disabled=true;return}
  const dur=parseInt(services[$('#service').value]?.time||60),h=dayHours(date);
  const list=slotsFor(date).filter(t=>!h||toMin(t)+dur<=toMin(h.close));let free=0;
  for(const t of list){const st=state(date,t),o=new Option(label(t)+(st==='taken'?' · booked':st==='past'?' · passed':''),t);o.disabled=st!=='free';if(!o.disabled)free++;sel.add(o)}
  if(!free){sel.replaceChildren(new Option('No free times this day, please pick another',''));sel.options[0].disabled=true;sel.value=''}
  else if([...sel.options].some(o=>o.value===old&&!o.disabled))sel.value=old;else sel.value=[...sel.options].find(o=>!o.disabled).value}

 async function start(){settings=window.bloomSettings||{};hours=window.bloomHours||[];window.times=times=fixedTimes;
  document.querySelectorAll('[data-week]').forEach(b=>b.onclick=async()=>{week=+b.dataset.week;render();await loadTaken();render()});
  $('#date').addEventListener('change',()=>{chosen=null;render()});$('#time').addEventListener('change',()=>{chosen=$('#date').value+' '+$('#time').value;render()});
  $('#confirmation')?.addEventListener('close',async()=>{chosen=null;await loadTaken();render();fixedTimes()});
  window.addEventListener('bloom:slots-changed',async()=>{await loadTaken();render();fixedTimes()});
  $('#service').addEventListener('change',()=>{if(!$('#avail-picked').hidden)showPicked();chosen=null;render()});
  render();await loadTaken();render();fixedTimes()}
 if(window.bloomHours)start();else window.addEventListener('bloom:ready',start,{once:true});
})();
