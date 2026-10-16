import assert from 'node:assert/strict';
import {createCatalogueJourney,nearestCatalogueDrawer} from './catalogue-journey.js';

// Test the actual journey controller with deterministic camera promises and a
// small SVG DOM. These checks cover cancellation and placement, not painting.
class Node {
 constructor(tag='g'){this.tagName=tag;this.children=[];this.parentNode=null;this.attributes=new Map();this.classes=new Set();this.classList={add:(...v)=>v.forEach(s=>this.classes.add(s)),remove:(...v)=>v.forEach(s=>this.classes.delete(s)),contains:s=>this.classes.has(s)};}
 get lastElementChild(){return this.children.at(-1)||null;}
 setAttribute(key,value){this.attributes.set(key,String(value));}
 getAttribute(key){return this.attributes.get(key)??null;}
 append(...nodes){for(const node of nodes){node.remove();node.parentNode=this;this.children.push(node);}}
 remove(){if(this.parentNode)this.parentNode.children=this.parentNode.children.filter(child=>child!==this);this.parentNode=null;}
 querySelectorAll(selector){return this.children.flatMap(child=>[...(selector.startsWith('.')&&child.classes.has(selector.slice(1))?[child]:[]),...child.querySelectorAll(selector)]);}
}

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return{promise,resolve,reject};};
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const makeBook=(id=7)=>({bookId:id,occurrenceKey:`fixture-book-${id}`,seed:17,x:210,y:280,w:30,h:120,bounds:{x:150,y:225,w:120,h:110},corners:[{x:150,y:250},{x:175,y:225},{x:270,y:310},{x:245,y:335}]});

function harness({lookup,controlledFlights=false}={}){
 const initial={x:540,y:560,s:.24,w:1280,h:629,seed:17,depth:0};
 const view={...initial},drawing=new Node(),button=new Node('button'),calls=[],found=[],announcements=[];
 let cancelled=0,draws=0,focused=0;
 const drawer={key:'drawer-origin',x:475,y:430,w:130,h:44,tx:0,ty:0,seed:17};
 const source=new Node();source.classes.add('catalogue-drawer');source.setAttribute('data-catalogue',drawer.key);drawing.append(source);
 const stage={getBoundingClientRect:()=>({left:18,top:91,width:view.w,height:view.h}),focus:()=>focused++};
 const flyTo=(x,y,s,duration)=>{
  const task={x,y,s,duration,...deferred(),settled:false};calls.push(task);
  task.complete=()=>{if(task.settled)return;task.settled=true;Object.assign(view,{x,y,s});task.resolve(true);};
  if(!controlledFlights)task.complete();return task.promise;
 };
 const cancelFlight=()=>{cancelled++;for(const task of calls)if(!task.settled){task.settled=true;task.resolve(false);}};
 const previousDocument=globalThis.document;
 globalThis.document={createElementNS:(namespace,tag)=>new Node(tag)};
 const journey=createCatalogueJourney({getView:()=>({...view}),getDrawers:(tx,ty)=>tx===0&&ty===0?[drawer]:[],findNearestBook:lookup||((id)=>Promise.resolve(makeBook(id))),flyTo,cancelFlight,requestDraw:()=>draws++,announce:text=>announcements.push(text),onFound:book=>found.push(book),drawing,stage,button});
 return{journey,view,initial,drawer,drawing,button,source,calls,found,announcements,get cancelled(){return cancelled},get focused(){return focused},get draws(){return draws},dispose(){journey.reset();globalThis.document=previousDocument}};
}

const results=[];
async function test(name,fn){try{await fn();results.push({name,pass:true});}catch(error){results.push({name,pass:false,error:error.stack});}}

await test('Drawer selection prefers an intersecting drawer over a nearer offscreen drawer',()=>{
 const view={x:0,y:0,s:1,w:200,h:200,seed:3};
 const visible={key:'visible',x:85,y:85,w:30,h:30},outside={key:'outside',x:-1,y:-115,w:2,h:10};
 const drawer=nearestCatalogueDrawer(view,(tx,ty)=>tx===0&&ty===0?[visible,outside]:[]);
 assert.equal(drawer.key,'visible');
});

await test('Close views find a nearby drawer across a negative tile boundary',()=>{
 const drawer={key:'negative',x:-1100,y:-1140,w:130,h:44};
 const result=nearestCatalogueDrawer({x:-20,y:-30,s:8,w:300,h:220,seed:9},(tx,ty)=>tx===-2&&ty===-2?[drawer]:[]);
 assert.equal(result.key,'negative');
});

await test('Approach anchors the opened drawer and hides matching source replacements',async()=>{
 const h=harness();try{
  const anchor=await h.journey.approach();
  assert.equal(h.journey.phase,'open');assert.equal(h.button.getAttribute('aria-busy'),'false');
  assert.ok(h.source.classList.contains('is-catalogue-source'));
  assert.equal(anchor.width,h.drawer.w*h.view.s);assert.equal(anchor.height,h.drawer.h*h.view.s);
  assert.equal(anchor.x,18+(h.drawer.x-h.view.x)*h.view.s+h.view.w/2);
  assert.equal(anchor.y,91+(h.drawer.y-h.view.y)*h.view.s+h.view.h/2);
  const replacement=new Node();replacement.classes.add('catalogue-drawer');replacement.setAttribute('data-catalogue',h.drawer.key);
  const root=new Node();root.append(replacement);h.journey.attach(root);
  assert.ok(replacement.classList.contains('is-catalogue-source'));
  await h.journey.cancel();
  assert.ok(!h.source.classList.contains('is-catalogue-source'));assert.ok(!replacement.classList.contains('is-catalogue-source'));
  assert.deepEqual({x:h.view.x,y:h.view.y,s:h.view.s},{x:h.initial.x,y:h.initial.y,s:h.initial.s});
 }finally{h.dispose();}
});

await test('Finding a card uses the original viewpoint and draws a tilted outline without a mounted book',async()=>{
 let requested;
 const h=harness({lookup:async(id,origin,options)=>{requested={id,origin,signal:options.signal};return makeBook(id);}});try{
  await h.journey.approach();assert.notEqual(h.view.y,h.initial.y);
  await h.journey.choose(24);
  assert.equal(requested.id,24);assert.equal(requested.origin.x,h.initial.x);assert.equal(requested.origin.y,h.initial.y);assert.equal(requested.origin.seed,17);assert.ok(!requested.signal.aborted);
  assert.equal(h.journey.phase,'found');assert.equal(h.journey.highlightedBook,24);assert.equal(h.found.length,1);assert.equal(h.focused,1);
  const outline=h.drawing.lastElementChild;assert.ok(outline.classList.contains('catalogue-book-highlight'));
  assert.equal(outline.getAttribute('data-book-key'),'fixture-book-24');assert.equal(outline.children.length,2);
  for(const polygon of outline.children){assert.equal(polygon.getAttribute('points'),'150,250 175,225 270,310 245,335');assert.equal(polygon.getAttribute('vector-effect'),'non-scaling-stroke');}
  const incoming=new Node();h.drawing.append(incoming);h.journey.sync();assert.equal(h.drawing.lastElementChild,outline,'highlight remains above detail replacements');
  h.view.seed=99;h.journey.sync();assert.equal(h.journey.highlightedBook,null);assert.ok(!h.drawing.children.includes(outline),'old-world outline removed');
 }finally{h.dispose();}
});

await test('Reset cancels approach and prevents a late drawer opening',async()=>{
 const h=harness({controlledFlights:true});try{
  const pending=h.journey.approach();assert.equal(h.journey.phase,'approaching');
  h.journey.reset();await assert.rejects(pending,error=>error.name==='AbortError');
  assert.equal(h.journey.phase,'idle');assert.equal(h.button.getAttribute('aria-busy'),'false');assert.ok(!h.source.classList.contains('is-catalogue-source'));assert.ok(h.cancelled>0);
 }finally{h.dispose();}
});

await test('Reset aborts lookup and ignores its eventual result',async()=>{
 const pending=deferred();let signal;
 const h=harness({lookup:(id,origin,options)=>{signal=options.signal;return pending.promise;}});try{
  await h.journey.approach();const choosing=h.journey.choose(9);assert.equal(h.journey.phase,'finding');
  const trips=h.calls.length;h.journey.reset();assert.ok(signal.aborted);pending.resolve(makeBook(9));await choosing;
  assert.equal(h.calls.length,trips);assert.equal(h.found.length,0);assert.equal(h.journey.phase,'idle');assert.equal(h.journey.highlightedBook,null);
 }finally{h.dispose();}
});

await test('Replacing a lookup permits only the latest result to start travel',async()=>{
 const pending=new Map();
 const h=harness({lookup:(id,origin,options)=>{const task={...deferred(),signal:options.signal};pending.set(id,task);return task.promise;}});try{
  await h.journey.approach();const first=h.journey.choose(8),second=h.journey.choose(19);
  assert.ok(pending.get(8).signal.aborted);
  pending.get(19).resolve(makeBook(19));await second;
  pending.get(8).resolve(makeBook(8));await first;
  assert.equal(h.found.length,1);assert.equal(h.found[0].bookId,19);assert.equal(h.journey.highlightedBook,19);assert.equal(h.calls.length,2);
 }finally{h.dispose();}
});

await test('Manual interruption cancels active book travel without creating a late glow',async()=>{
 const h=harness({controlledFlights:true});try{
  const approaching=h.journey.approach();h.calls.at(-1).complete();await approaching;
  const choosing=h.journey.choose(14);await flush();assert.equal(h.journey.phase,'travelling');
  h.journey.interrupt();await choosing;
  assert.equal(h.journey.phase,'idle');assert.equal(h.journey.highlightedBook,null);assert.equal(h.found.length,0);assert.equal(h.button.getAttribute('aria-busy'),'false');
 }finally{h.dispose();}
});

await test('Cancelling after a world change never flies back into the old coordinate system',async()=>{
 const h=harness();try{
  await h.journey.approach();const trips=h.calls.length;h.view.seed=42;await h.journey.cancel();
  assert.equal(h.calls.length,trips);assert.equal(h.journey.phase,'idle');
 }finally{h.dispose();}
});

await test('A failed lookup clears busy state and announces a recoverable result',async()=>{
 const h=harness({lookup:async()=>{throw new Error('fixture failure');}});try{
  await h.journey.approach();await h.journey.choose(5);
  assert.equal(h.journey.phase,'idle');assert.equal(h.button.getAttribute('aria-busy'),'false');assert.equal(h.journey.highlightedBook,null);assert.equal(h.announcements.length,1);
 }finally{h.dispose();}
});

console.log(JSON.stringify({suite:'catalogue journeys',results},null,2));
if(results.some(result=>!result.pass))process.exitCode=1;
