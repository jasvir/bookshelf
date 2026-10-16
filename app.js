import {W,H,definitions,tileMarkup,previewMarkup,getPortal,getDrawers,findNearestBook,portalSeeds,hash,esc} from './art.js';
import {BOOKS,DISCOVERIES} from './catalog.js';
import {createScene} from './scene.js';
import {createBookReader} from './book-reader.js';
import {createDetailTransitions} from './detail-transitions.js';
import {createCatalogueSearch} from './catalogue-search.js';
import {createCatalogueJourney} from './catalogue-journey.js';

const $=id=>document.getElementById(id);
const stage=$('stage'), svg=$('world'), NS='http://www.w3.org/2000/svg';
svg.innerHTML=definitions+'<g id="camera"></g>';
svg.setAttribute('role','group');
const drawing=$('camera'), tiles=new Map(), parents=[], portalRegistry=new Set();
const scene=createScene(svg);
const tilePool=new Map(), markupCache=new Map();
// Character budgets bound retained strings; the separate element budget also
// bounds parsed offscreen DOM. A wide viewport can return without cache churn.
const MAX_POOL_BYTES=6_000_000, MAX_MARKUP_BYTES=6_000_000;
const MAX_POOL_NODES=60_000, MAX_POOL_ENTRIES=18;
let poolBytes=0, poolNodes=0, markupBytes=0, buildFrame=0, buildQueue=[], desiredTiles=new Map(), sceneRevision=0;
let stageRect, currentQuality='distant', labelScale=0, lastInput=-Infinity, settleTimer=0;
const HOME_ZOOM=.4;
const state={x:W*.5,y:H*.5,s:1,seed:17,depth:0,w:0,h:0,base:1,zoomOffset:0};
let scheduled=false, animation=0, flightCompletion=null, pointerGesture=null, dragged=false, toastTimer, downTarget=null;
const pointers=new Map(), reduced=matchMedia('(prefers-reduced-motion: reduce)');
const DETAIL_FADE_MS=180,MAX_DETAIL_TRANSITIONS=2,MAX_DETAIL_NODES=12_000;
let skipFadesUntil=0;
const detailTransitions=createDetailTransitions({
 duration:DETAIL_FADE_MS,maxTransitions:MAX_DETAIL_TRANSITIONS,maxNodes:MAX_DETAIL_NODES,
 enabled:()=>!reduced.matches&&!document.hidden&&performance.now()>=skipFadesUntil,
 onFinish:()=>{if(!document.hidden){requestDraw();scheduleBuild();}}
});
let found=new Set();
try {found=new Set(JSON.parse(localStorage.getItem('unfinished-library-finds')||'[]').filter(n=>Number.isInteger(n)&&DISCOVERIES[n]));}catch{}
let paused=reduced.matches;
const reader=createBookReader({
 onOpen:()=>{clearTimeout(toastTimer);$('book-toast').hidden=true;document.body.classList.add('is-reading');},
 onClose:()=>{document.body.classList.remove('is-reading');stage.focus({preventScroll:true});},
 announce
});
const catalogueJourney=createCatalogueJourney({
 getView:()=>({...state}),getDrawers,findNearestBook,flyTo,cancelFlight,requestDraw,announce,drawing,stage,button:$('search-btn'),
 onFound:book=>{const item=BOOKS[book.bookId];if(item){toast(item.title,`A little twist on ${item.original} · ${item.author}`,item.blurb);announce(`Found ${item.title}. The nearest copy is outlined in gold.`);}}
});
const catalogue=createCatalogueSearch({
 books:BOOKS,announce,
 onApproach:()=>{reader.close(true);reader.cancelOffer();clearTimeout(toastTimer);$('book-toast').hidden=true;detailTransitions.finishAll();return catalogueJourney.approach();},
 onChoose:id=>catalogueJourney.choose(id),onCancel:()=>catalogueJourney.cancel()
});
function interruptCatalogue(){
 if(catalogue.isOpen){void catalogue.close({reason:'navigation',restoreFocus:false});catalogueJourney.reset();}
 else catalogueJourney.interrupt();
}
function resetCatalogue(){void catalogue.close({reason:'navigation',restoreFocus:false});catalogueJourney.reset();}

const QUALITY_LEVELS=['overview','distant','compact','full'], QUALITY_BOUNDS=[.12,.48,.95];
const labelBucket=scale=>2**(Math.floor(Math.log2(scale)*2)/2);
function chooseLabelScale(scale,current,allowUpgrade=true){
 if(!current||scale<current*.90)return labelBucket(scale);
 if(allowUpgrade&&scale>current*Math.SQRT2*1.10)return labelBucket(scale);
 return current;
}
const nominalQuality=scale=>QUALITY_LEVELS[QUALITY_BOUNDS.filter(b=>scale>b).length];
function navigating(){return animation!==0||pointers.size>0||performance.now()-lastInput<160;}
function touchNavigation(){
 const now=performance.now();
 detailTransitions.finishAll();
 if(now-lastInput<70)skipFadesUntil=now+120;
 lastInput=now;clearTimeout(settleTimer);
 settleTimer=setTimeout(()=>{settleTimer=0;requestDraw();},180);
}
function chooseQuality(scale,current,allowUpgrade=true){
 let index=QUALITY_LEVELS.indexOf(current);if(index<0)index=0;
 while(index>0&&scale<QUALITY_BOUNDS[index-1]*.88)index--;
 while(allowUpgrade&&index<QUALITY_BOUNDS.length&&scale>QUALITY_BOUNDS[index]*1.12)index++;
 return QUALITY_LEVELS[index];
}

function announce(text) {$('status').textContent=text;}
function toast(title,subtitle='',body='') {
 reader.cancelOffer();
 $('book-toast').innerHTML=`<strong>${esc(title)}</strong>${body?`<span style="display:block;font-size:12px;margin-top:5px">${esc(body)}</span>`:''}${subtitle?`<small>${esc(subtitle)}</small>`:''}`;
 $('book-toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('book-toast').hidden=true,6500);
}
function bookNote(id,source) {const b=BOOKS[id];if(!b)return;toast(b.title,`A little twist on ${b.original} · ${b.author}`,b.blurb);void reader.offer(b,source);}
function pauseToast(){clearTimeout(toastTimer);}
function resumeToast(){clearTimeout(toastTimer);toastTimer=setTimeout(()=>{$('book-toast').hidden=true;reader.cancelOffer();},6500);}
$('book-toast').addEventListener('pointerenter',pauseToast);
$('book-toast').addEventListener('pointerleave',resumeToast);
$('book-toast').addEventListener('focusin',pauseToast);
$('book-toast').addEventListener('focusout',e=>{if(!$('book-toast').contains(e.relatedTarget))resumeToast();});
function discover(id) {
 const d=DISCOVERIES[id];if(!d)return;const fresh=!found.has(id);found.add(id);
 try{localStorage.setItem('unfinished-library-finds',JSON.stringify([...found]));}catch{}
 updateDiscoveryCounter();toast(d.title,fresh?'A new little discovery':'An old friend on another shelf',d.description);
}
function updateDiscoveryCounter() {
 $('found-count').textContent=`${found.size} / ${DISCOVERIES.length}`;
}

function rememberTile(key,record) {
 detailTransitions.finishOwner(record);
 for(const p of record.portals)portalRegistry.delete(p);
 scene.detach(record);tilePool.set(key,record);poolBytes+=record.bytes;poolNodes+=record.nodes;
 while(tilePool.size>MAX_POOL_ENTRIES||poolBytes>MAX_POOL_BYTES||poolNodes>MAX_POOL_NODES){
  const oldest=[...tilePool.keys()].find(key=>!desiredTiles.has(key))??tilePool.keys().next().value,old=tilePool.get(oldest);
  poolBytes-=old.bytes;poolNodes-=old.nodes;tilePool.delete(oldest);
 }
}
function clearTiles() {
 catalogueJourney.reset();
 detailTransitions.finishAll();
 sceneRevision++;desiredTiles.clear();buildQueue=[];
 if(buildFrame)cancelAnimationFrame(buildFrame);buildFrame=0;
 for(const [key,record] of tiles)rememberTile(key,record);
 tiles.clear();portalRegistry.clear();
 currentQuality=nominalQuality(state.s);labelScale=currentQuality==='compact'||currentQuality==='full'?labelBucket(state.s):0;
}
function tileKey(tx,ty,seed,quality,pixelScale=0) {return `${seed}:${tx},${ty}:${quality}:${pixelScale}:${getPortal(tx,ty,seed).seed}`;}
function cachedMarkup(tx,ty,seed,quality,pixelScale=0) {
 const key=tileKey(tx,ty,seed,quality,pixelScale);
 if(markupCache.has(key)){const value=markupCache.get(key);markupCache.delete(key);markupCache.set(key,value);return value;}
 const value=quality==='overview'?previewMarkup(tx,ty,seed):tileMarkup(tx,ty,seed,true,true,quality,pixelScale||Infinity);
 markupCache.set(key,value);markupBytes+=value.length;
 while(markupCache.size>24||markupBytes>MAX_MARKUP_BYTES){const oldest=markupCache.keys().next().value;markupBytes-=markupCache.get(oldest).length;markupCache.delete(oldest);}
 return value;
}
function registerPortal(record,content,seed,rect,unit,depth,parent=null) {
 const p={record,content,seed,...rect,unit,depth,parent,quality:'overview',pixelScale:0,allocatedBytes:Number(content.dataset.initialBytes),allocatedNodes:content.querySelectorAll('*').length,deltaBytes:0,deltaNodes:0};
 record.portals.push(p);portalRegistry.add(p);return p;
}
function removePortalChildren(parent) {
 const removed=new Set([parent]);
 for(const p of parent.record.portals)if(removed.has(p.parent)){removed.add(p);portalRegistry.delete(p);}
 parent.record.portals=parent.record.portals.filter(p=>p===parent||!removed.has(p));
}
function installTile(spec,reserved=null) {
 const {key,tx,ty,seed,quality,pixelScale}=spec;
 let record=reserved||tilePool.get(key);
 if(record){if(!reserved){tilePool.delete(key);poolBytes-=record.bytes;poolNodes-=record.nodes;}for(const p of record.portals)portalRegistry.add(p);}
 else {
  const markup=cachedMarkup(tx,ty,seed,quality,pixelScale),el=document.createElementNS(NS,'g');el.innerHTML=markup;
  record={el,bytes:markup.length,nodes:el.querySelectorAll('*').length,portals:[],quality,tx,ty,seed};
  if(quality!=='overview'){
   const p=getPortal(tx,ty,seed),content=el.querySelector('.portal-content');
   if(content)registerPortal(record,content,p.seed,{x:tx*W+p.x,y:ty*H+p.y,w:p.w,h:p.h},p.k,1);
  }
 }
 let fade=null;
 for(const [oldKey,old] of tiles)if(oldKey!==key&&old.tx===tx&&old.ty===ty&&old.seed===seed){
  detailTransitions.finishOwner(old);
  for(const p of old.portals)portalRegistry.delete(p);
  tiles.delete(oldKey);
  fade=detailTransitions.reserve({outgoing:[old.el,old.motionEl].filter(Boolean),owner:record,onFinish:()=>rememberTile(oldKey,old)});
  if(!fade)rememberTile(oldKey,old);
 }
 tiles.set(key,record);
 try{scene.attach(record,state);catalogueJourney.attach(record.el);catalogueJourney.sync();fade?.start([record.el,record.motionEl].filter(Boolean));}
 catch(error){fade?.finish();throw error;}
}
function waitForDetailSlot(spec){
 if(!detailTransitions.activeCount||reduced.matches||document.hidden||performance.now()<skipFadesUntil)return false;
 const old=[...tiles.values()].find(record=>record.tx===spec.tx&&record.ty===spec.ty&&record.seed===spec.seed);
 return !!old&&!detailTransitions.canStart(old.nodes);
}
function projectedPortalVisible(p) {
 const x=(p.x-state.x)*state.s+state.w/2,y=(p.y-state.y)*state.s+state.h/2;
 return x+p.w*state.s>0&&y+p.h*state.s>0&&x<state.w&&y<state.h;
}
function portalWork() {
 for(const p of portalRegistry){
  if(!p.content.isConnected||p.depth>=3||!projectedPortalVisible(p))continue;
  const width=p.w*state.s,scale=p.unit*state.s;
  let quality=width<130?'overview':width>185?chooseQuality(scale,p.quality,!navigating()):p.quality;
  const pixelScale=quality==='compact'||quality==='full'?chooseLabelScale(scale,p.pixelScale,!navigating()):0;
  if(quality!==p.quality||pixelScale!==p.pixelScale)return {p,quality,pixelScale};
 }
 return null;
}
function updatePortal(p,quality,pixelScale=0) {
 detailTransitions.finishOwner(p.record);
 scene.restore(p.record);
 const descendants=p.record.portals.filter(q=>{let a=q.parent;while(a){if(a===p)return true;a=a.parent;}return false;});
 const descendantBytes=descendants.reduce((sum,q)=>sum+q.deltaBytes,0),descendantNodes=descendants.reduce((sum,q)=>sum+q.deltaNodes,0);
 const retiredBytes=p.allocatedBytes+descendantBytes;
 let ghost=null,incoming=null,motionCopies=[],fade=null,retiredNodes=0;
 if(detailTransitions.canStart()){
  ghost=document.createElementNS(NS,'g');ghost.append(...p.content.children);p.content.append(ghost);
  retiredNodes=ghost.querySelectorAll('*').length+1;
  fade=detailTransitions.reserve({outgoing:[ghost],owner:p.record,onFinish:()=>{
   for(const wrapper of [incoming,...motionCopies])if(wrapper?.parentNode)wrapper.replaceWith(...wrapper.childNodes);
   const removedNodes=retiredNodes+1;
   p.record.bytes-=retiredBytes;p.allocatedBytes-=retiredBytes;p.deltaBytes-=retiredBytes;
   p.record.nodes-=removedNodes;p.allocatedNodes-=removedNodes;p.deltaNodes-=removedNodes;
  }});
 }
 removePortalChildren(p);
 const markup=quality==='overview'?previewMarkup(0,0,p.seed,false):cachedMarkup(0,0,p.seed,quality,pixelScale);
 const replacementBytes=markup.length-p.allocatedBytes;
 const overlapBytes=fade?retiredBytes:0;
 p.record.bytes+=replacementBytes-descendantBytes+overlapBytes;p.deltaBytes+=replacementBytes+overlapBytes;p.allocatedBytes=markup.length+overlapBytes;
 if(fade){
  incoming=document.createElementNS(NS,'g');incoming.setAttribute('data-detail-portal','');incoming.innerHTML=markup;
  p.content.append(incoming);
 }else p.content.innerHTML=markup;
 const replacementNodes=p.content.querySelectorAll('*').length-p.allocatedNodes;
 p.record.nodes+=replacementNodes-descendantNodes;p.deltaNodes+=replacementNodes;p.allocatedNodes+=replacementNodes;
 p.quality=quality;p.pixelScale=pixelScale;
 if(quality==='overview')delete p.content.dataset.detailed;
 else{
  p.content.dataset.detailed=quality;
  const child=getPortal(0,0,p.seed),content=(incoming||p.content).querySelector('.portal-content');
  if(content)registerPortal(p.record,content,child.seed,{x:p.x+child.x*p.unit,y:p.y+child.y*p.unit,w:child.w*p.unit,h:child.h*p.unit},p.unit*child.k,p.depth+1,p);
 }
 scene.refresh(p.record,state);
 catalogueJourney.attach(p.record.el);
 catalogueJourney.sync();
 if(fade){motionCopies=[...p.record.motionEl?.querySelectorAll('[data-detail-portal]')||[]];fade.start([incoming,...motionCopies]);}
}
function scheduleBuild() {
 if(buildFrame||document.hidden)return;
 buildFrame=requestAnimationFrame(()=>{
  buildFrame=0;const revision=sceneRevision,start=performance.now();
  // Input may have queued a newer camera draw after this build callback. Let
  // that draw replace desiredTiles before constructing any obsolete shelves.
  if(scheduled){scheduleBuild();return;}
  let waiting=false;
  while(buildQueue.length){
   buildQueue=buildQueue.filter(spec=>desiredTiles.has(spec.key)&&!tiles.has(spec.key)&&spec.seed===state.seed);
   if(!buildQueue.length)break;
   // Leave old artwork visible while its fade waits, but don't hold up an empty
   // newly exposed bay behind the overlap budget during a large zoom-out.
   const index=buildQueue.findIndex(spec=>!waitForDetailSlot(spec));
   if(index<0){waiting=true;break;}
   const [spec]=buildQueue.splice(index,1);
   // The center arrives first, with the remaining tiles built in frame-sized work.
   installTile(spec);
   if(sceneRevision!==revision||performance.now()-start>6)break;
  }
  if(!buildQueue.length&&performance.now()-start<6){const task=portalWork();if(task){if(detailTransitions.activeCount&&!detailTransitions.canStart(task.p.allocatedNodes))waiting=true;else updatePortal(task.p,task.quality,task.pixelScale);}}
  if(!waiting&&(buildQueue.length||portalWork()))scheduleBuild();
 });
}
function requestDraw() {if(!scheduled){scheduled=true;requestAnimationFrame(()=>{scheduled=false;render();});}}
function nearestPortal() {
 const tx=Math.floor(state.x/W),ty=Math.floor(state.y/H);
 return {...getPortal(tx,ty,state.seed),tx,ty};
}
function enter(p) {
 parents.push({seed:state.seed,tx:p.tx,ty:p.ty,depth:state.depth,k:p.k});
 state.x=(state.x-p.tx*W-p.x)/p.k;state.y=(state.y-p.ty*H-p.y)/p.k;state.s*=p.k;
 state.zoomOffset-=Math.log10(p.k);state.seed=p.seed;state.depth++;clearTiles();
 announce(`You have entered library within library ${state.depth}. There are more shelves here.`);
}
function exit() {
 const parent=parents.pop();if(!parent)return;
 const p=getPortal(parent.tx,parent.ty,parent.seed);
 state.x=parent.tx*W+p.x+state.x*p.k;state.y=parent.ty*H+p.y+state.y*p.k;state.s/=p.k;
 state.zoomOffset+=Math.log10(p.k);state.seed=parent.seed;state.depth=parent.depth;clearTiles();
}
function outerWorld() {
 const childSeed=state.seed,newSeed=hash(childSeed,'a-larger-library',state.depth);
 portalSeeds.set(`${newSeed}:0:0`,childSeed);
 const p=getPortal(0,0,newSeed);state.x=p.x+state.x*p.k;state.y=p.y+state.y*p.k;state.s/=p.k;
 state.zoomOffset+=Math.log10(p.k);state.seed=newSeed;state.depth--;clearTiles();
 if(portalSeeds.size>128){
  const protectedKeys=new Set(parents.map(q=>`${q.seed}:${q.tx}:${q.ty}`));protectedKeys.add(`${state.seed}:0:0`);
  for(const key of portalSeeds.keys()){if(portalSeeds.size<=128)break;if(!protectedKeys.has(key))portalSeeds.delete(key);}
 }
}
function rebase() {
 if(animation || pointers.size)return;
 for(let i=0;i<12;i++){
  const p=nearestPortal(),x=p.tx*W+p.x,y=p.ty*H+p.y;
  if(state.x>x && state.x<x+p.w && state.y>y && state.y<y+p.h && p.w*state.s>state.w*1.25 && p.h*state.s>state.h*1.25)enter(p);
  else if(parents.length && state.s<.28)exit();
  else if(!parents.length && state.s<.095)outerWorld();
  else break;
 }
 // Floating-origin horizontal/vertical tiles avoid extremely large SVG transforms.
 if(Math.abs(state.x)>W*10000||Math.abs(state.y)>H*10000){
  const tx=Math.floor(state.x/W),ty=Math.floor(state.y/H);
  state.seed=hash(state.seed,tx,ty);state.x-=tx*W;state.y-=ty*H;parents.length=0;clearTiles();
 }
}

function render() {
 rebase();
 const left=state.x-state.w/(2*state.s),top=state.y-state.h/(2*state.s),right=left+state.w/state.s,bottom=top+state.h/state.s;
 scene.setCamera(state);
 currentQuality=chooseQuality(state.s,currentQuality,!navigating());
 const tileCount=(Math.floor(right/W)-Math.floor(left/W)+1)*(Math.floor(bottom/H)-Math.floor(top/H)+1);
 // Even during a long pinch, tiny distant bays must not retain dense detail.
 if(tileCount>40)currentQuality='overview';
 const detailed=currentQuality==='compact'||currentQuality==='full';
 labelScale=detailed?chooseLabelScale(state.s,labelScale,!navigating()):0;
 const quality=currentQuality,needed=new Map();
 for(let y=Math.floor(top/H);y<=Math.floor(bottom/H);y++)for(let x=Math.floor(left/W);x<=Math.floor(right/W);x++) {
  const key=tileKey(x,y,state.seed,quality,labelScale);needed.set(key,{key,tx:x,ty:y,seed:state.seed,quality,pixelScale:labelScale});
 }
 desiredTiles=needed;
 // Rescue every wanted cached record first. Parking an outgoing record (or
 // replacing a quality variant) must never evict a tile needed in this view.
 const reserved=new Map();
 for(const spec of needed.values())if(!tiles.has(spec.key)&&tilePool.has(spec.key)){
  const record=tilePool.get(spec.key);tilePool.delete(spec.key);poolBytes-=record.bytes;poolNodes-=record.nodes;reserved.set(spec.key,record);
 }
 const coordinates=new Set([...needed.values()].map(q=>`${q.tx},${q.ty}`));
 for(const [key,record] of tiles)if(!needed.has(key)&&!coordinates.has(`${record.tx},${record.ty}`)){rememberTile(key,record);tiles.delete(key);}
 buildQueue=[...needed.values()].filter(q=>!tiles.has(q.key)).sort((a,b)=>Math.hypot((a.tx+.5)*W-state.x,(a.ty+.5)*H-state.y)-Math.hypot((b.tx+.5)*W-state.x,(b.ty+.5)*H-state.y));
 // Reattach already parsed nearby tiles immediately; build cold tiles in frame slices.
 buildQueue=buildQueue.filter(spec=>{
  if(!reserved.has(spec.key))return true;
  if(waitForDetailSlot(spec)){const record=reserved.get(spec.key);rememberTile(spec.key,record);return true;}
  installTile(spec,reserved.get(spec.key));return false;
 });
 for(const record of tiles.values())scene.sync(record,state);
 catalogueJourney.sync();
 scheduleBuild();
 const logZoom=Math.log10(state.s/state.base)+state.zoomOffset;
 const zoomLabel=logZoom>4?`10^${(logZoom+2).toFixed(1)}%`:logZoom< -2?`10^${(logZoom+2).toFixed(1)}%`:`${Math.round(100*10**logZoom)}%`;
 if($('zoom-readout').textContent!==zoomLabel)$('zoom-readout').textContent=zoomLabel;
 const shelf=Math.floor(state.x/W), floor=Math.floor(state.y/H);
 const location=state.depth===0&&shelf===0&&floor===0?'The beginning, more or less':`${state.depth>0?`Library within library ${state.depth}`:state.depth<0?`A larger library ${-state.depth}`:'The wandering shelves'} · bay ${shelf+1}`;
 if($('location-label').textContent!==location)$('location-label').textContent=location;
}

function resize(initial=false) {
 const rect=stageRect=stage.getBoundingClientRect();state.w=rect.width;state.h=rect.height;svg.setAttribute('viewBox',`0 0 ${state.w} ${state.h}`);
 scene.resize(state);
 if(initial){state.base=Math.max(.38,state.h/H*1.08);state.s=state.base*HOME_ZOOM;}
 requestDraw();
}
function cancelFlight(){if(animation)cancelAnimationFrame(animation);animation=0;const complete=flightCompletion;flightCompletion=null;complete?.(false);}
function flyTo(x,y,s,duration=700,done) {
 touchNavigation();
 cancelFlight();const from={x:state.x,y:state.y,s:state.s},start=performance.now(),len=reduced.matches?0:duration;
 let complete;const journey=new Promise(resolve=>{complete=resolve;});flightCompletion=complete;
 function step(now) {
  const t=len?Math.min(1,(now-start)/len):1,u=t*t*(3-2*t);
  state.x=from.x+(x-from.x)*u;state.y=from.y+(y-from.y)*u;state.s=from.s*Math.exp(Math.log(s/from.s)*u);
  // Wait to change coordinate systems until the flight is complete.
  if(t===1){animation=0;flightCompletion=null;touchNavigation();requestDraw();done?.();complete(true);}else{animation=requestAnimationFrame(step);requestDraw();}
 }
 animation=requestAnimationFrame(step);
 return journey;
}
function zoomAt(factor,px=state.w/2,py=state.h/2) {
 interruptCatalogue();
 touchNavigation();
 cancelFlight();const x=state.x+(px-state.w/2)/state.s,y=state.y+(py-state.h/2)/state.s;
 const next=Math.max(.018,Math.min(40,state.s*Math.max(.02,Math.min(50,factor))));state.x=x-(px-state.w/2)/next;state.y=y-(py-state.h/2)/next;state.s=next;
 if(state.s>24){const p=nearestPortal();state.x=p.tx*W+p.x+p.w/2;state.y=p.ty*H+p.y+p.h/2;toast('A smaller world is waiting','Follow the doorway to keep looking closer.');}
 requestDraw();
}
function pan(dx,dy=0){interruptCatalogue();cancelFlight();flyTo(state.x+dx/state.s,state.y+dy/state.s,state.s,360);}
function goInside(tx,ty) {
 interruptCatalogue();
 const p={...getPortal(tx,ty,state.seed),tx,ty};
 const s=Math.max(state.w/p.w,state.h/p.h)*1.45;
 flyTo(tx*W+p.x+p.w/2,ty*H+p.y+p.h/2,s,1100);
}
function home(){
 resetCatalogue();
 reader.close(true);reader.cancelOffer();
 cancelFlight();clearTimeout(settleTimer);settleTimer=0;lastInput=-Infinity;
 const held=[...pointers.keys()];pointers.clear();pointerGesture=null;downTarget=null;dragged=held.length>0;
 stage.classList.remove('is-dragging');for(const id of held)if(stage.hasPointerCapture?.(id))stage.releasePointerCapture(id);
 parents.length=0;state.seed=17;state.depth=0;state.zoomOffset=0;state.x=W*.5;state.y=H*.5;state.s=state.base*HOME_ZOOM;
 clearTiles();requestDraw();announce('Back at the beginning, more or less.');
}

stage.addEventListener('wheel',e=>{
 if(catalogue.isOpen)return;
 if(e.target.closest('button,a'))return;
 e.preventDefault();const rect=stageRect;
 // Normal scrolling zooms into the point beneath the cursor; shift-scroll wanders.
 if(e.shiftKey){interruptCatalogue();touchNavigation();cancelFlight();state.x+=(e.deltaY+e.deltaX)/state.s;requestDraw();}
 else {const delta=e.deltaMode===1?e.deltaY*16:e.deltaMode===2?e.deltaY*state.h:e.deltaY;zoomAt(Math.exp(-Math.max(-160,Math.min(160,delta))*.0025),e.clientX-rect.left,e.clientY-rect.top);}
},{passive:false});

function gestureBaseline() {
 const ps=[...pointers.values()];if(!ps.length)return;
 const mid=ps.length>1?{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2}:ps[0];
 pointerGesture={x:state.x,y:state.y,s:state.s,mx:mid.x,my:mid.y,d:ps.length>1?Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y):0};
}
stage.addEventListener('pointerdown',e=>{
 if(catalogue.isOpen)return;
 if(e.target.closest('button,a,dialog')||e.button!==0)return;
 interruptCatalogue();
 touchNavigation();cancelFlight();pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===1)dragged=false;
 downTarget=e.target;
 stage.setPointerCapture(e.pointerId);gestureBaseline();
});
stage.addEventListener('pointermove',e=>{
 if(!pointers.has(e.pointerId)||!pointerGesture)return;
 touchNavigation();
 pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});const ps=[...pointers.values()];
 const mid=ps.length>1?{x:(ps[0].x+ps[1].x)/2,y:(ps[0].y+ps[1].y)/2}:ps[0],g=pointerGesture;
 if(Math.hypot(mid.x-g.mx,mid.y-g.my)>4||ps.length>1){dragged=true;stage.classList.add('is-dragging');}
 const scale=Math.max(.09,Math.min(24,ps.length>1&&g.d>0?g.s*Math.hypot(ps[0].x-ps[1].x,ps[0].y-ps[1].y)/g.d:g.s));
 const rect=stageRect,a={x:g.mx-rect.left-state.w/2,y:g.my-rect.top-state.h/2};
 state.s=scale;state.x=g.x+a.x/g.s-(mid.x-rect.left-state.w/2)/scale;state.y=g.y+a.y/g.s-(mid.y-rect.top-state.h/2)/scale;
 requestDraw();
});
function release(e){pointers.delete(e.pointerId);touchNavigation();if(pointers.size)gestureBaseline();else{pointerGesture=null;stage.classList.remove('is-dragging');requestDraw();}}
stage.addEventListener('pointerup',release);stage.addEventListener('pointercancel',release);
stage.addEventListener('lostpointercapture',e=>{if(pointers.has(e.pointerId))release(e);});
stage.addEventListener('click',e=>{
 if(catalogue.isOpen)return;
 if(dragged){dragged=false;return;}
 const target=e.target===stage&&downTarget?.isConnected?downTarget:e.target;
 downTarget=null;
 if(target.closest('.catalogue-drawer')){void catalogue.open();return;}
 const item=target.closest('[data-find],[data-book]');
 if(item?.hasAttribute('data-book')){bookNote(Number(item.dataset.book),item);return;}
 if(item){discover(Number(item.dataset.find));return;}
 let portal=target.closest('.portal');if(portal){while(portal.parentElement.closest('.portal'))portal=portal.parentElement.closest('.portal');const [x,y]=portal.dataset.portal.split(',').map(Number);goInside(x,y);}
});
stage.addEventListener('dblclick',e=>{if(catalogue.isOpen||e.target.closest('button,a,.catalogue-drawer'))return;const rect=stageRect;zoomAt(1.8,e.clientX-rect.left,e.clientY-rect.top);});

$('pan-left').onclick=()=>pan(-state.w*.55);$('pan-right').onclick=()=>pan(state.w*.55);
document.querySelector('.wordmark').onclick=e=>{e.preventDefault();home();stage.focus();};
$('zoom-in').onclick=()=>zoomAt(1.4);$('zoom-out').onclick=()=>zoomAt(1/1.4);$('home-btn').onclick=home;
$('search-btn').onclick=()=>{void catalogue.open();};
$('explore-btn').onclick=()=>{const p=nearestPortal();goInside(p.tx,p.ty);};
function updateMotion(){document.body.classList.toggle('paused',paused);$('motion-btn').setAttribute('aria-pressed',String(paused));$('motion-btn').setAttribute('aria-label',paused?'Resume little animations':'Pause little animations');$('motion-btn').title=paused?'Resume little animations':'Pause little animations';}
$('motion-btn').onclick=()=>{paused=!paused;updateMotion();};updateMotion();
reduced.addEventListener('change',e=>{if(e.matches)detailTransitions.finishAll();paused=e.matches;updateMotion();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){detailTransitions.finishAll();resetCatalogue();}document.body.classList.toggle('is-background',document.hidden);if(!document.hidden){requestDraw();scheduleBuild();}});
window.addEventListener('pagehide',()=>{detailTransitions.finishAll();resetCatalogue();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&catalogue.isOpen&&!$('catalogue-search').open){e.preventDefault();void catalogue.close();}});
stage.addEventListener('keydown',e=>{
 if(catalogue.isOpen||e.isComposing)return;
 if(e.target.closest('.catalogue-drawer')){if(e.key==='Enter'||e.key===' '){e.preventDefault();void catalogue.open();}return;}
 if(e.target.closest('button,a,input,select'))return;
 const actions={'ArrowLeft':()=>pan(-180),'ArrowRight':()=>pan(180),'ArrowUp':()=>pan(0,-160),'ArrowDown':()=>pan(0,160),'+':()=>zoomAt(1.35),'=':()=>zoomAt(1.35),'-':()=>zoomAt(1/1.35),'Home':home,'Enter':()=>{const p=nearestPortal();goInside(p.tx,p.ty);},'d':()=>{const next=DISCOVERIES.findIndex((_,i)=>!found.has(i));discover(next<0?0:next);}};
 if(actions[e.key]){e.preventDefault();actions[e.key]();}
});

function saveSVG() {
 detailTransitions.finishAll();
 const copy=svg.cloneNode(true);copy.setAttribute('xmlns',NS);copy.setAttribute('width',Math.round(state.w));copy.setAttribute('height',Math.round(state.h));copy.removeAttribute('id');
 // Capture each moving group's current local pose, including nested fish tails.
 // The downloaded picture keeps the visible moment without any running animation.
 const motion='.running-mouse,.floating-book,.flying-book-motion,.twinkle,.swimming-fish,.fish-tail,.clock-pendulum,.falling-leaf,.rocking-horse';
 const originals=scene.exportLayers(copy,motion);
 const frozen=copy.querySelectorAll(motion);
 originals.forEach((source,i)=>{
  const target=frozen[i],pose=source.getCTM(),parentPose=source.parentElement.getCTM?.();
  if(pose&&parentPose){
   const local=parentPose.inverse().multiply(pose),values=[local.a,local.b,local.c,local.d,local.e,local.f];
   if(values.every(Number.isFinite))target.setAttribute('transform',`matrix(${values.join(' ')})`);
  }
  target.style.animation='none';target.style.translate='none';target.style.rotate='none';target.style.scale='none';
  target.style.offsetPath='none';target.style.offsetDistance='0%';
  target.style.transformOrigin='0px 0px';target.style.transformBox='view-box';
  target.style.opacity=getComputedStyle(source).opacity;
 });
 const style=document.createElementNS(NS,'style');style.textContent=`text{font-family:Georgia,serif}${motion}{animation:none}`;copy.prepend(style);
 const title=document.createElementNS(NS,'title');title.textContent='The Unfinished Library — an illustrated keepsake';copy.prepend(title);
 const bg=document.createElementNS(NS,'rect');bg.setAttribute('width','100%');bg.setAttribute('height','100%');bg.setAttribute('fill','#e5c49a');copy.insertBefore(bg,copy.querySelector('g'));
 const blob=new Blob(['<?xml version="1.0" encoding="UTF-8"?>\n',new XMLSerializer().serializeToString(copy)],{type:'image/svg+xml'}),url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download='the-unfinished-library.svg';a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);announce('Your current view is ready to download as a standalone SVG.');toast('A little piece of infinity','Your current view is ready to download as an SVG.');
}
$('export-btn').onclick=saveSVG;
updateDiscoveryCounter();resize(true);new ResizeObserver(()=>resize()).observe(stage);
// Read-only diagnostics make precision, tile limits, and recursive levels inspectable.
window.library={get state(){return {...state,parents:parents.length,tiles:tiles.size,pooledTiles:tilePool.size,pooledBytes:poolBytes,pooledNodes:poolNodes,markupBytes,portalRecords:portalRegistry.size,queuedTiles:buildQueue.length,pendingBuild:buildFrame!==0,pendingDetails:settleTimer!==0,quality:currentQuality,labelScale,discoveries:found.size,fadingDetails:detailTransitions.activeCount,retiredDetailNodes:detailTransitions.retainedNodes,peakDetailNodes:detailTransitions.peakNodes,cataloguePhase:catalogueJourney.phase,highlightedBook:catalogueJourney.highlightedBook};},home,zoomAt,goInside,saveSVG};
