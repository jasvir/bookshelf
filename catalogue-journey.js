// Camera journeys use procedural positions, not the subset of books currently
// mounted in the SVG. The one glowing outline survives detail-level swaps.
const SVG_NS='http://www.w3.org/2000/svg';
const cancelled=()=>new DOMException('The catalogue journey was cancelled.','AbortError');

export function nearestCatalogueDrawer(view,getDrawers,tileWidth=1080,tileHeight=1120){
 const left=view.x-view.w/(2*view.s),top=view.y-view.h/(2*view.s);
 const right=left+view.w/view.s,bottom=top+view.h/view.s;
 const candidates=[];
 for(let ty=Math.floor(top/tileHeight);ty<=Math.floor(bottom/tileHeight);ty++){
  for(let tx=Math.floor(left/tileWidth);tx<=Math.floor(right/tileWidth);tx++){
   for(const drawer of getDrawers(tx,ty,view.seed)){
    if(drawer.x+drawer.w>left&&drawer.y+drawer.h>top&&drawer.x<right&&drawer.y<bottom)candidates.push(drawer);
   }
  }
 }
 // A very close view can contain no drawer. Nearby bays provide a destination
 // without changing the library or making the reader zoom back out manually.
 if(!candidates.length){
  const cx=Math.floor(view.x/tileWidth),cy=Math.floor(view.y/tileHeight);
  for(let ty=cy-2;ty<=cy+2;ty++)for(let tx=cx-2;tx<=cx+2;tx++)candidates.push(...getDrawers(tx,ty,view.seed));
 }
 candidates.sort((a,b)=>Math.hypot(a.x+a.w/2-view.x,a.y+a.h/2-view.y)-Math.hypot(b.x+b.w/2-view.x,b.y+b.h/2-view.y)||a.y-b.y||a.x-b.x);
 return candidates[0]||null;
}

export function createCatalogueJourney({getView,getDrawers,findNearestBook,flyTo,cancelFlight,requestDraw,announce=()=>{},onFound=()=>{},drawing,stage,button}){
 let origin=null,drawer=null,phase='idle',revision=0,lookup=null,highlight=null;
 const hiddenSources=new Set();
 let outline=null;
 function busy(value){button?.setAttribute('aria-busy',String(value));}
 function showSources(){for(const source of hiddenSources)source.classList.remove('is-catalogue-source');hiddenSources.clear();}
 function clearOutline(){outline?.remove();outline=null;highlight=null;}
 function attach(root){
  if(!drawer||phase!=='open')return;
  for(const node of root.querySelectorAll('.catalogue-drawer'))if(node.getAttribute('data-catalogue')===drawer.key){node.classList.add('is-catalogue-source');hiddenSources.add(node);}
 }
 function sync(){
  const view=getView();
  if(highlight&&highlight.seed!==view.seed)clearOutline();
  if(outline&&outline.parentNode!==drawing)drawing.append(outline);
  else if(outline&&drawing.lastElementChild!==outline)drawing.append(outline);
 }
 function reset(){
  revision++;lookup?.abort();lookup=null;
  if(phase==='approaching'||phase==='travelling')cancelFlight();
  phase='idle';origin=null;drawer=null;showSources();clearOutline();busy(false);
 }
 function interrupt(){
  if(phase==='finding'||phase==='travelling'){revision++;lookup?.abort();lookup=null;cancelFlight();phase='idle';origin=null;busy(false);}
 }
 async function approach(){
  reset();const token=revision,view={...getView()};origin=view;
  drawer=nearestCatalogueDrawer(view,getDrawers);
  if(!drawer){origin=null;throw new Error('No catalogue drawer could be found.');}
  phase='approaching';busy(true);
  const scale=Math.min(6,Math.max(.4,Math.min(view.w*.66,420)/drawer.w));
  // Leave room above the drawer for the cards to fan out when it opens.
  const completed=await flyTo(drawer.x+drawer.w/2,drawer.y+drawer.h/2-view.h*.10/scale,scale,850);
  if(token!==revision||!completed){if(token===revision){phase='idle';busy(false);}throw cancelled();}
  phase='open';busy(false);attach(drawing);
  const current=getView(),rect=stage.getBoundingClientRect();
  return{x:rect.left+(drawer.x-current.x)*current.s+current.w/2,y:rect.top+(drawer.y-current.y)*current.s+current.h/2,width:drawer.w*current.s,height:drawer.h*current.s};
 }
 async function cancel(){
  const previous=origin;revision++;lookup?.abort();lookup=null;
  if(phase==='approaching'||phase==='travelling')cancelFlight();
  phase='idle';origin=null;drawer=null;showSources();busy(false);
  const view=getView();
  if(previous&&previous.seed===view.seed&&previous.depth===view.depth){await flyTo(previous.x,previous.y,previous.s,600);}
 }
 function drawHighlight(book){
  clearOutline();highlight=book;
  const corners=book.corners||book.points;
  if(!Array.isArray(corners)||corners.length<4)return;
  outline=document.createElementNS(SVG_NS,'g');outline.classList.add('catalogue-book-highlight');
  outline.setAttribute('aria-hidden','true');outline.setAttribute('pointer-events','none');outline.setAttribute('data-book',String(book.bookId));
  outline.setAttribute('data-book-key',book.occurrenceKey||'');
  const points=corners.map(point=>Array.isArray(point)?point.join(','):`${point.x},${point.y}`).join(' ');
  for(const kind of ['glow','outline']){
   const polygon=document.createElementNS(SVG_NS,'polygon');polygon.classList.add(`catalogue-book-${kind}`);
   polygon.setAttribute('points',points);polygon.setAttribute('fill','none');polygon.setAttribute('vector-effect','non-scaling-stroke');
   polygon.setAttribute('stroke',kind==='glow'?'#ffe28a':'#fff5c0');polygon.setAttribute('stroke-width',kind==='glow'?'7':'2.5');polygon.setAttribute('stroke-linejoin','round');
   outline.append(polygon);
  }
  drawing.append(outline);requestDraw();
 }
 async function choose(bookId){
  const previous=origin||{...getView()},token=++revision;
  lookup?.abort();lookup=new AbortController();const signal=lookup.signal;
  showSources();drawer=null;phase='finding';busy(true);
  try{
   const book=await findNearestBook(bookId,previous,{signal});
   if(token!==revision||signal.aborted)return;
   if(!book)throw new Error('That volume could not be located.');
   const view=getView();if(view.seed!==previous.seed)return;
   phase='travelling';
   const bounds=book.bounds||{x:book.x-book.w/2,y:book.y-book.h/2,w:book.w,h:book.h};
   const width=bounds.w??bounds.width,height=bounds.h??bounds.height;
   const scale=Math.min(9,Math.max(1.15,Math.min(view.w*.45/Math.max(1,width),view.h*.58/Math.max(1,height))));
   const completed=await flyTo(book.x,book.y,scale,1050);
   if(token!==revision||signal.aborted||!completed)return;
   phase='found';origin=null;lookup=null;busy(false);drawHighlight(book);
   stage.focus({preventScroll:true});onFound(book);
  }catch(error){
   if(token!==revision||signal.aborted||error?.name==='AbortError')return;
   phase='idle';busy(false);announce('That card slipped out of place. Please try searching again.');
  }finally{
   if(token===revision&&phase!=='found'){lookup=null;origin=null;phase='idle';busy(false);}
  }
 }
 return{approach,choose,cancel,reset,interrupt,sync,attach,get phase(){return phase;},get highlightedBook(){return highlight?.bookId??null;}};
}
