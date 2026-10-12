import {createNanoWriter} from './nano.js';

// One optional reader for the whole library; shelf books gain no extra nodes.
export function createBookReader({onOpen=()=>{},onClose=()=>{},announce=()=>{}}={}) {
 const dialog=document.getElementById('book-reader'),volume=document.getElementById('reader-volume');
 const popup=document.getElementById('book-toast'),writer=createNanoWriter(),nanoStatus=document.getElementById('nano-status'),nanoProgress=document.getElementById('nano-progress');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let offerRevision=0,openingTimer=0,closingTimer=0,turnTimer=0,pendingPage=null,controller=null,sourceBook=null,previousVisibility='',closing=false;
 let offered=null,preparing=null,nanoState='',progressStep=-1,stopped=false;
 const field=id=>document.getElementById(id);

 function cancelOffer(){offerRevision++;offered=null;popup.classList.remove('has-reader-control');popup.querySelector('.book-look-inside')?.remove();}
 function hidePreparation(){if(nanoStatus)nanoStatus.hidden=true;progressStep=-1;}
 function showPreparation(text){if(nanoProgress)nanoProgress.textContent=text;if(nanoStatus)nanoStatus.hidden=false;}
 function downloadProgress(value){
  if(stopped)return;
  const step=Math.floor(value*10)*10;if(step===progressStep)return;progressStep=step;
  showPreparation(step===100?'Preparing on-device stories…':`Downloading on-device stories… ${step}%`);
 }
 function renderOffer(){
  const current=offered;
  if(nanoState!=='available'||!current||current.revision!==offerRevision||popup.hidden||!current.source?.isConnected||dialog.open||popup.querySelector('.book-look-inside'))return;
  const button=document.createElement('button');button.type='button';button.className='book-look-inside';
  button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-controls','book-reader');
  button.innerHTML='<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 5C7 3.5 4 3 2 4v12c3-1 5-.5 8 1 3-1.5 5-2 8-1V4c-2-1-5-.5-8 1Zm0 0v12"/></svg><span>Look Inside</span>';
  button.onclick=e=>{e.stopPropagation();void open(current.book,current.source);};
  popup.classList.add('has-reader-control');popup.append(button);
 }
 function stopActivation(){
  for(const type of ['pointerdown','pointerup','keydown'])globalThis.removeEventListener(type,activateNano);
 }
 function listenForActivation(){
  if(stopped)return;
  for(const type of ['pointerdown','pointerup','keydown'])globalThis.addEventListener(type,activateNano,{passive:true});
 }
 function prepareNano(allowDownload=false){
  if(stopped)return Promise.resolve('unavailable');
  const pending=writer.prepare({allowDownload,onProgress:downloadProgress});
  if(preparing===pending)return pending;
  preparing=pending;
  if(allowDownload&&(nanoState==='downloadable'||nanoState==='downloading'))showPreparation('Preparing on-device stories…');
  void pending.then(state=>{
   if(stopped||preparing!==pending)return;
   preparing=null;nanoState=state;hidePreparation();
   if(state==='available'){stopActivation();renderOffer();}
   else if(state==='unavailable')stopActivation();
   else listenForActivation();
  });
  return pending;
 }
 function activateNano(event){
  if(!event.isTrusted||globalThis.navigator?.userActivation?.isActive!==true)return;
  if(event.type==='pointerdown'&&event.pointerType!=='mouse')return;
  if(event.type==='keydown'&&(event.key==='Escape'||['Shift','Control','Alt','Meta'].includes(event.key)||event.ctrlKey||event.altKey||event.metaKey))return;
  // Activation is transient: retry on a later gesture if an async check outlasts it.
  void prepareNano(true);
 }
 function restoreBook(){
  if(sourceBook){sourceBook.style.visibility=previousVisibility;sourceBook=null;}
 }
 function resetPages(){
  clearTimeout(turnTimer);turnTimer=0;pendingPage=null;
  dialog.classList.remove('is-turning-page','is-story-open');
  field('reader-title-page').setAttribute('aria-hidden','false');field('reader-title-page').inert=false;
  field('reader-story-page').setAttribute('aria-hidden','true');field('reader-story-page').inert=true;
  field('reader-text').textContent='';dialog.setAttribute('aria-labelledby','reader-title');
 }
 function finishTurn(page){
  if(page!==pendingPage||page.operation!==controller||page.operation.signal.aborted||closing||!dialog.open)return;
  clearTimeout(turnTimer);turnTimer=0;pendingPage=null;
  dialog.classList.remove('is-turning-page');dialog.classList.add('is-story-open');
  field('reader-title-page').setAttribute('aria-hidden','true');field('reader-title-page').inert=true;
  field('reader-story-page').setAttribute('aria-hidden','false');field('reader-story-page').inert=false;
  dialog.setAttribute('aria-labelledby','reader-story-heading reader-story-book');
  field('reader-status').textContent='An imagined first page · written on your device';
  announce(`The first page of ${page.book.title} is ready.`);controller=null;
 }
 function turnPage(){
  const page=pendingPage;
  if(!page||turnTimer||dialog.classList.contains('is-opening')||closing||!dialog.open||page.operation!==controller||page.operation.signal.aborted)return;
  if(reduced.matches){finishTurn(page);return;}
  field('reader-status').textContent='Turning to the story…';dialog.classList.add('is-turning-page');
  turnTimer=setTimeout(()=>finishTurn(page),850);
 }
 function finishOpening(){
  openingTimer=0;dialog.classList.remove('is-opening');
  if(dialog.open&&!closing){dialog.classList.add('is-open');turnPage();}
 }
 function finishClose(){
  clearTimeout(openingTimer);clearTimeout(closingTimer);openingTimer=closingTimer=0;
  controller?.abort();controller=null;writer.dispose();restoreBook();closing=false;
  resetPages();
  dialog.classList.remove('is-opening','is-open','is-returning');
  onClose();
 }
 function close(immediate=false){
  if(!dialog.open)return;
  if(closing&&!immediate)return;
  closing=true;controller?.abort();writer.dispose();clearTimeout(openingTimer);clearTimeout(turnTimer);turnTimer=0;pendingPage=null;
  dialog.classList.remove('is-opening','is-open');dialog.classList.add('is-returning');
  const done=()=>{if(dialog.open)dialog.close();};
  if(immediate||reduced.matches)done();else closingTimer=setTimeout(done,250);
 }
 function snapshot(source){
  if(!source?.isConnected)return null;
  const rect=source.getBoundingClientRect(),matrix=source.getScreenCTM?.();
  const cover=source.querySelector(':scope > path[fill]')||source.querySelector('.motif-gardenbook > .book-cover')||source.querySelector('path[fill]');
  const fill=cover?.getAttribute('fill'),color=/^#[\da-f]{3,8}$/i.test(fill||'')?fill:'#13b7a6';
  return{rect,color,angle:matrix?Math.atan2(matrix.b,matrix.a)*180/Math.PI:Number(source.dataset.angle)||0};
 }
 function coverInk(color){
  const hex=color.slice(1),rgb=hex.length===3?[...hex].map(n=>parseInt(n+n,16)):[hex.slice(0,2),hex.slice(2,4),hex.slice(4,6)].map(n=>parseInt(n,16));
  const luminance=rgb.map(n=>{const s=n/255;return s<=.04045?s/12.92:((s+.055)/1.055)**2.4;}).reduce((s,n,i)=>s+n*[.2126,.7152,.0722][i],0);
  return luminance<.23?'#fff8df':'#201c23';
 }
 async function open(book,source){
  if(dialog.open)return;
  const appearance=snapshot(source);if(!appearance)return;
  cancelOffer();resetPages();
  controller=new AbortController();const operation=controller;
  for(const id of ['reader-title','reader-cover-title','reader-inside-title','reader-story-book'])field(id).textContent=book.title;
  field('reader-description').textContent=book.blurb;
  field('reader-credit').textContent=`A little twist on ${book.original} · ${book.author}`;
  field('reader-status').textContent='Writing the first page…';
  dialog.style.setProperty('--cover-color',appearance.color);dialog.style.setProperty('--cover-ink',coverInk(appearance.color));
  dialog.showModal();
  // Measure the untransformed, open layout before starting the CSS pull animation.
  const target=volume.getBoundingClientRect(),origin={x:target.left+target.width*.75,y:target.top+target.height*.5};
  const from={x:appearance.rect.left+appearance.rect.width/2-origin.x,y:appearance.rect.top+appearance.rect.height/2-origin.y};
  dialog.style.setProperty('--book-from-x',`${from.x}px`);dialog.style.setProperty('--book-from-y',`${from.y}px`);
  dialog.style.setProperty('--book-from-scale',String(Math.max(.025,Math.min(.65,appearance.rect.height/Math.max(1,target.height)))));
  dialog.style.setProperty('--book-from-angle',`${appearance.angle}deg`);
  sourceBook=source;previousVisibility=source.style.visibility;source.style.visibility='hidden';
  dialog.classList.add(reduced.matches?'is-open':'is-opening');onOpen();
  if(!reduced.matches)openingTimer=setTimeout(finishOpening,1100);
  try{
   const result=await writer.write(book,{signal:operation.signal});
   if(operation!==controller||operation.signal.aborted||!dialog.open)return;
   field('reader-text').textContent=result.text;
   pendingPage={book,operation};turnPage();
  }catch(error){
   if(operation!==controller||operation.signal.aborted||!dialog.open)return;
   field('reader-status').textContent='The writer couldn’t finish this page. This is the book’s little catalog story.';
   announce('The book’s catalog story is shown because the first page could not be written.');
  }finally{if(operation===controller&&!pendingPage)controller=null;}
 }
 async function offer(book,source){
  cancelOffer();const revision=offerRevision;
  offered={book,source,revision};
  // An open explanation can gain its control when the eager preparation finishes.
  await prepareNano();
  if(revision===offerRevision)renderOffer();
 }
 field('reader-close').onclick=()=>close();
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 dialog.addEventListener('close',finishClose);
 dialog.addEventListener('click',e=>{if(e.target===dialog){const r=dialog.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}});
 reduced.addEventListener('change',e=>{if(e.matches){clearTimeout(openingTimer);openingTimer=0;dialog.classList.remove('is-opening');if(dialog.open&&!closing){dialog.classList.add('is-open');if(pendingPage)finishTurn(pendingPage);}if(closing)close(true);}});
 globalThis.addEventListener('pagehide',()=>{stopped=true;stopActivation();cancelOffer();close(true);writer.dispose();hidePreparation();});
 globalThis.addEventListener('pageshow',event=>{
  if(!event.persisted)return;
  stopped=false;preparing=null;nanoState='';listenForActivation();void prepareNano();
 });
 // Start before the initial shelves are rendered; a ready model needs no gesture.
 listenForActivation();void prepareNano();
 return{offer,cancelOffer,close};
}
