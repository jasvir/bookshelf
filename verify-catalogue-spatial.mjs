import assert from 'node:assert/strict';
import {W,H,BOOK_TILE_HALO,tileMarkup,previewMarkup,getTileBooks,getDrawers,findNearestBook} from './art.js';
import {BOOKS} from './catalog.js';

// Inspect the controlled SVG produced by this project's generators. Parsing its
// transform stack independently catches divergence between lookup and artwork.
const identity=[1,0,0,1,0,0];
const multiply=(a,b)=>[a[0]*b[0]+a[2]*b[1],a[1]*b[0]+a[3]*b[1],a[0]*b[2]+a[2]*b[3],a[1]*b[2]+a[3]*b[3],a[0]*b[4]+a[2]*b[5]+a[4],a[1]*b[4]+a[3]*b[5]+a[5]];
function parseTransform(value=''){
 let result=identity;
 for(const match of value.matchAll(/([A-Za-z]+)\(([^)]*)\)/g)){
  const values=match[2].trim().split(/[\s,]+/).map(Number),[a,b=0,c=0]=values;let matrix;
  switch(match[1]){
   case 'translate':matrix=[1,0,0,1,a,b];break;
   case 'scale':matrix=[a,0,0,values.length>1?b:a,0,0];break;
   case 'rotate':{const radians=a*Math.PI/180,cos=Math.cos(radians),sin=Math.sin(radians);matrix=[cos,sin,-sin,cos,0,0];if(values.length>1)matrix=multiply(multiply([1,0,0,1,b,c],matrix),[1,0,0,1,-b,-c]);break;}
   case 'matrix':matrix=values;break;
   default:throw new Error(`Unexpected SVG transform ${match[1]}`);
  }
  result=multiply(result,matrix);
 }
 return result;
}
const point=(m,x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});
function scanSVG(source){
 const stack=[{matrix:identity,portal:false,classes:[],shape:null,garden:null}],books=[],drawers=[];
 for(const match of source.matchAll(/<\/?[A-Za-z][^>]*>/g)){
  const token=match[0];if(token.startsWith('</')){assert.ok(stack.length>1,'balanced generated SVG');stack.pop();continue;}
  const attributes=Object.fromEntries([...token.matchAll(/([^\s=]+)\s*=\s*"([^"]*)"/g)].map(match=>[match[1],match[2]]));
  const parent=stack.at(-1),classes=(attributes.class||'').split(/\s+/),matrix=multiply(parent.matrix,parseTransform(attributes.transform));
  const entry={matrix,portal:parent.portal||classes.includes('portal'),classes:[...parent.classes,...classes],shape:attributes['data-room-bounds']?attributes['data-shape']:parent.shape,garden:parent.garden};
  if(!entry.portal){
   if(classes.includes('book')){
    const book={key:attributes['data-book-key'],id:Number(attributes['data-book']),matrix,width:Number(attributes['data-width']),height:Number(attributes['data-height']),shape:entry.shape,classes:entry.classes};
    books.push(book);if(classes.includes('garden-volume'))entry.garden=book;
   }
   if(classes.includes('motif-gardenbook')&&entry.garden){
    // The storybook cover lives inside its illustrated garden motif. Its
    // conservative search rectangle is [-57,-161]..[56,-6] in motif units.
    entry.garden.matrix=multiply(matrix,[1,0,0,1,-57,-6]);entry.garden.width=113;entry.garden.height=155;
   }
   if(classes.includes('catalogue-drawer'))drawers.push({key:attributes['data-catalogue'],matrix,bounds:attributes['data-drawer-bounds'].split(',').map(Number)});
  }
  if(!token.endsWith('/>'))stack.push(entry);
 }
 assert.equal(stack.length,1,'generated SVG tags close');
 return{books,drawers};
}
const close=(actual,expected,message,tolerance=1e-7)=>assert.ok(Math.abs(actual-expected)<=tolerance,`${message}: ${actual} vs ${expected}`);
const results=[];
async function test(name,fn){try{const details=await fn();results.push({name,pass:true,...details});}catch(error){results.push({name,pass:false,error:error.stack});}}

await test('Spatial copies match generated SVG across shelf shapes, slopes, stacks, and negative bays',()=>{
 const fixtures=[[0,0,17],[-1,0,17],[1,-1,17],[-2,-1,17],[2,1,17],[0,0,843],[1,1,843],[-1,-1,843]],coverage=new Set();let checked=0;
 for(const [tx,ty,seed]of fixtures){
  const rendered=scanSVG(tileMarkup(tx,ty,seed,true,true,'distant',.25)),records=getTileBooks(tx,ty,seed),byKey=new Map(records.map(book=>[book.occurrenceKey,book]));
  assert.equal(byKey.size,records.length,'book occurrence keys are unique within each bay');assert.equal(rendered.books.length,records.length,`all rendered books indexed in ${seed}:${tx},${ty}`);
  for(const book of rendered.books){
   assert.ok(book.key,'every SVG book has a stable occurrence key');const actual=byKey.get(book.key);assert.ok(actual,`rendered book ${book.key} indexed`);assert.equal(actual.bookId,book.id);
   for(let i=0;i<6;i++)close(actual.matrix[i],book.matrix[i],`matrix ${i} for ${book.key}`);
   const expected=[[0,0],[book.width,0],[book.width,-book.height],[0,-book.height]].map(([x,y])=>point(book.matrix,x,y));
   expected.forEach((p,i)=>{close(actual.corners[i].x,p.x,`corner ${i} x for ${book.key}`);close(actual.corners[i].y,p.y,`corner ${i} y for ${book.key}`);});
   close(actual.x,expected.reduce((sum,p)=>sum+p.x,0)/4,'cover center x');close(actual.y,expected.reduce((sum,p)=>sum+p.y,0)/4,'cover center y');
   const xs=expected.map(p=>p.x),ys=expected.map(p=>p.y);close(actual.bounds.x,Math.min(...xs),'bound x');close(actual.bounds.y,Math.min(...ys),'bound y');close(actual.bounds.w,Math.max(...xs)-Math.min(...xs),'bound width');close(actual.bounds.h,Math.max(...ys)-Math.min(...ys),'bound height');
   assert.ok(actual.x>=tx*W-BOOK_TILE_HALO&&actual.x<=(tx+1)*W+BOOK_TILE_HALO,'search halo contains cover center x');assert.ok(actual.y>=ty*H-BOOK_TILE_HALO&&actual.y<=(ty+1)*H+BOOK_TILE_HALO,'search halo contains cover center y');
   coverage.add(book.shape);if(book.classes.includes('stack-volume'))coverage.add('flat-stack');if(book.classes.includes('leaning-volume'))coverage.add('leaning-cluster');if(book.classes.includes('garden-volume'))coverage.add('garden');checked++;
  }
 }
 for(const kind of ['rect','sloped','curved','folded','hat','penrose','flat-stack','leaning-cluster','garden'])assert.ok(coverage.has(kind),`fixture covers ${kind}`);
 return{booksChecked:checked,coverage:[...coverage].sort()};
});

await test('Occurrence identities and positions survive distant, compact, full, and label-scale changes',()=>{
 let checked=0;
 for(const [tx,ty,seed]of [[0,0,17],[-1,0,17],[1,-1,843]]){
  const reference=scanSVG(tileMarkup(tx,ty,seed,true,true,'distant',.25)).books;
  const expected=reference.map(book=>[book.key,book.id,book.matrix]);
  for(const [quality,scale]of [['compact',.5],['compact',1],['full',2]]){
   const actual=scanSVG(tileMarkup(tx,ty,seed,true,true,quality,scale)).books.map(book=>[book.key,book.id,book.matrix]);
   assert.deepEqual(actual,expected,`${quality}/${scale} preserves every cover`);checked+=actual.length;
  }
 }
 return{copiesChecked:checked};
});

await test('Drawer world bounds and stable keys match detailed and miniature SVG',()=>{
 let checked=0;
 for(const [tx,ty,seed]of [[0,0,17],[-3,-2,17],[2,1,843]]){
  const expected=getDrawers(tx,ty,seed);assert.equal(expected.length,1,'one accessible catalogue in each bay');
  for(const markup of [tileMarkup(tx,ty,seed,true,true,'distant',.25),tileMarkup(tx,ty,seed,true,true,'full',2),previewMarkup(tx,ty,seed)]){
   const actual=scanSVG(markup).drawers;assert.equal(actual.length,expected.length);
   for(let i=0;i<actual.length;i++){
    const drawer=actual[i],record=expected[i];assert.equal(drawer.key,record.key);const origin=point(drawer.matrix,0,0);close(origin.x,record.x,'drawer world x');close(origin.y,record.y,'drawer world y');close(drawer.bounds[2],record.w,'drawer width');close(drawer.bounds[3],record.h,'drawer height');checked++;
   }
  }
 }
 return{drawersChecked:checked};
});

await test('Nearest book search equals an independent finite-distance brute-force proof',async()=>{
 const origins=[{x:540,y:560,seed:17},{x:-18,y:-44,seed:17},{x:W*1.9,y:-H*1.2,seed:843}],ids=[0,37,112,BOOKS.findIndex(book=>book.title==='The Secret Cardigan')];let checked=0,maxExamined=0;
 for(const origin of origins)for(const id of ids){
  const actual=await findNearestBook(id,origin,{yieldEvery:100000});assert.equal(actual.bookId,id);assert.equal(actual.seed,origin.seed);
  const radius=actual.distance,left=Math.floor((origin.x-radius-BOOK_TILE_HALO)/W),right=Math.floor((origin.x+radius+BOOK_TILE_HALO)/W),top=Math.floor((origin.y-radius-BOOK_TILE_HALO)/H),bottom=Math.floor((origin.y+radius+BOOK_TILE_HALO)/H);
  let best=null,bestDistance=Infinity;
  // Every unvisited tile lies outside this envelope, even with the declared
  // cover-center halo. It therefore cannot beat the returned candidate.
  for(let ty=top;ty<=bottom;ty++)for(let tx=left;tx<=right;tx++)for(const book of getTileBooks(tx,ty,origin.seed))if(book.bookId===id){
   const distance=Math.hypot(book.x-origin.x,book.y-origin.y);
   if(distance<bestDistance||(distance===bestDistance&&book.occurrenceKey<(best?.occurrenceKey||''))){best=book;bestDistance=distance;}
  }
  assert.ok(best);close(actual.distance,bestDistance,'true nearest distance');assert.equal(actual.occurrenceKey,best.occurrenceKey,'true nearest copy');close(actual.x,best.x,'nearest x');close(actual.y,best.y,'nearest y');maxExamined=Math.max(maxExamined,actual.examinedTiles);checked++;
 }
 return{queriesChecked:checked,maxExaminedTiles:maxExamined};
});

await test('A title absent from adjacent bays is found beyond them without an approximate radius cutoff',async()=>{
 const origin={x:W/2,y:H/2,seed:17},local=new Set();
 for(let ty=-1;ty<=1;ty++)for(let tx=-1;tx<=1;tx++)for(const book of getTileBooks(tx,ty,origin.seed))local.add(book.bookId);
 const id=BOOKS.findIndex((book,index)=>!local.has(index));assert.ok(id>=0,'fixture has a title beyond adjacent bays');
 await assert.rejects(findNearestBook(id,origin,{yieldEvery:100000,maxRings:1}),RangeError,'limited search must not pretend to establish the closest copy');
 const actual=await findNearestBook(id,origin,{yieldEvery:100000});assert.ok(Math.max(Math.abs(actual.tx),Math.abs(actual.ty))>1,'winner is outside all adjacent bays');
 const radius=actual.distance,left=Math.floor((origin.x-radius-BOOK_TILE_HALO)/W),right=Math.floor((origin.x+radius+BOOK_TILE_HALO)/W),top=Math.floor((origin.y-radius-BOOK_TILE_HALO)/H),bottom=Math.floor((origin.y+radius+BOOK_TILE_HALO)/H);
 const candidates=[];for(let ty=top;ty<=bottom;ty++)for(let tx=left;tx<=right;tx++)for(const book of getTileBooks(tx,ty,origin.seed))if(book.bookId===id)candidates.push({...book,distance:Math.hypot(book.x-origin.x,book.y-origin.y)});
 candidates.sort((a,b)=>a.distance-b.distance||a.occurrenceKey.localeCompare(b.occurrenceKey));assert.equal(actual.occurrenceKey,candidates[0].occurrenceKey);close(actual.distance,candidates[0].distance,'proved far-copy distance');
 return{catalogueId:id,winningBay:[actual.tx,actual.ty],searchRadius:actual.searchRadius,examinedTiles:actual.examinedTiles};
});

await test('Search rejects invalid input and observes cancellation before and between batches',async()=>{
 await assert.rejects(findNearestBook(-1,{x:0,y:0,seed:17}),RangeError);
 await assert.rejects(findNearestBook(0,{x:NaN,y:0,seed:17}),TypeError);
 const preAborted=new AbortController();preAborted.abort();await assert.rejects(findNearestBook(0,{x:0,y:0,seed:17},{signal:preAborted.signal}),error=>error.name==='AbortError');
 const controller=new AbortController();let batches=0;
 await assert.rejects(findNearestBook(0,{x:0,y:0,seed:17},{signal:controller.signal,yieldEvery:1,onProgress:()=>{batches++;controller.abort();}}),error=>error.name==='AbortError');assert.equal(batches,1,'cancellation checked at first yield');
});

console.log(JSON.stringify({suite:'catalogue spatial geometry',results},null,2));
if(results.some(result=>!result.pass))process.exitCode=1;
