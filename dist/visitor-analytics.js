(()=>{
 if(new URLSearchParams(location.search).has('preview'))return;
 let choice=null,sid=null,timer=null;
 try{choice=localStorage.getItem('bloom-analytics-choice');sid=sessionStorage.getItem('bloom-visitor');if(!sid){sid=crypto.randomUUID();sessionStorage.setItem('bloom-visitor',sid)}}catch{return}
 const allowed=()=>choice==='allow'&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl;
 window.bloomTrack=(kind,treatment)=>{if(!allowed()||document.hidden)return;fetch('/api/track',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session:sid,kind,treatment,consent:true}),keepalive:true}).catch(()=>{})};
 const start=()=>{if(!allowed())return;window.bloomTrack('visit');clearInterval(timer);timer=setInterval(()=>window.bloomTrack('heartbeat'),60000)};
 const box=document.createElement('aside');box.setAttribute('aria-label','Visitor statistics preference');box.style='position:fixed;bottom:16px;left:16px;right:16px;max-width:550px;padding:20px;border:1px solid #d9bdc8;background:#fffaf7;color:#34212c;border-radius:16px;z-index:1000;box-shadow:0 8px 40px #34212c22';
 box.innerHTML='<p style="margin-top:0">May we collect anonymous visit activity and approximate city/country to improve the studio website? Your booking works either way. <a href="/privacy.html">Privacy details</a></p><button type="button" class="btn" data-choice="allow">Allow statistics</button> <button type="button" class="btn" data-choice="deny">No thanks</button>';
 box.onclick=e=>{const v=e.target.dataset.choice;if(!v)return;choice=v;try{localStorage.setItem('bloom-analytics-choice',v)}catch{}box.remove();clearInterval(timer);if(v==='allow')start()};
 const preferences=document.createElement('button');preferences.textContent='Visitor statistics preferences';preferences.type='button';preferences.style='background:none;border:0;text-decoration:underline;color:inherit;cursor:pointer;padding:12px';preferences.onclick=()=>document.body.append(box);document.querySelector('footer')?.append(preferences);
 if(!choice&&navigator.doNotTrack!=='1'&&!navigator.globalPrivacyControl)document.body.append(box);start();
 document.querySelector('#booking')?.addEventListener('submit',()=>{if(document.querySelector('#booking').checkValidity())window.bloomTrack('booking_preview')});
 document.querySelector('#service')?.addEventListener('change',e=>window.bloomTrack('treatment',e.target.selectedOptions[0]?.textContent.split(' — ')[0]));
 document.addEventListener('click',e=>{const a=e.target.closest('a');if(a?.href.startsWith('https://wa.me/'))window.bloomTrack('whatsapp')});
})();
