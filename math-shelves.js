import { BOOKS, DISCOVERIES } from './catalog.js';
import { renderBook } from './books.js';
import { motif } from './motifs.js';
import { pottedPlant } from './foliage.js';
import { HAT_TILES, HAT_REFLECTED } from './hat-tiles.js';

/* Penrose geometry is derived here from the golden-ratio Robinson-triangle
 * subdivision, not from an arbitrary collection of rhombs. See N. P. Frank,
 * A Primer of Substitution Tilings, Fig. 13:
 * https://pages.vassar.edu/nafrank/files/2012/08/substitutions.pdf
 * Hat geometry and its BSD attribution are supplied by hat-tiles.js.
 * These are genuine finite patches; the outer world remains the library's
 * rectangular coordinate system, rather than an infinite aperiodic tiling.
 */
const MATH_INK='#382c27',MATH_PHI=(1+Math.sqrt(5))/2;
const MATH_BACKS=['back-sky','back-leaf','back-lilac','back-sun'];
const mathGeometryCache=new Map();
const mathPatchCache=new Map();
const mathNumber=n=>Number(n.toFixed(3));
const mathKey=p=>`${p[0].toFixed(6)},${p[1].toFixed(6)}`;
function mathHash(...values){let h=2166136261;for(const c of values.join(':'))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
function mathRandom(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
function mathMix(a,b,t){return[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];}
function mathArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[(i+1)%p.length];a+=p[i][0]*q[1]-p[i][1]*q[0];}return a/2;}
function mathBounds(polygons){const p=polygons.flat();return{x:Math.min(...p.map(v=>v[0])),y:Math.min(...p.map(v=>v[1])),width:Math.max(...p.map(v=>v[0]))-Math.min(...p.map(v=>v[0])),height:Math.max(...p.map(v=>v[1]))-Math.min(...p.map(v=>v[1]))};}
function mathCenter(p){return[p.reduce((n,v)=>n+v[0],0)/p.length,p.reduce((n,v)=>n+v[1],0)/p.length];}
function mathPath(p){return p.map((v,i)=>`${i?'L':'M'}${mathNumber(v[0])} ${mathNumber(v[1])}`).join('')+'Z';}

function mathEdges(cells){
 const edges=new Map(),vertices=[...new Map(cells.flatMap(c=>c.points).map(p=>[mathKey(p),p])).values()];
 cells.forEach((cell,index)=>cell.points.forEach((a,i)=>{
  const b=cell.points[(i+1)%cell.points.length],dx=b[0]-a[0],dy=b[1]-a[1],length2=dx*dx+dy*dy,parts=[0,1];
  for(const p of vertices){const t=((p[0]-a[0])*dx+(p[1]-a[1])*dy)/length2;if(t>1e-7&&t<1-1e-7&&mathPointDistance(p,a,b)<1e-6)parts.push(t);}
  parts.sort((x,y)=>x-y);for(let j=0;j<parts.length-1;j++){
   if(parts[j+1]-parts[j]<1e-7)continue;const aa=mathMix(a,b,parts[j]),bb=mathMix(a,b,parts[j+1]),key=[mathKey(aa),mathKey(bb)].sort().join('|');
   if(edges.has(key))edges.get(key).cells.push(index);else edges.set(key,{a:aa,b:bb,cells:[index]});
  }
 }));return[...edges.values()];
}
function mathSimpleBoundary(cells){
 const edges=mathEdges(cells).filter(e=>e.cells.length===1),graph=new Map();
 for(const e of edges){const a=mathKey(e.a),b=mathKey(e.b);if(!graph.has(a))graph.set(a,[]);if(!graph.has(b))graph.set(b,[]);graph.get(a).push(b);graph.get(b).push(a);}
 if([...graph.values()].some(v=>v.length!==2))return false;
 const seen=new Set(),queue=[graph.keys().next().value];while(queue.length){const v=queue.pop();if(seen.has(v))continue;seen.add(v);queue.push(...graph.get(v));}return seen.size===graph.size;
}

function mathRobinsonSubdivision(triangles){
 const result=[];for(const t of triangles){const{type,a,b,c}=t;
  if(type===0){const p=mathMix(a,b,1/MATH_PHI);result.push({type:0,a:c,b:p,c:b},{type:1,a:p,b:c,c:a});}
  else{const q=mathMix(b,a,1/MATH_PHI),r=mathMix(b,c,1/MATH_PHI);result.push({type:1,a:r,b:c,c:a},{type:1,a:q,b:r,c:b},{type:0,a:r,b:q,c:a});}
 }return result;
}
function mathPenroseSource(){
 let triangles=[];for(let i=0;i<10;i++){let b=[Math.cos((2*i-1)*Math.PI/10),Math.sin((2*i-1)*Math.PI/10)],c=[Math.cos((2*i+1)*Math.PI/10),Math.sin((2*i+1)*Math.PI/10)];if(i%2===0)[b,c]=[c,b];triangles.push({type:0,a:[0,0],b,c});}
 triangles=mathRobinsonSubdivision(mathRobinsonSubdivision(triangles));
 const pairs=new Map();for(const t of triangles){const key=`${t.type}:${[mathKey(t.b),mathKey(t.c)].sort().join('|')}`;if(!pairs.has(key))pairs.set(key,[]);pairs.get(key).push(t);}
 const cells=[];for(const pair of pairs.values())if(pair.length===2){const points=[pair[0].a,pair[0].b,pair[1].a,pair[0].c],center=mathCenter(points);points.sort((a,b)=>Math.atan2(a[1]-center[1],a[0]-center[0])-Math.atan2(b[1]-center[1],b[0]-center[0]));cells.push({points,type:pair[0].type===0?'thin':'thick',source:cells.length});}
 return cells;
}
const MATH_PENROSE_SOURCE=mathPenroseSource();

function mathPenrosePatch(seed,ratio){
 const angle=(18+(seed%5)*72)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle);
 const source=MATH_PENROSE_SOURCE.map(t=>({...t,points:t.points.map(p=>[p[0]*c-p[1]*s,p[0]*s+p[1]*c])})),edges=mathEdges(source),neighbors=source.map(()=>new Set());
 for(const edge of edges)if(edge.cells.length===2){const[a,b]=edge.cells;neighbors[a].add(b);neighbors[b].add(a);}
 const centers=source.map(t=>mathCenter(t.points));let best=null,score=Infinity;
 for(let first=0;first<source.length;first++){
  const selected=new Set([first]),origin=centers[first];while(selected.size<8){
   const frontier=[...new Set([...selected].flatMap(i=>[...neighbors[i]]))].filter(i=>!selected.has(i));if(!frontier.length)break;
   frontier.sort((a,b)=>{const weight=i=>Math.abs(centers[i][0]-origin[0])*.42+Math.abs(centers[i][1]-origin[1])*Math.max(1,ratio)*1.6;return weight(a)-weight(b);});selected.add(frontier[0]);
  }
  const cells=[...selected].map(i=>source[i]);if(cells.length!==8||!cells.some(t=>t.type==='thin')||!cells.some(t=>t.type==='thick')||!mathSimpleBoundary(cells))continue;
  const b=mathBounds(cells.map(t=>t.points)),occupancy=cells.reduce((n,t)=>n+Math.abs(mathArea(t.points)),0)/(b.width*b.height),value=Math.abs(Math.log((b.width/b.height)/ratio))+.16*(1-occupancy)+(mathHash(seed,first)%1000)*.000001;
  if(value<score){score=value;best=cells;}
 }
 if(best)return best;
 // A connected interior crop is always available; this fallback keeps the
 // source triangles and their inherited subdivision unchanged.
 const selected=new Set([0]);while(selected.size<8){const next=[...selected].flatMap(i=>[...neighbors[i]]).find(i=>!selected.has(i));if(next===undefined)break;selected.add(next);}return[...selected].map(i=>source[i]);
}

function mathPointInside(point,polygon){
 let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a[1]>point[1])!==(b[1]>point[1])&&point[0]<(b[0]-a[0])*(point[1]-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;
}
function mathPointDistance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],den=dx*dx+dy*dy,t=den?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/den)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
function mathCross(a,b,c){return(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);}
function mathProperIntersection(a,b,c,d){return mathCross(a,b,c)*mathCross(a,b,d)<-1e-8&&mathCross(c,d,a)*mathCross(c,d,b)<-1e-8;}
function mathSegmentDistance(a,b,c,d){if(mathProperIntersection(a,b,c,d))return 0;return Math.min(mathPointDistance(a,c,d),mathPointDistance(b,c,d),mathPointDistance(c,a,b),mathPointDistance(d,a,b));}
function mathRectangleInside(corners,polygon,inset){
 if(corners.some(p=>!mathPointInside(p,polygon)))return false;
 for(let i=0;i<corners.length;i++){const a=corners[i],b=corners[(i+1)%corners.length];for(let j=0;j<polygon.length;j++)if(mathSegmentDistance(a,b,polygon[j],polygon[(j+1)%polygon.length])<inset-1e-6)return false;}return true;
}
function mathBookCorners(book){const a=book.angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return[[0,0],[book.width,0],[book.width,-book.height],[0,-book.height]].map(([x,y])=>[book.x+x*c-y*s,book.y+x*s+y*c]);}
function mathConvexOverlap(a,b){
 for(const polygon of [a,b])for(let i=0;i<polygon.length;i++){const p=polygon[i],q=polygon[(i+1)%polygon.length],axis=[p[1]-q[1],q[0]-p[0]],aa=a.map(v=>v[0]*axis[0]+v[1]*axis[1]),bb=b.map(v=>v[0]*axis[0]+v[1]*axis[1]);if(Math.max(...aa)<Math.min(...bb)-.01||Math.max(...bb)<Math.min(...aa)-.01)return false;}return true;
}

function mathPackCell(cell,seed,edgeWidth){
 const polygon=cell.points,inset=edgeWidth*.5+1.35,limits=mathBounds([polygon]);let best=[],bestScore=-1;
 polygon.forEach((pa,index)=>{
  let a=pa,b=polygon[(index+1)%polygon.length],dx=b[0]-a[0],dy=b[1]-a[1],length=Math.hypot(dx,dy),tx=dx/length,ty=dy/length,nx=ty,ny=-tx;
  const mid=[(a[0]+b[0])/2+nx*inset,(a[1]+b[1])/2+ny*inset];if(!mathPointInside(mid,polygon)){[a,b]=[b,a];tx=-tx;ty=-ty;nx=-nx;ny=-ny;}
  if(length<23||ny>-.1)return;
  const r=mathRandom(mathHash(seed,index,'cell-run')),books=[];let cursor=inset*1.7;
  while(cursor<length-inset*1.7-8&&books.length<10){
   const width=9+r()*8,center=cursor+width/2;if(center+width/2>length-inset*1.6)break;
   const p=[a[0]+tx*center+nx*inset,a[1]+ty*center+ny*inset],book={x:p[0]-tx*width/2,y:p[1]-ty*width/2,width,height:1,angle:Math.atan2(ty,tx)*180/Math.PI,id:Math.floor(r()*BOOKS.length),seed:mathHash(seed,index,books.length,'spine')};
   if(!mathRectangleInside(mathBookCorners(book),polygon,inset)){cursor+=width+.7;continue;}
   let low=1,high=Math.min(110,Math.max(limits.width,limits.height)*.85);for(let i=0;i<13;i++){book.height=(low+high)/2;if(mathRectangleInside(mathBookCorners(book),polygon,inset))low=book.height;else high=book.height;}
   book.height=low*(.87+r()*.10);if(book.height>=16)books.push(book);cursor+=width+.75;
  }
  const score=books.reduce((n,b)=>n+b.width*b.height,0);if(score>bestScore){best=books;bestScore=score;}
 });
 // Concave Hat cells often have useful reading space above an inner ledge,
 // even when no single outer edge supports several complete spines. Every
 // such ledge joins two genuine polygon boundary points and keeps the same
 // strict whole-rectangle containment test as the sloping outer-edge runs.
 let rails=[];
 for(let yi=5;yi<=12;yi++){
  const floor=limits.y+limits.height*yi/14,crossings=[];
  polygon.forEach((a,i)=>{const b=polygon[(i+1)%polygon.length];if((a[1]>floor)!==(b[1]>floor))crossings.push(a[0]+(floor-a[1])*(b[0]-a[0])/(b[1]-a[1]));});crossings.sort((a,b)=>a-b);
  for(let j=0;j<crossings.length-1;j+=2){
   const left=crossings[j],right=crossings[j+1],r=mathRandom(mathHash(seed,yi,j,'inner-ledge')),books=[];let cursor=left+inset*1.25;
   while(cursor<right-inset*1.25-7&&books.length<10){
    const width=8.5+r()*5.5;if(cursor+width>right-inset*1.25)break;
    const book={x:cursor,y:floor,width,height:1,angle:0,id:Math.floor(r()*BOOKS.length),seed:mathHash(seed,yi,j,books.length,'inner-spine')};
    if(!mathRectangleInside(mathBookCorners(book),polygon,inset)){cursor+=width+.7;continue;}
    let low=1,high=Math.min(110,limits.height*.85);for(let k=0;k<13;k++){book.height=(low+high)/2;if(mathRectangleInside(mathBookCorners(book),polygon,inset))low=book.height;else high=book.height;}
    book.height=low*(.90+r()*.07);if(book.height>=16)books.push(book);cursor+=width+.75;
   }
   const score=books.reduce((n,b)=>n+b.width*b.height,0);if(score>bestScore){bestScore=score;best=books;rails=[{a:[left,floor],b:[right,floor]}];}
  }
 }
 return{books:best,rails};
}

function mathFindNook(cell,books,seed,edgeWidth){
 const kinds=['cheese','mouse','mushrooms','plant'],kind=kinds[seed%kinds.length],nominal=kind==='mouse'?[110,53]:kind==='cheese'?[94,54]:kind==='mushrooms'?[104,77]:[110,136],bounds=mathBounds([cell.points]);
 for(const scale of [.34,.28,.22,.17])for(let yi=7;yi>=1;yi--)for(let xi=1;xi<8;xi++){
  const x=bounds.x+bounds.width*xi/8,y=bounds.y+bounds.height*yi/8,w=nominal[0]*scale,h=nominal[1]*scale,rectangle=[[x-w/2,y-h],[x+w/2,y-h],[x+w/2,y+4],[x-w/2,y+4]];
  if(mathRectangleInside(rectangle,cell.points,edgeWidth*.5+1)&&books.every(b=>!mathConvexOverlap(rectangle,mathBookCorners(b))))return{kind,x,y,scale,bounds:rectangle};
 }
 return null;
}

/** Cheap polygon geometry for distant doorway previews. Packing and nook
 * containment are deliberately deferred until the books can be seen. Every
 * scale remains uniform, preserving congruence and the rhomb subdivision. */
export function mathShelfPatchGeometry(q,seed=1){
 const height=Math.min(q.height,q.base-q.top),width=q.width,shape=q.shape==='hat'?'hat':'penrose',key=`${shape}:${seed}:${width.toFixed(4)}:${height.toFixed(4)}`;
 if(mathPatchCache.has(key))return mathPatchCache.get(key);
 const innerW=Math.max(20,width-28),innerH=Math.max(20,height-28),ratio=innerW/innerH;
 let raw;if(shape==='hat'){
  const rotate=ratio>1.05;raw=HAT_TILES.map((points,index)=>({points:points.map(p=>rotate?[-p[1],p[0]]:[...p]),type:'hat',source:index,reflected:HAT_REFLECTED[index]}));
 }else raw=mathPenrosePatch(seed,ratio);
 const bounds=mathBounds(raw.map(t=>t.points)),scale=Math.min(innerW/bounds.width,innerH/bounds.height),offsetX=(width-bounds.width*scale)/2,offsetY=14+(innerH-bounds.height*scale)/2;
 const cells=raw.map(t=>({...t,points:t.points.map(p=>[(p[0]-bounds.x)*scale+offsetX,(p[1]-bounds.y)*scale+offsetY])})),edgeWidth=Math.max(5.3,Math.min(9.5,height*.029));
 const result={shape,width,height,scale,cells,edges:mathEdges(cells),edgeWidth,patchBounds:mathBounds(cells.map(t=>t.points)),frameDepth:16,provenance:shape==='hat'?'hatviz-H-P-six-tile-patch':'robinson-sun-two-subdivisions'};
 mathPatchCache.set(key,result);if(mathPatchCache.size>120)mathPatchCache.delete(mathPatchCache.keys().next().value);return result;
}

/** Fitted books reuse the patch polygons, without mutating the cheap preview.
 * The cache avoids repeating the strict containment search at detail changes. */
export function mathShelfGeometry(q,seed=1){
 const patch=mathShelfPatchGeometry(q,seed),key=`${patch.shape}:${seed}:${patch.width.toFixed(4)}:${patch.height.toFixed(4)}`;
 if(mathGeometryCache.has(key))return mathGeometryCache.get(key);
 const {shape,edgeWidth}=patch,cells=patch.cells.map(cell=>({...cell}));
 cells.forEach((cell,index)=>{
  const cellSeed=mathHash(seed,index,shape),packed=mathPackCell(cell,cellSeed,edgeWidth);cell.books=packed.books;cell.rails=packed.rails;cell.nook=null;
  if(index===seed%cells.length){
   const original=cell.books.slice();cell.nook=mathFindNook(cell,cell.books,cellSeed,edgeWidth);
   while(!cell.nook&&cell.books.length){cell.books.pop();cell.nook=mathFindNook(cell,cell.books,cellSeed,edgeWidth);}
   if(!cell.nook)cell.books=original;
  }else if(index%4===seed%4)cell.nook=mathFindNook(cell,cell.books,cellSeed,edgeWidth);
 });
 const result={...patch,cells};
 mathGeometryCache.set(key,result);if(mathGeometryCache.size>120)mathGeometryCache.delete(mathGeometryCache.keys().next().value);return result;
}

/** Outer floors remain compatible with the library's existing stair landings. */
export function mathShelfLandings(q){return[{x:q.x+8,y:q.base,kind:'shelf-floor'},{x:q.x+q.width-8,y:q.base,kind:'shelf-floor'}];}

function mathFrame(g,quality){
 const fine=quality==='full'||quality==='compact';
 const w=g.width,h=g.height,t=g.frameDepth,post=10;
 let out=`<g class="math-case-frame"><rect x="0" y="0" width="${w}" height="9" fill="url(#wood)" stroke="${MATH_INK}" stroke-width="1.5"/>`;
 for(const x of [0,w-post])out+=`<rect x="${x}" y="0" width="${post}" height="${h+t}" fill="url(#wood)" stroke="${MATH_INK}" stroke-width="1.5"/>${fine?`<rect x="${x}" y="0" width="${post}" height="${h+t}" fill="url(#grain)"/>`:''}`;
 out+=`<rect class="math-floorboard" x="0" y="${h}" width="${w}" height="${t}" fill="url(#wood)" stroke="${MATH_INK}" stroke-width="1.6"/>${fine?`<rect x="0" y="${h}" width="${w}" height="${t}" fill="url(#grain)"/>`:''}<path d="M1 ${h+2}H${w-1}" stroke="#e5c68d" stroke-width="1.1"/></g>`;
 const all=g.cells.flatMap(c=>c.points),left=all.reduce((a,b)=>a[0]<b[0]?a:b),right=all.reduce((a,b)=>a[0]>b[0]?a:b),top=all.reduce((a,b)=>a[1]<b[1]?a:b),bottom=all.reduce((a,b)=>a[1]>b[1]?a:b);
 return out+`<path class="math-case-join" d="M8 ${mathNumber(left[1])}H${mathNumber(left[0])}M${mathNumber(right[0])} ${mathNumber(right[1])}H${w-8}M${mathNumber(top[0])} 7V${mathNumber(top[1])}M${mathNumber(bottom[0])} ${mathNumber(bottom[1])}V${h}" stroke="${MATH_INK}" stroke-width="7.3"/><path d="M8 ${mathNumber(left[1])}H${mathNumber(left[0])}M${mathNumber(right[0])} ${mathNumber(right[1])}H${w-8}M${mathNumber(top[0])} 7V${mathNumber(top[1])}M${mathNumber(bottom[0])} ${mathNumber(bottom[1])}V${h}" stroke="url(#wood)" stroke-width="5.2"/>`;
}

function mathRender(q,seed,detail,quality){
 const preview=!detail||quality==='preview',fine=quality==='full'||quality==='compact';
 const g=preview?mathShelfPatchGeometry(q,seed):mathShelfGeometry(q,seed),token=mathHash(seed,q.x,q.top,q.width,q.height,g.shape,quality),name=g.shape==='hat'?'The Hat Cabinet':'The Penrose Cabinet';
 let out=`<g class="math-shelf math-shelf-${g.shape}" data-shape="${g.shape}" data-provenance="${g.provenance}" data-cell-count="${g.cells.length}" data-scale="${g.scale}" data-floor="${q.base}" transform="translate(${q.x} ${q.top})"><title>${name}: a genuine finite tiling patch.</title>${mathFrame(g,quality)}`;
 g.cells.forEach((cell,index)=>{
  const d=mathPath(cell.points),clip=`math-cell-${token}-${index}`;
  out+=`<g class="math-cell" data-cell="${index}" data-tile-type="${cell.type}" data-source-index="${cell.source}" data-reflected="${!!cell.reflected}" data-cell-polygon="${cell.points.map(p=>`${mathNumber(p[0])},${mathNumber(p[1])}`).join(' ')}">${fine?`<defs><clipPath id="${clip}"><path d="${d}"/></clipPath></defs>`:''}<path d="${d}" fill="url(#${MATH_BACKS[(index+seed)%MATH_BACKS.length]})"/>${fine?`<path d="${d}" fill="url(#paper)"/><g clip-path="url(#${clip})">`:''}`;
  for(const rail of cell.rails??[])out+=`<g class="math-inner-ledge" data-anchors="${rail.a.join(',')};${rail.b.join(',')}"><path d="M${mathNumber(rail.a[0])} ${mathNumber(rail.a[1]+2)}H${mathNumber(rail.b[0])}" stroke="${MATH_INK}" stroke-width="5"/><path d="M${mathNumber(rail.a[0])} ${mathNumber(rail.a[1]+2)}H${mathNumber(rail.b[0])}" stroke="url(#wood)" stroke-width="3.5"/>${fine?`<path d="M${mathNumber(rail.a[0])} ${mathNumber(rail.a[1]+2)}H${mathNumber(rail.b[0])}" stroke="url(#grain)" stroke-width="2.7" opacity=".7"/>`:''}</g>`;
  (cell.books??[]).forEach(book=>{
   out+=`<g class="math-cell-book" data-cell="${index}" data-border-inset="${g.edgeWidth*.5+1.35}">`;
   out+=renderBook({...book,detail:quality});
   out+='</g>';
  });
  if(detail&&cell.nook){const n=cell.nook,id=DISCOVERIES.findIndex(d=>d.kind===n.kind),half=19*n.scale;out+=`<g class="math-nook discovery" data-find="${id}" data-cell="${index}" aria-label="${n.kind}"><title>A tiny ${n.kind} in a geometric nook.</title><path d="M${mathNumber(n.x-half)} ${mathNumber(n.y+1)}h${mathNumber(half*2)}v3h${mathNumber(-half*2)}Z" fill="url(#wood)" stroke="${MATH_INK}" stroke-width=".7"/>${n.kind==='plant'?pottedPlant('pothos',n.x,n.y,n.scale,mathHash(seed,index,'plant'),quality):motif(n.kind,n.x,n.y,n.scale,mathHash(seed,index,'curio'),quality)}</g>`;}
  out+=`${fine?'</g>':''}</g>`;
 });
 const edgePath=g.edges.map(e=>`M${mathNumber(e.a[0])} ${mathNumber(e.a[1])}L${mathNumber(e.b[0])} ${mathNumber(e.b[1])}`).join('');
 out+=`<g class="math-shared-boards" data-unique-edge-count="${g.edges.length}" data-shared-edge-count="${g.edges.filter(e=>e.cells.length===2).length}"><path d="${edgePath}" fill="none" stroke="${MATH_INK}" stroke-width="${g.edgeWidth+1.6}" stroke-linejoin="round"/><path d="${edgePath}" fill="none" stroke="url(#wood)" stroke-width="${g.edgeWidth}" stroke-linejoin="round"/>${fine?`<path d="${edgePath}" fill="none" stroke="url(#grain)" stroke-width="${g.edgeWidth-1}" opacity=".7"/>`:''}`;
 if(detail&&quality==='full')out+=`<path d="${edgePath}" transform="translate(-.65 -.65)" fill="none" stroke="#e5c38a" stroke-width=".6" opacity=".7"/>`;out+='</g>';
 const find=DISCOVERIES.findIndex(d=>d.kind===`${g.shape}patch`),label=g.shape==='hat'?'HAT CABINET':'PENROSE CABINET';
 out+=`<g class="math-name-plaque${detail&&find>=0?' discovery':''}"${detail&&find>=0?` data-find="${find}"`:''} aria-label="${name}"><title>${name}</title><rect x="14" y="${g.height+3}" width="90" height="10" rx="1.5" fill="#c3a165" stroke="${MATH_INK}" stroke-width=".65"/>${fine?`<text x="59" y="${g.height+10.2}" text-anchor="middle" font-family="Georgia,serif" font-size="5.6" fill="${MATH_INK}" letter-spacing=".3">${label}</text>`:''}</g></g>`;
 return out;
}

export function renderMathShelf(q,seed=1,detail=true,quality='full'){return mathRender(q,seed,detail,quality);}
export function overviewMathShelf(q,seed=1,quality='preview'){return mathRender(q,seed,false,quality);}
