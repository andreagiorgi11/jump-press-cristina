// Mouse/pen dragging; touch keeps the browser's native scrolling and pinch gestures.
export function attachPdfPan(area){
 let drag=null;
 const end=event=>{
  if(!drag||(event&&event.pointerId!==drag.id))return;
  const id=drag.id;drag=null;area.classList.remove('is-panning');
  if(area.hasPointerCapture(id))area.releasePointerCapture(id);
 };
 const down=event=>{
  if(event.pointerType==='touch'||event.button!==0||!event.isPrimary||!area.classList.contains('pdf-pan-enabled'))return;
  if(event.target!==area&&!event.target.closest('canvas'))return;
  if(area.scrollWidth<=area.clientWidth&&area.scrollHeight<=area.clientHeight)return;
  drag={id:event.pointerId,x:event.clientX,y:event.clientY,left:area.scrollLeft,top:area.scrollTop};
  area.setPointerCapture(event.pointerId);area.classList.add('is-panning');event.preventDefault();
 };
 const move=event=>{
  if(!drag||event.pointerId!==drag.id)return;
  area.scrollLeft=drag.left+drag.x-event.clientX;
  area.scrollTop=drag.top+drag.y-event.clientY;event.preventDefault();
 };
 area.addEventListener('pointerdown',down);area.addEventListener('pointermove',move);
 for(const type of ['pointerup','pointercancel','lostpointercapture'])area.addEventListener(type,end);
 return()=>{end();area.removeEventListener('pointerdown',down);area.removeEventListener('pointermove',move);for(const type of ['pointerup','pointercancel','lostpointercapture'])area.removeEventListener(type,end);};
}
