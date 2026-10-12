// Keep CSS-driven motion in its own transparent SVG surface. Static shelves
// can then retain their painted pixels while fish, mice and pendulums move.
const NS='http://www.w3.org/2000/svg';
const MOTION='.running-mouse,.flying-book-motion,.twinkle,.swimming-fish,.fish-tail,.clock-pendulum,.falling-leaf,.rocking-horse';
const make=()=>document.createElementNS(NS,'g');

function intersects(box,state,margin=0){
 const left=state.x-state.w/(2*state.s)-margin,top=state.y-state.h/(2*state.s)-margin;
 return box.x+box.w>left&&box.y+box.h>top&&box.x<left+state.w/state.s+2*margin&&box.y<top+state.h/state.s+2*margin;
}

export function createScene(svg){
 const camera=svg.querySelector('#camera');
 const motionSvg=document.createElementNS(NS,'svg');
 motionSvg.id='motion-world';motionSvg.setAttribute('xmlns',NS);
 motionSvg.setAttribute('aria-label','The library’s little moving inhabitants');
 motionSvg.setAttribute('preserveAspectRatio','xMidYMid slice');
 const motionCamera=make();motionCamera.id='motion-camera';motionSvg.append(motionCamera);
 svg.after(motionSvg);

 function setCamera(state){
  const transform=`translate(${state.w/2} ${state.h/2}) scale(${state.s}) translate(${-state.x} ${-state.y})`;
  camera.setAttribute('transform',transform);motionCamera.setAttribute('transform',transform);
 }
 function resize(state){motionSvg.setAttribute('viewBox',`0 0 ${state.w} ${state.h}`);}

 function restore(record){
  for(const room of record.rooms||[])room.slot.replaceWith(room.el);
  for(const item of record.items||[])item.anchor.replaceWith(item.el);
  for(const entry of record.motionEntries||[]){
   for(const [el,value] of entry.clipAttributes||[])el.setAttribute('clip-path',value);
   entry.el.classList.remove('motion-still');entry.placeholder.replaceWith(entry.el);
  }
  record.motionEl?.remove();record.motionEntries=[];record.rooms=[];record.items=[];
 }

 function prepare(record){
  const roots=new Set();
  for(const node of record.el.querySelectorAll(MOTION)){
   // A portal's previous drawing can remain briefly for a detail dissolve. It
   // stays frozen in place and must not join the new scene's moving inhabitants.
   if(node.closest('.detail-outgoing'))continue;
   const flight=node.closest('.floating-book');
   if(flight){roots.add(flight);continue;}
   // Keep a clock's trim in front of its pendulum on the same small surface.
   const clock=node.closest('.motif-mantelclock,.motif-cuckooclock');
   if(clock){roots.add(clock);continue;}
   let parent=node.parentElement,insideMotion=false;
   while(parent&&parent!==record.el){if(parent.matches(MOTION)){insideMotion=true;break;}parent=parent.parentElement;}
   if(!insideMotion)roots.add(node);
  }
  const inverse=camera.getCTM()?.inverse();
  // Read every geometry before moving any node to avoid alternating DOM writes
  // and layout reads. Bounds are stored in world coordinates, independent of zoom.
  const bounds=el=>{
   const b=el.getBBox(),m=inverse?.multiply(el.getCTM()),point=(x,y)=>m?{x:m.a*x+m.c*y+m.e,y:m.b*x+m.d*y+m.f}:{x,y};
   const corners=[point(b.x,b.y),point(b.x+b.width,b.y),point(b.x,b.y+b.height),point(b.x+b.width,b.y+b.height)];
   const xs=corners.map(p=>p.x),ys=corners.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys),w=Math.max(...xs)-x,h=Math.max(...ys)-y;
   return{x,y,w,h};
  };
  const geometry=[...roots].map(el=>{
   const b=bounds(el),size=Math.max(b.w,b.h),flight=el.matches('.floating-book'),pad=el.matches('.falling-leaf')?120:el.matches('.running-mouse')?Math.max(70,b.w):15;
   return{el,size,box:flight?{x:record.tx*1080,y:record.ty*1120,w:1080,h:1120}:{x:b.x-pad,y:b.y-pad,w:b.w+2*pad,h:b.h+2*pad}};
  });
  const items=[...record.el.querySelectorAll('.book')].filter(el=>!el.closest('.detail-outgoing')).map(el=>({el,box:bounds(el),visible:true}));
  record.motionEl=make();record.motionEntries=[];record.rooms=[];record.items=[];
  const motionDefs=document.createElementNS(NS,'defs');record.motionEl.append(motionDefs);
  const clipCopies=new Map();
  function motionClip(value){
   const match=/^url\(#([^)]*)\)$/.exec(value||'');if(!match)return value;
   const id=match[1];if(clipCopies.has(id))return `url(#${clipCopies.get(id)})`;
   const original=document.getElementById(id);if(!original)return value;
   const copy=original.cloneNode(true),key=`motion-${record.seed}-${record.tx}-${record.ty}-${id}`;
   copy.id=key;motionDefs.append(copy);clipCopies.set(id,key);return `url(#${key})`;
  }
  const parents=new Map([[record.el,record.motionEl]]);
  function motionParent(parent){
   if(parents.has(parent))return parents.get(parent);
   const copy=parent.cloneNode(false);copy.removeAttribute('id');
   copy.classList.remove('detail-incoming','detail-outgoing');
   if(copy.hasAttribute('clip-path'))copy.setAttribute('clip-path',motionClip(copy.getAttribute('clip-path')));
   motionParent(parent.parentElement).append(copy);parents.set(parent,copy);return copy;
  }
  for(const entry of geometry){
   const holder=make(),placeholder=make();
   motionParent(entry.el.parentElement).append(holder);
   entry.clipAttributes=[];
   for(const el of [entry.el,...entry.el.querySelectorAll('[clip-path]')])if(el.hasAttribute('clip-path')){
    const value=el.getAttribute('clip-path'),match=/^url\(#([^)]*)\)$/.exec(value),definition=match&&document.getElementById(match[1]);
    if(definition&&!entry.el.contains(definition)){entry.clipAttributes.push([el,value]);el.setAttribute('clip-path',motionClip(value));}
   }
   entry.el.replaceWith(placeholder);holder.append(entry.el);
   Object.assign(entry,{holder,placeholder,active:true});record.motionEntries.push(entry);
  }
  for(const item of items){
   item.anchor=document.createComment('book');item.el.after(item.anchor);record.items.push(item);
  }
  const tile=record.el.querySelector('.shelf-tile');
  if(tile)for(const el of [...tile.children])if(el.matches('.shelf-room[data-room-bounds]')){
   const [x,y,w,h]=el.dataset.roomBounds.split(',').map(Number),slot=make();
   slot.classList.add('room-slot');el.replaceWith(slot);slot.append(el);
   record.rooms.push({el,slot,box:{x:record.tx*1080+x,y:record.ty*1120+y,w,h},visible:true});
  }
  motionCamera.append(record.motionEl);
 }

 function sync(record,state){
  for(const room of record.rooms||[]){
   const visible=intersects(room.box,state,12/state.s);
   if(visible===room.visible)continue;
   room.visible=visible;if(visible)room.slot.append(room.el);else room.el.remove();
  }
  for(const item of record.items||[]){
   const visible=intersects(item.box,state,8/state.s)&&Math.min(item.box.w,item.box.h)*state.s>=.6;
   if(visible===item.visible)continue;
   item.visible=visible;if(visible)item.anchor.before(item.el);else item.el.remove();
  }
  for(const entry of record.motionEntries||[]){
   const active=entry.placeholder.isConnected&&entry.size*state.s>=6&&intersects(entry.box,state);
   if(active===entry.active)continue;
   entry.active=active;entry.el.classList.toggle('motion-still',!active);
   // Small inhabitants keep a still vector pose in the static shelf. Completely
   // offscreen rooms hold that pose detached, ready for a cheap return journey.
   (active?entry.holder:entry.placeholder).append(entry.el);
  }
 }
 function attach(record,state){
  camera.append(record.el);
  if(!record.motionEl)prepare(record);else motionCamera.append(record.motionEl);
  sync(record,state);
 }
 function detach(record){record.el.remove();record.motionEl?.remove();}
 function refresh(record,state){restore(record);prepare(record);sync(record,state);}
 function exportLayers(copy,selector=MOTION){
  const target=copy.querySelector('#camera');
  for(const record of motionCamera.children)target.append(record.cloneNode(true));
  return [...svg.querySelectorAll(selector),...motionSvg.querySelectorAll(selector)];
 }
 return{motionSvg,motionCamera,setCamera,resize,attach,detach,restore,refresh,sync,exportLayers};
}
