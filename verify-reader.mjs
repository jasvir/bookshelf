import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {createBookReader} from './book-reader.js';
import {motif} from './motifs.js';

// These tiny DOM stubs exercise the real reader and Nano lifecycle. Native
// dialog focus, SVG paint, and CSS animation are checked in the browser.
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return{promise,resolve,reject};};
const first={title:'The Great Catsby',original:'The Great Gatsby',author:'F. Scott Fitzgerald',blurb:'A cat hosts moonlit mouse parties.'};
const second={title:'War and Peas',original:'War and Peace',author:'Leo Tolstoy',blurb:'Two vegetables settle a garden dispute.'};
const prose='The mice arrived wearing tiny waistcoats, and Catsby welcomed every one of them.';

async function harness(api,run,{reducedMotion=false}={}){
 const names=['document','matchMedia','LanguageModel','navigator','setTimeout','clearTimeout','addEventListener','removeEventListener'];
 const originals=names.map(name=>[name,Object.getOwnPropertyDescriptor(globalThis,name)]);
 const elements=new Map(),timers=new Map(),browser=new EventTarget(),media=new EventTarget();
 let nextTimer=1,now=0;
 class Element extends EventTarget{
  constructor(id=''){super();this.id=id;this.children=[];this.hidden=false;this.inert=false;this.isConnected=true;this.dataset={};this.attributes=new Map();this.classNames=new Set();this.classList={add:(...names)=>names.forEach(name=>this.classNames.add(name)),remove:(...names)=>names.forEach(name=>this.classNames.delete(name)),contains:name=>this.classNames.has(name),toggle:(name,on)=>{const add=on===undefined?!this.classNames.has(name):on;add?this.classNames.add(name):this.classNames.delete(name);return add;}};this.style={visibility:'',setProperty:(name,value)=>{this.style[name]=value;}};this.rect={left:100,top:200,width:400,height:300};this.open=false;this.textContent='';}
  get className(){return [...this.classNames].join(' ');}
  set className(value){this.classNames=new Set(value.split(/\s+/));}
  setAttribute(name,value){this.attributes.set(name,String(value));if(name==='inert')this.inert=true;}
  getAttribute(name){return this.attributes.get(name)??null;}
  removeAttribute(name){this.attributes.delete(name);if(name==='inert')this.inert=false;}
  querySelector(selector){return selector==='.book-look-inside'?this.children.find(child=>child.classList.contains('book-look-inside'))||null:null;}
  append(node){node.parent=this;this.children.push(node);}
  remove(){if(this.parent)this.parent.children=this.parent.children.filter(child=>child!==this);this.isConnected=false;}
  getBoundingClientRect(){return this.rect;}
  showModal(){this.open=true;}
  close(){this.open=false;this.dispatchEvent(new Event('close'));}
 }
 const el=id=>{if(!elements.has(id))elements.set(id,new Element(id));return elements.get(id);};
 const document=new EventTarget();Object.assign(document,{getElementById:el,createElement:()=>new Element(),hidden:false,visibilityState:'visible'});
 el('reader-title-page').setAttribute('aria-hidden','false');el('reader-story-page').setAttribute('aria-hidden','true');el('reader-story-page').inert=true;
 el('reader-story-heading').textContent='The First Page';
 media.matches=reducedMotion;
 const activation={isActive:false,hasBeenActive:false};
 const assign=(name,value)=>Object.defineProperty(globalThis,name,{value,configurable:true,writable:true});
 assign('document',document);assign('matchMedia',()=>media);assign('LanguageModel',api);assign('navigator',{userActivation:activation});
 globalThis.setTimeout=(callback,delay=0)=>{const id=nextTimer++;timers.set(id,{callback,delay,due:now+delay});return id;};
 globalThis.clearTimeout=id=>timers.delete(id);
 globalThis.addEventListener=browser.addEventListener.bind(browser);
 globalThis.removeEventListener=browser.removeEventListener.bind(browser);
 const events={opened:0,closed:0,announcements:[]};
 const reader=createBookReader({onOpen(){events.opened++;el('book-toast').hidden=true;},onClose(){events.closed++;},announce:value=>events.announcements.push(value)});
 const source=({color='#4965d4',angle=0,visibility=''}={})=>{
  const node=new Element();node.rect={left:30,top:80,width:25,height:150};node.style.visibility=visibility;
  node.dataset.angle=String(angle);node.getScreenCTM=()=>({a:Math.cos(angle*Math.PI/180),b:Math.sin(angle*Math.PI/180)});
  const path=new Element();path.setAttribute('fill',color);node.querySelector=selector=>selector===':scope > path[fill]'?path:null;
  return node;
 };
 const button=()=>el('book-toast').querySelector('.book-look-inside');
 const click=()=>{assert.ok(button(),'Look Inside must be offered');button().onclick({stopPropagation(){}});};
 const advance=(milliseconds=250)=>{now+=milliseconds;for(const [id,{callback,due}]of [...timers]){if(!timers.has(id)||due>now)continue;timers.delete(id);callback();}};
 const gesture=(type,{trusted=true,pointerType='mouse',key='a',active=true}={})=>{
  activation.isActive=active;activation.hasBeenActive||=active;
  const event=new Event(type);for(const [name,value]of Object.entries({isTrusted:trusted,pointerType,key}))Object.defineProperty(event,name,{value,configurable:true});
  browser.dispatchEvent(event);return event;
 };
 const setReduced=value=>{media.matches=value;const event=new Event('change');Object.defineProperty(event,'matches',{value});media.dispatchEvent(event);};
 try{await tick();await run({reader,el,source,button,click,advance,gesture,setReduced,activation,document,events,timers,browser,media});}
 finally{
  browser.dispatchEvent(new Event('pagehide'));
  reader.close(true);
  for(const [name,descriptor]of originals){if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];}
 }
}

function model(state='available'){
 const calls={created:0,prompted:0,destroyed:0};
 const api={availability:async()=>state,create:async()=>{calls.created++;return{prompt:async()=>{calls.prompted++;return prose;},destroy(){calls.destroyed++;}};}};
 return{api,calls};
}

function assertPages(h,storyOpen){
 const title=h.el('reader-title-page'),story=h.el('reader-story-page');
 assert.equal(title.getAttribute('aria-hidden'),String(storyOpen));assert.equal(title.inert,storyOpen);
 assert.equal(story.getAttribute('aria-hidden'),String(!storyOpen));assert.equal(story.inert,!storyOpen);
 assert.equal(h.el('book-reader').classList.contains('is-story-open'),storyOpen);
 assert.equal(h.el('book-reader').getAttribute('aria-labelledby'),storyOpen?'reader-story-heading reader-story-book':'reader-title');
}

test('only the generated story page is headed The First Page in the document',()=>{
 const html=readFileSync(new URL('./index.html',import.meta.url),'utf8');
 assert.match(html,/<h2\b[^>]*\bid="reader-story-heading"[^>]*>\s*The First Page\s*<\/h2>/);
 assert.equal([...html.matchAll(/The\s+First\s+Page/gi)].length,1);
 assert.match(html,/<article\b(?=[^>]*\bid="reader-story-page")(?=[^>]*\baria-hidden="true")(?=[^>]*\binert\b)[^>]*>/);
});

test('fast generated prose waits for the cover, then becomes accessible after the page turn',async()=>{
 const{api,calls}=model();
 await harness(api,async h=>{
  await h.reader.offer(first,h.source());h.click();await tick();
  const dialog=h.el('book-reader');assert.equal(h.el('reader-description').textContent,first.blurb);assert.equal(h.el('reader-title').textContent,first.title);
  assert.equal(h.el('reader-story-book').textContent,first.title);assert.equal(h.el('reader-text').textContent,prose);assertPages(h,false);
  assert.equal(dialog.classList.contains('is-opening'),true);assert.equal(dialog.classList.contains('is-turning-page'),false);assert.deepEqual(h.events.announcements,[]);
  h.advance(1099);assert.equal(dialog.classList.contains('is-turning-page'),false);h.advance(1);
  assert.equal(dialog.classList.contains('is-opening'),false);assert.equal(dialog.classList.contains('is-turning-page'),true);assertPages(h,false);
  h.advance(849);assertPages(h,false);assert.deepEqual(h.events.announcements,[]);h.advance(1);
  assert.equal(dialog.classList.contains('is-turning-page'),false);assertPages(h,true);assert.equal(h.el('reader-description').textContent,first.blurb);
  assert.deepEqual(h.events.announcements,[`The first page of ${first.title} is ready.`]);assert.equal(calls.destroyed,1);
 });
});

test('cached prose also waits for the cover to open before turning the title leaf',async()=>{
 const{api,calls}=model();
 await harness(api,async h=>{
  await h.reader.offer(first,h.source());h.click();await tick();h.advance(1100);h.advance(850);h.reader.close(true);
  h.el('book-toast').hidden=false;await h.reader.offer(first,h.source());const prompted=calls.prompted;h.click();await tick();
  assert.equal(calls.prompted,prompted);assertPages(h,false);assert.equal(h.el('book-reader').classList.contains('is-turning-page'),false);
  h.advance(1100);assert.equal(h.el('book-reader').classList.contains('is-turning-page'),true);h.advance(850);assertPages(h,true);
  assert.equal(h.el('reader-description').textContent,first.blurb);assert.equal(h.el('reader-text').textContent,prose);
 });
});

test('slow prose leaves the title and description intact until it can turn to the story',async()=>{
 const gate=deferred(),{api,calls}=model();api.create=async()=>{calls.created++;return{prompt:()=>gate.promise,destroy(){calls.destroyed++;}};};
 await harness(api,async h=>{
  await h.reader.offer(first,h.source());h.click();await tick();h.advance(1100);
  assertPages(h,false);assert.equal(h.el('book-reader').classList.contains('is-turning-page'),false);assert.equal(h.el('reader-description').textContent,first.blurb);assert.equal(h.el('reader-text').textContent,'');
  gate.resolve(prose);await tick();assert.equal(h.el('book-reader').classList.contains('is-turning-page'),true);assertPages(h,false);
  h.advance(850);assertPages(h,true);assert.equal(h.el('reader-text').textContent,prose);assert.equal(h.el('reader-description').textContent,first.blurb);
 });
});

test('failed generation keeps the catalog description and never turns a page',async()=>{
 const{api,calls}=model();api.create=async()=>{calls.created++;return{prompt:async()=>{throw new DOMException('Model stopped.','OperationError');},destroy(){calls.destroyed++;}};};
 await harness(api,async h=>{
  await h.reader.offer(first,h.source());h.click();await tick();h.advance(1100);h.advance(850);
  assertPages(h,false);assert.equal(h.el('reader-description').textContent,first.blurb);assert.equal(h.el('reader-text').textContent,'');assert.equal(h.el('book-reader').classList.contains('is-turning-page'),false);
  assert.equal(calls.destroyed,1);assert.equal(h.events.announcements.some(value=>value===`The first page of ${first.title} is ready.`),false);
 });
});

test('closing before or during a turn cancels page timers and clears generated content',async()=>{
 for(const phase of ['waiting-cover','turning','story-open']){
  const{api}=model();
  await harness(api,async h=>{
   const source=h.source();await h.reader.offer(first,source);h.click();await tick();
   if(phase!=='waiting-cover')h.advance(1100);if(phase==='story-open')h.advance(850);
   const announced=h.events.announcements.length;h.reader.close(true);h.advance(3000);
   assert.equal(h.el('book-reader').open,false);assertPages(h,false);assert.equal(h.el('book-reader').classList.contains('is-turning-page'),false);
   assert.equal(h.el('reader-text').textContent,'');assert.equal(source.style.visibility,'');assert.equal(h.timers.size,0);assert.equal(h.events.announcements.length,announced);
  });
 }
});

test('reduced motion reveals generated prose immediately and preference changes finish a turn',async()=>{
 const{api}=model();
 await harness(api,async h=>{
  await h.reader.offer(first,h.source());h.click();await tick();assertPages(h,true);assert.equal(h.el('book-reader').classList.contains('is-opening'),false);assert.equal(h.el('book-reader').classList.contains('is-turning-page'),false);
  assert.equal(h.timers.size,0);assert.equal(h.el('reader-description').textContent,first.blurb);assert.equal(h.events.announcements.length,1);
 },{reducedMotion:true});
 for(const phase of ['waiting-cover','turning']){
  await harness(model().api,async h=>{
   await h.reader.offer(first,h.source());h.click();await tick();if(phase==='turning')h.advance(1100);
   h.setReduced(true);assertPages(h,true);assert.equal(h.el('book-reader').classList.contains('is-opening'),false);assert.equal(h.el('book-reader').classList.contains('is-turning-page'),false);assert.equal(h.timers.size,0);
   h.advance(3000);assert.equal(h.events.announcements.length,1);
  });
 }
});

test('Look Inside appears only after a model is ready; popup checks do not generate prose',async()=>{
 for(const state of ['available','downloadable','downloading','unavailable','unexpected']){
  const{api,calls}=model(state);
  const ready=state==='available'||state==='downloading';
  await harness(api,async h=>{await h.reader.offer(first,h.source());assert.equal(Boolean(h.button()),ready);assert.equal(calls.created,ready?1:0);assert.equal(calls.prompted,0);});
 }
 for(const api of [undefined,{}, {availability:async()=>{throw Error('Unsupported');},create(){throw Error('Must not create');}}]){
  await harness(api,async h=>{await h.reader.offer(first,h.source());assert.equal(h.button(),null);});
 }
});

test('an ongoing download is joined at startup without waiting for another gesture',async()=>{
 const gate=deferred(),{api,calls}=model('downloading');api.create=()=>{calls.created++;return gate.promise;};
 await harness(api,async h=>{
  assert.equal(calls.created,1);assert.equal(h.activation.isActive,false);const offer=h.reader.offer(first,h.source());assert.equal(h.button(),null);
  gate.resolve({prompt:async()=>{calls.prompted++;return prose;},destroy(){calls.destroyed++;}});await offer;await tick();
  assert.ok(h.button());assert.equal(calls.created,1);assert.equal(calls.prompted,0);
 });
});

test('older browsers that require a gesture for an ongoing download remain retryable',async()=>{
 const{api,calls}=model('downloading');api.create=async()=>{
  calls.created++;if(!globalThis.navigator.userActivation.isActive)throw new DOMException('A gesture is required.','NotAllowedError');
  return{prompt:async()=>{calls.prompted++;return prose;},destroy(){calls.destroyed++;}};
 };
 await harness(api,async h=>{
  assert.equal(calls.created,1);assert.equal(calls.prompted,0);assert.equal(h.button(),null);h.gesture('keydown');await tick();assert.equal(calls.created,2);
  await h.reader.offer(first,h.source());assert.ok(h.button());assert.equal(calls.prompted,0);
 });
});

test('startup prepares a ready model before any book interaction and consumes it once',async()=>{
 const{api,calls}=model();
 await harness(api,async h=>{
  assert.equal(calls.created,1);assert.equal(calls.prompted,0);assert.equal(calls.destroyed,0);
  await h.reader.offer(first,h.source());h.click();await tick();
  assert.equal(calls.created,1);assert.equal(calls.prompted,1);assert.equal(calls.destroyed,1);assert.equal(h.el('reader-text').textContent,prose);
 });
});

test('download waits for a trusted activating gesture, including touch release and keyboard',async()=>{
 for(const activating of [{type:'pointerdown',pointerType:'mouse'},{type:'pointerup',pointerType:'touch'},{type:'keydown',key:'a'}]){
  const{api,calls}=model('downloadable');
  await harness(api,async h=>{
   assert.equal(calls.created,0);
   h.gesture('pointerdown',{trusted:false,active:true});await tick();assert.equal(calls.created,0);
   h.gesture('pointerdown',{pointerType:'touch',active:false});h.gesture('keydown',{key:'Escape',active:false});await tick();assert.equal(calls.created,0);
   h.gesture(activating.type,activating);await tick();assert.equal(calls.created,1);assert.equal(calls.prompted,0);
  });
 }
});

test('download completion adds Look Inside to the current popup without another click',async()=>{
 const gate=deferred(),{api,calls}=model('downloadable');let state='downloadable';api.availability=async()=>state;
 api.create=options=>{calls.created++;state='downloading';const monitor=new EventTarget();options.monitor(monitor);const progress=new Event('downloadprogress');progress.loaded=.42;monitor.dispatchEvent(progress);return gate.promise;};
 await harness(api,async h=>{
  const source=h.source();await h.reader.offer(first,source);assert.equal(h.button(),null);
  h.gesture('pointerdown');await tick();assert.equal(calls.created,1);assert.equal(h.button(),null);
  const newer=h.reader.offer(second,source);state='available';gate.resolve({prompt:async()=>{calls.prompted++;return prose;},destroy(){calls.destroyed++;}});await newer;await tick();
  assert.ok(h.button());assert.equal(calls.prompted,0);h.click();await tick();assert.equal(h.el('reader-title').textContent,second.title);assert.equal(calls.created,1);assert.equal(calls.prompted,1);
 });
});

test('preparation completion cannot revive a canceled popup offer',async()=>{
 const gate=deferred(),{api}=model('downloadable');api.create=()=>gate.promise;
 await harness(api,async h=>{
  await h.reader.offer(first,h.source());h.gesture('pointerdown');await tick();h.reader.cancelOffer();
  gate.resolve({prompt:async()=>prose,destroy(){}});await tick();assert.equal(h.button(),null);
 });
});

test('expired activation leaves preparation retryable for the next trusted gesture',async()=>{
 const gate=deferred(),{api,calls}=model('downloadable');
 await harness(api,async h=>{
  api.availability=()=>gate.promise;h.gesture('pointerdown');h.activation.isActive=false;gate.resolve('downloadable');await tick();assert.equal(calls.created,0);
  api.availability=async()=>'downloadable';h.gesture('keydown');await tick();assert.equal(calls.created,1);
 });
});

test('activation rejected inside native create also leaves a new download retryable',async()=>{
 const gate=deferred(),{api,calls}=model('downloadable');api.create=()=>{
  if(++calls.created===1)return gate.promise;
  return Promise.resolve({prompt:async()=>{calls.prompted++;return prose;},destroy(){calls.destroyed++;}});
 };
 await harness(api,async h=>{
  h.gesture('pointerdown');await tick();assert.equal(calls.created,1);h.activation.isActive=false;
  gate.reject(new DOMException('Activation expired during native setup.','NotAllowedError'));await tick();
  h.gesture('keydown');await tick();assert.equal(calls.created,2);await h.reader.offer(first,h.source());assert.ok(h.button());assert.equal(calls.prompted,0);
 });
});

test('Home-style closing with no open dialog preserves pending eager preparation',async()=>{
 const gate=deferred(),{api,calls}=model();api.create=()=>{calls.created++;return gate.promise;};
 await harness(api,async h=>{
  assert.equal(calls.created,1);h.reader.close(true);h.reader.cancelOffer();
  gate.resolve({prompt:async()=>{calls.prompted++;return prose;},destroy(){calls.destroyed++;}});await tick();assert.equal(calls.destroyed,0);
  await h.reader.offer(first,h.source());h.click();await tick();assert.equal(calls.created,1);assert.equal(calls.prompted,1);assert.equal(calls.destroyed,1);
 });
});

test('page navigation aborts eager preparation and destroys a late warm session',async()=>{
 const gate=deferred(),{api,calls}=model();api.create=()=>{calls.created++;return gate.promise;};
 await harness(api,async h=>{
  assert.equal(calls.created,1);h.browser.dispatchEvent(new Event('pagehide'));
  gate.resolve({prompt(){calls.prompted++;},destroy(){calls.destroyed++;}});await tick();
  assert.equal(calls.destroyed,1);assert.equal(calls.prompted,0);assert.equal(h.timers.size,0);
 });
});

test('restoring a cached page prepares a fresh model and keeps Look Inside usable',async()=>{
 const{api,calls}=model();
 await harness(api,async h=>{
  assert.equal(calls.created,1);h.browser.dispatchEvent(new Event('pagehide'));await tick();assert.equal(calls.destroyed,1);
  const restored=new Event('pageshow');Object.defineProperty(restored,'persisted',{value:true});h.browser.dispatchEvent(restored);await tick();
  assert.equal(calls.created,2);assert.equal(calls.destroyed,1);await h.reader.offer(first,h.source());h.click();await tick();
  assert.equal(h.el('reader-text').textContent,prose);assert.equal(calls.prompted,1);assert.equal(calls.destroyed,2);
 });
});

test('a late readiness check cannot attach an older book to a newer popup',async()=>{
 const gate=deferred(),{api,calls}=model();api.availability=()=>gate.promise;
 await harness(api,async h=>{
  const older=h.reader.offer(first,h.source()),newer=h.reader.offer(second,h.source());gate.resolve('available');await Promise.all([older,newer]);
  assert.equal(h.el('book-toast').children.length,1);h.click();await tick();
  assert.equal(h.el('reader-title').textContent,second.title);assert.equal(calls.created,1);assert.equal(calls.destroyed,1);
 });
});

test('canceled, hidden, and disconnected popup offers ignore late availability',async()=>{
 for(const reason of ['cancel','hide','disconnect']){
  const gate=deferred(),{api}=model();api.availability=()=>gate.promise;
  await harness(api,async h=>{
   const source=h.source(),pending=h.reader.offer(first,source);
   if(reason==='cancel')h.reader.cancelOffer();if(reason==='hide')h.el('book-toast').hidden=true;if(reason==='disconnect')source.isConnected=false;
   gate.resolve('available');await pending;assert.equal(h.button(),null);
  });
 }
});

test('the cover matches the selected spine, including ancestor rotation and prior visibility',async()=>{
 const{api,calls}=model();
 await harness(api,async h=>{
  const source=h.source({color:'#ab4dc4',angle:90,visibility:'collapse'});source.dataset.angle='12';
  await h.reader.offer(first,source);h.click();await tick();
  const dialog=h.el('book-reader');assert.equal(dialog.style['--cover-color'],'#ab4dc4');assert.equal(dialog.style['--book-from-angle'],'90deg');
  assert.equal(h.el('reader-cover-title').textContent,first.title);assert.equal(h.el('reader-inside-title').textContent,first.title);
  assert.equal(source.style.visibility,'hidden');assert.equal(h.el('reader-text').textContent,prose);assert.equal(calls.destroyed,1);
  h.reader.close(true);assert.equal(source.style.visibility,'collapse');assert.equal(dialog.open,false);assert.equal(h.timers.size,0);
 });
});

test('the illustrated garden book retains its magenta cover at every detail level',async()=>{
 for(const quality of ['full','compact','distant','preview']){
  const paths=[...motif('gardenbook',0,0,1,17,quality).matchAll(/<path\b[^>]*>/g)].map(match=>match[0]);
  const cover=paths.filter(path=>/\bclass="[^"]*\bbook-cover\b/.test(path));
  assert.equal(cover.length,1,`${quality} must mark the actual garden cover`);
  const color=cover[0].match(/\bfill="([^"]+)"/)?.[1];assert.equal(color,'#b04f70');
  const{api}=model();
  await harness(api,async h=>{
   const source=h.source(),path={getAttribute:name=>name==='fill'?color:null};
   source.querySelector=selector=>selector==='.motif-gardenbook > .book-cover'?path:null;
   await h.reader.offer(first,source);h.click();await tick();assert.equal(h.el('book-reader').style['--cover-color'],color);
  });
 }
});

test('Escape cancels inference and stale prose cannot overwrite a different open book',async()=>{
 const gate=deferred(),{api,calls}=model();
 api.create=async()=>{const number=++calls.created;return{prompt:()=>{calls.prompted++;return number===1?gate.promise:Promise.resolve('Fresh peas marched onto the page.');},destroy(){calls.destroyed++;}};};
 await harness(api,async h=>{
  const source=h.source();await h.reader.offer(first,source);h.click();await tick();
  const cancel=new Event('cancel',{cancelable:true});h.el('book-reader').dispatchEvent(cancel);assert.equal(cancel.defaultPrevented,true);h.advance();
  assert.equal(calls.destroyed,1);assert.equal(source.style.visibility,'');assert.equal(h.el('book-reader').open,false);
  h.el('book-toast').hidden=false;await h.reader.offer(second,h.source({color:'#dd693e'}));h.click();await tick();
  gate.resolve('Stale Catsby output.');await tick();
  assert.equal(h.el('reader-text').textContent,'Fresh peas marched onto the page.');assert.equal(h.el('reader-title').textContent,second.title);
  h.advance(1100);h.advance(850);
  assert.equal(calls.destroyed,2);assert.deepEqual(h.events.announcements,[`The first page of ${second.title} is ready.`]);
 });
});

test('a model that stops being ready after the offer never starts a download',async()=>{
 for(const state of ['downloadable','downloading','unavailable']){
  const{api,calls}=model();
  await harness(api,async h=>{await h.reader.offer(first,h.source());h.advance(90000);api.availability=async()=>state;h.click();await tick();assert.equal(calls.created,1,'Only the original startup preparation created a session.');assert.equal(calls.prompted,0);assert.equal(h.el('reader-description').textContent,first.blurb);assert.equal(h.el('reader-text').textContent,'');assertPages(h,false);assert.match(h.el('reader-status').textContent,/catalog story/);});
 }
});

test('reduced motion opens and closes immediately; page navigation releases the reader',async()=>{
 const gate=deferred(),{api,calls}=model();api.create=async()=>{calls.created++;return{prompt:()=>gate.promise,destroy(){calls.destroyed++;}};};
 await harness(api,async h=>{
  const source=h.source();await h.reader.offer(first,source);h.click();await tick();assert.equal(h.el('book-reader').classList.contains('is-open'),true);
  assert.equal(h.el('book-reader').classList.contains('is-opening'),false);h.browser.dispatchEvent(new Event('pagehide'));await tick();
  assert.equal(h.el('book-reader').open,false);assert.equal(source.style.visibility,'');assert.equal(h.button(),null);assert.equal(h.timers.size,0);assert.equal(calls.destroyed,1);
  gate.resolve(prose);await tick();assert.equal(h.events.announcements.length,0);
 },{reducedMotion:true});
});
