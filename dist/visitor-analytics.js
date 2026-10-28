(()=>{
 if(new URLSearchParams(location.search).has('preview'))return;
 let choice=null,sid=null,timer=null;
 try{choice=localStorage.getItem('bloom-analytics-choice');sid=sessionStorage.getItem('bloom-visitor');if(!sid){sid=crypto.randomUUID();sessionStorage.setItem('bloom-visitor',sid)}}catch{return}
 const allowed=()=>choice==='allow'&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl;
 window.bloomTrack=(kind,treatment)=>{if(!allowed()||document.hidden)return;fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:sid,kind,treatment,consent:true}),keepalive:true}).catch(()=>{})};
 const start=()=>{if(!allowed())return;window.bloomTrack('visit');clearInterval(timer);timer=setInterval(()=>window.bloomTrack('heartbeat'),60000)};
 const box=document.createElement('aside');box.setAttribute('aria-label','Visitor statistics preference');box.style='position:fixed;bottom:16px;left:16px;right:16px;max-width:440px;padding:14px 16px;border:1px solid #e6d3da;background:#fffaf7;color:#34212c;border-radius:14px;z-index:1000;box-shadow:0 8px 30px #34212c1f;font-size:12px';
 box.innerHTML='<p style="margin:0 0 10px;font-size:12px;line-height:1.55">Can we count anonymous visits to improve this site? Booking works either way. <a href="/privacy.html" style="text-decoration:underline">Details</a></p><div style="display:flex;gap:8px"><button type="button" class="btn" style="padding:9px 16px" data-choice="allow">Allow</button><button type="button" class="btn" style="padding:9px 16px;background:#fff;color:#723a50;border:1px solid #dfcdd2" data-choice="deny">No thanks</button></div>';
 box.onclick=e=>{const v=e.target.dataset.choice;if(!v)return;choice=v;try{localStorage.setItem('bloom-analytics-choice',v)}catch{}box.remove();clearInterval(timer);if(v==='allow')start()};
 const preferences=document.createElement('button');preferences.textContent='Statistics preferences';preferences.type='button';preferences.style='background:none;border:0;color:inherit;cursor:pointer;padding:0;font-size:10px;text-decoration:underline';preferences.onclick=()=>document.body.append(box);(document.querySelector('.footer-bottom>span:first-child')||document.querySelector('footer'))?.append(document.createTextNode(' · '),preferences);
 if(!choice&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl)document.body.append(box);start();
 document.querySelector('#booking')?.addEventListener('submit',()=>{if(document.querySelector('#booking').checkValidity())window.bloomTrack('booking_preview')});
 document.querySelector('#service')?.addEventListener('change',e=>window.bloomTrack('treatment',e.target.selectedOptions[0]?.textContent.split(' — ')[0]));
 document.addEventListener('click',e=>{const a=e.target.closest('a');if(a?.href.startsWith('https://wa.me/'))window.bloomTrack('whatsapp')});
})();
