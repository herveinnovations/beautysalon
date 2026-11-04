// Photo position picker: tap/drag on the full photo to choose what stays in view.
// The live preview uses the same shape as the photo's place on the website.
(()=>{
 const SHAPES={circle:{ratio:'1/1',radius:'50%',label:'Main photo (circle)'},
  arch:{ratio:'13/10',radius:'90px 90px 8px 8px',label:'Studio photo'},
  wide:{ratio:'26/10',radius:'8px',label:'Booking photo'},
  reel:{ratio:'9/16',radius:'70px 70px 10px 10px',label:'Gallery reel'},
  card:{ratio:'3/2',radius:'8px',label:'Treatment card'}};
 const css=`.focus-pick{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:14px;align-items:start;background:#fff;border:1px solid #e4d4dc;border-radius:12px;padding:12px;margin:8px 0 18px}
 .focus-pick .fp-wrap{text-align:center;background:#f5e8e5;border-radius:8px;padding:6px}
 .focus-pick .fp-full{position:relative;display:inline-block;cursor:crosshair;touch-action:none;user-select:none;line-height:0;max-width:100%}
 .focus-pick .fp-full img{display:block;max-width:100% !important;max-height:260px !important;width:auto !important;height:auto !important;margin:0 !important;pointer-events:none;border-radius:4px}
 .focus-pick .fp-dot{position:absolute;width:26px;height:26px;margin:-13px 0 0 -13px;border-radius:50%;border:3px solid #fff;background:#723a50cc;box-shadow:0 0 0 2px #723a50,0 2px 8px #0005;pointer-events:none}
 .focus-pick .fp-prev{width:100%;max-width:260px;margin:0 auto;overflow:hidden;background:#f5e8e5}
 .focus-pick .fp-prev img{width:100% !important;height:100% !important;max-width:none !important;max-height:none !important;margin:0 !important;object-fit:cover;display:block}
 .focus-pick small{display:block;color:#806c77;font-size:12px;line-height:1.5;margin-top:6px}
 .focus-pick .fp-row{display:flex;gap:8px;flex-wrap:wrap;margin-top:8px}
 .focus-pick .fp-row button{padding:6px 10px;font-size:12px}
 @media(max-width:650px){.focus-pick{grid-template-columns:1fr}}`;
 const st=document.createElement('style');st.textContent=css;document.head.append(st);
 const valid=v=>/^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/.test(v||'');
 window.bloomFocus={valid,
  picker({src,value,shape='card',onChange}){
   const s=SHAPES[shape]||SHAPES.card;let [x,y]=(valid(value)?value:'50% 50%').split(' ').map(parseFloat);
   const el=document.createElement('div');el.className='focus-pick';
   el.innerHTML=`<div><div class="fp-wrap"><div class="fp-full" title="Tap or drag to choose what stays in view"><img alt=""><span class="fp-dot"></span></div></div><small>Tap or drag on the photo to choose the part that must stay in view.</small></div><div><div class="fp-prev" style="aspect-ratio:${s.ratio};border-radius:${s.radius}"><img alt=""></div><small>Preview: ${s.label} on the website</small><div class="fp-row"><button type="button" class="secondary" data-fp="top">Top</button><button type="button" class="secondary" data-fp="center">Centre</button><button type="button" class="secondary" data-fp="bottom">Bottom</button></div></div>`;
   const full=el.querySelector('.fp-full'),dot=el.querySelector('.fp-dot'),[a,b]=el.querySelectorAll('img');
   const draw=(emit)=>{const v=Math.round(x)+'% '+Math.round(y)+'%';dot.style.left=x+'%';dot.style.top=y+'%';b.style.objectPosition=v;if(emit)onChange?.(v)};
   const setSrc=u=>{a.src=u||'';b.src=u||'';el.hidden=!u};
   const at=e=>{const r=a.getBoundingClientRect();x=Math.min(100,Math.max(0,(e.clientX-r.left)/r.width*100));y=Math.min(100,Math.max(0,(e.clientY-r.top)/r.height*100));draw(true)};
   let drag=false;full.addEventListener('pointerdown',e=>{drag=true;full.setPointerCapture(e.pointerId);at(e)});full.addEventListener('pointermove',e=>{if(drag)at(e)});full.addEventListener('pointerup',()=>drag=false);full.addEventListener('pointercancel',()=>drag=false);
   el.querySelectorAll('[data-fp]').forEach(btn=>btn.onclick=()=>{x=50;y={top:15,center:50,bottom:85}[btn.dataset.fp];draw(true)});
   setSrc(src);draw(false);el.setSrc=setSrc;return el}};
})();
