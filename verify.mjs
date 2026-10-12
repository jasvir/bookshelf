import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import vm from 'node:vm';
import {performance as realPerformance} from 'node:perf_hooks';
import * as art from './art.js';
import {BOOKS,DISCOVERIES} from './catalog.js';

// Real application and renderers, deterministic event-loop and SVG DOM/scene
// stubs. This tests scheduling/accounting; it intentionally does not time paint.
function harness({width=1280,height=629,reducedMotion=false}={}){
 let now=0,nextId=1,frames=new Map(),timers=new Map(),elements=new Map();
 const generated=[],parses=[],attaches=[],detaches=[],events=new Map();
 class Element{
  constructor(tag='g',id=''){this.tagName=tag;this.id=id;this.children=[];this.attributes=new Map();this.dataset={};this.textContent='';this.hidden=false;this.parentElement=null;this.style={};this.handlers=new Map();this.classNames=new Set();this.classList={add:(...v)=>v.forEach(s=>this.classNames.add(s)),remove:(...v)=>v.forEach(s=>this.classNames.delete(s)),toggle:(s,v)=>{const on=v===undefined?!this.classNames.has(s):v;on?this.classNames.add(s):this.classNames.delete(s);return on},contains:s=>this.classNames.has(s)};}
  get isConnected(){return !!this.rootConnected||!!this.parentElement?.isConnected;}
  get childElementCount(){return this.children.length;}
  get parentNode(){return this.parentElement;}
  set innerHTML(value){this.html=String(value);this.children=[];parses.push({tag:this.tagName,id:this.id,chars:this.html.length});const stack=[this];for(const m of this.html.matchAll(/<([^>]+)>/g)){const token=m[1];if(token.startsWith('!')||token.startsWith('?'))continue;if(token.startsWith('/')){if(stack.length>1)stack.pop();continue;}const tag=token.match(/^([^\s/]+)/)?.[1];if(!tag)continue;const node=new Element(tag);for(const a of token.matchAll(/([^\s=]+)\s*=\s*"([^"]*)"/g))node.setAttribute(a[1],a[2]);stack.at(-1).append(node);if(!token.endsWith('/'))stack.push(node);}}
  get innerHTML(){return this.html||'';}
  setAttribute(key,value){const v=String(value);this.attributes.set(key,v);if(key==='id')this.id=v;if(key==='class')this.classNames=new Set(v.split(/\s+/));if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,s)=>s.toUpperCase())]=v;}
  getAttribute(key){return this.attributes.get(key)??null;}
  hasAttribute(key){return this.attributes.has(key);}
  removeAttribute(key){this.attributes.delete(key);if(key.startsWith('data-'))delete this.dataset[key.slice(5).replace(/-([a-z])/g,(_,s)=>s.toUpperCase())];}
  matches(selector){return selector.split(',').some(part=>{const s=part.trim();if(s==='*')return true;if(s.startsWith('#'))return this.id===s.slice(1);const base=s.replace(/\[[^\]]+\]/g,'');if(base.startsWith('.')&&!base.slice(1).split('.').every(c=>this.classNames.has(c)))return false;if(base&&!base.startsWith('.')&&base!==this.tagName)return false;for(const a of s.matchAll(/\[([^=\]]+)(?:="?([^"\]]+)"?)?\]/g)){if(!this.hasAttribute(a[1])||(a[2]&&this.getAttribute(a[1])!==a[2]))return false;}return true;});}
  querySelectorAll(selector){const out=[];for(const child of this.children){if(child.matches(selector))out.push(child);out.push(...child.querySelectorAll(selector));}return out;}
  querySelector(selector){return this.querySelectorAll(selector)[0]||null;}
  getElementsByTagName(tag){return this.querySelectorAll(tag);}
  closest(selector){for(let n=this;n;n=n.parentElement)if(n.matches(selector))return n;return null;}
  append(...nodes){for(const node of nodes){node.remove();this.children.push(node);node.parentElement=this;}}
  appendChild(node){this.append(node);return node;}
  prepend(node){node.remove();this.children.unshift(node);node.parentElement=this;}
  remove(){if(this.parentElement){this.parentElement.children=this.parentElement.children.filter(n=>n!==this);this.parentElement=null;}}
  addEventListener(type,callback){const list=this.handlers.get(type)||[];list.push(callback);this.handlers.set(type,list);}
  dispatch(type,data={}){const e={type,target:this,button:0,pointerId:1,clientX:width/2,clientY:91+height/2,preventDefault(){},...data};for(const fn of this.handlers.get(type)||[])fn(e);return e;}
  getBoundingClientRect(){return{left:0,top:91,width,height};}
  focus(){}setPointerCapture(){}releasePointerCapture(){}
 }
 const element=id=>{if(!elements.has(id)){const n=new Element(id==='world'?'svg':'g',id);n.rootConnected=true;elements.set(id,n);}return elements.get(id)};
 const document={hidden:false,getElementById:element,querySelector:s=>s==='.wordmark'?element('wordmark'):element(s),querySelectorAll:()=>[],body:element('body'),addEventListener(type,callback){const list=events.get(type)||[];list.push(callback);events.set(type,list);},createElementNS:(ns,tag)=>new Element(tag),createElement:tag=>new Element(tag)};
 const scene={motionSvg:element('motion-world'),motionCamera:element('motion-camera'),setCamera(){},resize(){},attach(record,state){element('camera').append(record.el);attaches.push({tx:record.tx,ty:record.ty,quality:record.quality});record.rooms??=[];record.motionEntries??=[];},detach(record){record.el.remove();detaches.push({tx:record.tx,ty:record.ty,quality:record.quality});},restore(){},refresh(){},sync(){},exportLayers(){return[];}};
 const context={...art,BOOKS,DISCOVERIES,createScene:()=>scene,document,window:{},performance:{now:()=>now},console,Map,Set,Number,Math,JSON,Date,localStorage:{getItem:()=>null,setItem(){}},matchMedia:()=>({matches:reducedMotion,addEventListener(){}}),ResizeObserver:class{observe(){}},setTimeout(fn,ms=0){const id=nextId++;timers.set(id,{fn,due:now+ms});return id;},clearTimeout:id=>timers.delete(id),requestAnimationFrame(fn){const id=nextId++;frames.set(id,fn);return id},cancelAnimationFrame:id=>frames.delete(id)};
 context.tileMarkup=(...args)=>{const t=realPerformance.now(),markup=art.tileMarkup(...args);now+=realPerformance.now()-t;generated.push({tx:args[0],ty:args[1],seed:args[2],quality:args[5],chars:markup.length});return markup};
 context.previewMarkup=(...args)=>{const t=realPerformance.now(),markup=art.previewMarkup(...args);now+=realPerformance.now()-t;generated.push({tx:args[0],ty:args[1],seed:args[2],quality:'overview',chars:markup.length});return markup};
 vm.createContext(context);
 const source=fs.readFileSync(new URL('./app.js',import.meta.url),'utf8').replace(/^import .*;\n/gm,'');
 vm.runInContext(source+`\nwindow.audit={limits:{poolChars:MAX_POOL_BYTES,markupChars:MAX_MARKUP_BYTES,poolNodes:MAX_POOL_NODES,poolEntries:MAX_POOL_ENTRIES},state,tiles,tilePool,markupCache,portalRegistry,parents,pointers,render,requestDraw,scheduleBuild,clearTiles,enter,exit,release,home,zoomAt,nearestPortal,
 get desired(){return desiredTiles},get labelScale(){return labelScale},get navigating(){return navigating()},get queue(){return buildQueue},get poolBytes(){return poolBytes},get markupBytes(){return markupBytes},get revision(){return sceneRevision},get scheduled(){return scheduled},
 get poolNodes(){return typeof poolNodes==='undefined'?undefined:poolNodes},get markupNodes(){return typeof markupNodes==='undefined'?undefined:markupNodes},
 get quality(){return typeof currentQuality==='undefined'?window.library.state.quality:currentQuality},get settleTimer(){return typeof settleTimer==='undefined'?undefined:settleTimer},touchNavigation,chooseQuality,nominalQuality,updatePortal,portalWork,rememberTile};`,context);
 const audit=context.window.audit;
 function frame(){if(!frames.size)return false;now+=16;const pending=[...frames.keys()];for(const id of pending){const callback=frames.get(id);if(!callback)continue;frames.delete(id);callback(now);}return true;}
 function drain(limit=500){let count=0;while(frames.size){if(count++>=limit)throw Error('RAF queue did not settle');frame();}return count;}
 function advance(ms){now+=ms;for(let guard=0;guard<50;guard++){const ready=[...timers].filter(([id,t])=>t.due<=now);if(!ready.length)break;for(const [id,t]of ready){if(!timers.has(id))continue;timers.delete(id);t.fn();}}}
 function resetCounters(){generated.length=0;parses.length=0;attaches.length=0;detaches.length=0;}
 function accounting(){if(audit.poolNodes!==undefined)assert.equal(audit.poolNodes,[...audit.tilePool.values()].reduce((s,r)=>s+r.nodes,0),'pool node accounting');assert.ok(audit.tilePool.size<=audit.limits.poolEntries,'pool entry cap');assert.ok(audit.poolBytes<=audit.limits.poolChars,'pool char cap');assert.ok((audit.poolNodes||0)<=audit.limits.poolNodes,'pool node cap');assert.ok(audit.markupCache.size<=24,'markup entry cap');assert.ok(audit.markupBytes<=audit.limits.markupChars,'markup char cap');assert.equal(audit.poolBytes,[...audit.tilePool.values()].reduce((s,r)=>s+r.bytes,0),'pool character accounting');assert.equal(audit.markupBytes,[...audit.markupCache.values()].reduce((s,r)=>s+(typeof r==='string'?r.length:r.bytes??r.markup?.length??r.value?.length??0),0),'markup character accounting');}
 return{audit,context,document,scene,element,visibilityChange(){for(const fn of events.get('visibilitychange')||[])fn();},generated,parses,attaches,detaches,frame,drain,advance,resetCounters,accounting,frames,timers,get now(){return now}};
}

// Invoke `node verify.mjs` for the retained regression checks, or `--smoke`
// for one startup/accounting check. No source or artifact files are written.
const invokedDirectly=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(invokedDirectly&&process.argv.includes('--smoke')){const h=harness();h.drain();h.accounting();console.log(JSON.stringify({smoke:true,state:h.context.window.library.state,generated:h.generated.length,parses:h.parses.length}));}
export {harness};

if(invokedDirectly&&!process.argv.includes('--smoke')){
 const results=[];
 function test(name,fn){try{const details=fn();results.push({name,pass:true,...details});}catch(error){results.push({name,pass:false,error:error.message});}}
 test('Home small zoom stays in one representation',()=>{
  const h=harness();h.drain();const initialQuality=h.audit.quality,initialCount=h.audit.tiles.size;h.resetCounters();
  for(let i=0;i<4;i++){h.audit.zoomAt(.979);h.drain();h.advance(220);h.drain();h.audit.zoomAt(1/.979);h.drain();h.advance(220);h.drain();h.accounting();}
  assert.equal(h.audit.quality,initialQuality);assert.equal(h.generated.length,0);assert.equal(h.attaches.length,0);return{quality:initialQuality,tiles:initialCount,swaps:h.attaches.length};
 });
 test('Settled zoom chatter does not replace label-scale variants',()=>{
  const h=harness();h.drain();const a=h.audit;a.zoomAt(.8/a.state.s);h.drain();h.advance(220);h.drain();const bucket=a.labelScale;h.resetCounters();for(let i=0;i<2;i++)for(const scale of [.706,.708]){a.zoomAt(scale/a.state.s);h.drain();h.advance(220);h.drain();assert.equal(a.quality,'compact');assert.equal(a.labelScale,bucket);}assert.equal(h.generated.length,0);assert.equal(h.parses.length,0);assert.equal(h.attaches.length,0);h.accounting();return{labelScale:bucket,swaps:0};
 });
 test('Quality hysteresis preserves both sides of every boundary',()=>{
  const h=harness(),choose=h.audit.chooseQuality;
  for(const [boundary,lower,higher]of[[.12,'overview','distant'],[.48,'distant','compact'],[.95,'compact','full']]){assert.equal(choose(boundary*1.03,lower,true),lower);assert.equal(choose(boundary*.97,higher,true),higher);assert.equal(choose(boundary*1.13,lower,true),higher);assert.equal(choose(boundary*.87,higher,false),lower);assert.equal(choose(boundary*1.13,lower,false),lower);}
  return{boundaries:3,nearBoundaryStable:true,downgradeAllowedDuringInput:true};
 });
 test('Pan return reuses protected parsed records',()=>{
  const h=harness();h.drain();const initialKeys=new Set(h.audit.tiles.keys()),a=h.audit;h.resetCounters();a.state.x+=580/a.state.s;a.render();h.drain();h.accounting();
  const missing=[...initialKeys].filter(key=>!a.tiles.has(key));assert.ok(missing.length>0);assert.ok(missing.every(key=>a.tilePool.has(key)),'required return records were cached');
  h.resetCounters();a.state.x-=580/a.state.s;a.render();h.drain();h.accounting();assert.equal(h.generated.length,0);assert.equal(h.parses.length,0);assert.ok([...initialKeys].every(key=>a.tiles.has(key)));return{cachedReturnTiles:missing.length,regenerated:h.generated.length,reattached:h.attaches.length};
 });
 test('Pending build yields to newer camera draw',()=>{
  const h=harness();h.drain();const a=h.audit;h.resetCounters();a.state.x+=20*art.W;a.render();assert.ok(a.queue.length>0);a.state.x-=20*art.W;a.requestDraw();h.drain();
  assert.ok(h.generated.every(g=>Math.abs(g.tx)<4),'an obsolete far-away tile was generated');assert.ok([...a.tiles.values()].every(r=>Math.abs(r.tx)<4));h.accounting();return{obsoleteGenerated:h.generated.filter(g=>Math.abs(g.tx)>=4).length,currentGenerated:h.generated.length};
 });
 test('Cache counters and caps survive repeated travel',()=>{
  const h=harness();h.drain();let maxEntries=0,maxChars=0,maxNodes=0;
  for(let i=1;i<=12;i++){h.audit.state.x=art.W*(.5+i*4);h.audit.render();h.drain();h.accounting();maxEntries=Math.max(maxEntries,h.audit.tilePool.size);maxChars=Math.max(maxChars,h.audit.poolBytes);maxNodes=Math.max(maxNodes,h.audit.poolNodes);}
  return{maxEntries,maxChars,maxNodes};
 });
 test('Each parsed cache ceiling evicts independently',()=>{
  function fixture(h,index,bytes,nodes){h.audit.rememberTile(`fixture-${index}`,{el:h.element(`fixture-${index}`),portals:[],bytes,nodes,tx:index,ty:0,seed:123,quality:'distant'});h.accounting();}
  const entries=harness();for(let i=0;i<20;i++)fixture(entries,i,1,1);assert.equal(entries.audit.tilePool.size,18);
  const chars=harness();for(let i=0;i<3;i++)fixture(chars,i,chars.audit.limits.poolChars/2.4,1);assert.equal(chars.audit.tilePool.size,2);
  const nodes=harness();for(let i=0;i<2;i++)fixture(nodes,i,1,40_000);assert.equal(nodes.audit.tilePool.size,1);assert.equal(nodes.audit.poolNodes,40_000);
  return{entryCap:true,characterCap:true,nodeCap:true};
 });
 test('Visibility recovery paints new camera before queued builds',()=>{
  const h=harness();h.drain();const a=h.audit;h.resetCounters();a.state.x+=20*art.W;a.render();h.document.hidden=true;h.visibilityChange();a.state.x-=20*art.W;h.document.hidden=false;h.visibilityChange();h.drain();assert.ok(h.generated.every(g=>Math.abs(g.tx)<4));h.accounting();return{obsoleteGenerated:0};
 });
 test('Gesture downgrades immediately and upgrades after final release',()=>{
  const h=harness();h.drain();const a=h.audit,stage=h.element('stage');stage.dispatch('pointerdown',{pointerId:1});a.state.s=.8;a.requestDraw();h.drain();h.advance(400);h.drain();assert.equal(a.quality,'distant','upgrade occurred while pointer held');
  stage.dispatch('pointerup',{pointerId:1});h.drain();assert.equal(a.quality,'distant','upgrade occurred before settle');h.advance(220);h.drain();assert.equal(a.quality,'compact');
  stage.dispatch('pointerdown',{pointerId:1});stage.dispatch('pointerdown',{pointerId:2});a.state.s=1.5;a.requestDraw();h.drain();stage.dispatch('pointerup',{pointerId:1});h.advance(400);h.drain();assert.equal(a.quality,'compact','one remaining pointer permitted upgrade');
  stage.dispatch('pointerup',{pointerId:2});h.advance(220);h.drain();assert.equal(a.quality,'full');
  stage.dispatch('pointerdown',{pointerId:3});a.state.s=.09;a.requestDraw();h.drain();assert.equal(a.quality,'overview');assert.ok([...a.tiles.values()].every(r=>r.quality==='overview'));h.accounting();return{heldUpgradeBlocked:true,settledUpgrade:'full',activePinchDowngrade:a.quality,lowZoomTiles:a.tiles.size};
 });
 test('Pointer cancellation and capture loss permit settled upgrade',()=>{
  for(const ending of ['pointercancel','lostpointercapture']){const h=harness();h.drain();const a=h.audit,stage=h.element('stage');stage.dispatch('pointerdown',{pointerId:4});a.state.s=.8;a.requestDraw();h.drain();stage.dispatch(ending,{pointerId:4});h.advance(220);h.drain();assert.equal(a.pointers.size,0);assert.equal(a.quality,'compact');h.accounting();}
  return{endings:2};
 });
 test('Home cancels pending builds and settled upgrades',()=>{
  const h=harness();h.drain();const a=h.audit;h.resetCounters();a.zoomAt(3);a.state.x+=20*art.W;a.render();assert.ok(a.queue.length);assert.ok(a.settleTimer);a.home();assert.equal(a.queue.length,0);assert.equal(a.settleTimer,0);h.drain();h.advance(400);h.drain();assert.equal(a.state.seed,17);assert.equal(a.state.depth,0);assert.equal(a.quality,'distant');assert.equal(a.labelScale,0);assert.ok(h.generated.every(g=>Math.abs(g.tx)<4));h.accounting();return{homeQuality:a.quality,staleWork:0};
 });
 test('Recursive enter and exit reset work and representation',()=>{
  const h=harness();h.drain();const a=h.audit,p=a.nearestPortal(),initialSeed=a.state.seed;h.resetCounters();a.state.x+=20*art.W;a.render();assert.ok(a.queue.length);a.state.x=p.x+p.w/2;a.state.y=p.y+p.h/2;a.state.s=8;a.enter(p);assert.equal(a.queue.length,0);assert.equal(a.tiles.size,0);assert.equal(a.portalRegistry.size,0);assert.equal(a.quality,a.nominalQuality(a.state.s));a.requestDraw();h.drain();assert.equal(a.state.seed,p.seed);assert.equal(a.state.depth,1);assert.ok([...a.tiles.values()].every(r=>r.seed===p.seed));assert.ok(h.generated.every(g=>Math.abs(g.tx)<4));
  a.exit();assert.equal(a.state.seed,initialSeed);assert.equal(a.state.depth,0);assert.equal(a.queue.length,0);assert.equal(a.tiles.size,0);assert.equal(a.portalRegistry.size,0);assert.equal(a.quality,a.nominalQuality(a.state.s));a.requestDraw();h.drain();h.accounting();return{childSeed:p.seed,returnSeed:a.state.seed,quality:a.quality};
 });
 test('Home cancels an active pointer baseline',()=>{
  const h=harness();h.drain();const a=h.audit,stage=h.element('stage');a.state.x=5000;a.state.s=.8;a.render();h.drain();stage.dispatch('pointerdown',{pointerId:8,clientX:100,clientY:200});a.home();h.drain();const homeX=a.state.x,homeScale=a.state.s;stage.dispatch('pointermove',{pointerId:8,clientX:100,clientY:200});h.drain();assert.equal(a.state.x,homeX,'stationary held pointer undid Home position');assert.equal(a.state.s,homeScale,'stationary held pointer undid Home scale');return{positionPreserved:true,scalePreserved:true};
 });
 test('Nested portal replacement restores byte and node accounting',()=>{
  const h=harness();h.drain();const a=h.audit,p=[...a.portalRegistry].find(p=>p.record.tx===0&&p.record.ty===0),baseBytes=p.record.bytes,baseNodes=p.record.nodes;a.updatePortal(p,'compact',Math.SQRT1_2);const firstUpgradeBytes=p.record.bytes,child=p.record.portals.find(q=>q.parent===p);assert.ok(child);a.updatePortal(child,'compact',Math.SQRT1_2);assert.equal(p.record.bytes,baseBytes+p.deltaBytes+child.deltaBytes);assert.equal(p.record.nodes,p.record.el.querySelectorAll('*').length);a.updatePortal(p,'overview',0);assert.equal(p.record.bytes,baseBytes);assert.equal(p.record.nodes,baseNodes);assert.ok(!a.portalRegistry.has(child));assert.equal(p.record.portals.length,1);a.updatePortal(p,'compact',Math.SQRT1_2);assert.equal(p.record.bytes,firstUpgradeBytes);assert.equal(p.record.nodes,p.record.el.querySelectorAll('*').length);assert.ok(p.record.portals.find(q=>q.parent===p)!==child);a.home();h.drain();h.accounting();return{baselineRestored:true,descendantRemoved:true,reupgradeConsistent:true};
 });
 console.log(JSON.stringify({tests:results.length,passed:results.filter(r=>r.pass).length,results},null,2));if(results.some(r=>!r.pass))process.exitCode=1;
}
