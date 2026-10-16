import {BOOKS, DISCOVERIES} from './catalog.js';
import {motif} from './motifs.js';
import {renderBook,withBookScale,bookOccurrenceKey,captureBookGeometry,withBookTransform} from './books.js';
import {renderBendingShelf, overviewBendingShelf, bendingNook,collectBendingBooks} from './shelves.js';
import {pottedPlant, trailingVine} from './foliage.js';
import {renderMathShelf, overviewMathShelf,mathShelfGeometry} from './math-shelves.js';
import {HAT_ATTRIBUTION} from './hat-tiles.js';

export const W=1080, H=1120, INK='#382c27';
export const colors=['#ef4452','#f19532','#f4cb37','#91c933','#41af58','#13b7a6','#39bceb','#4965d4','#ab4dc4','#ed6193','#e95a29','#5cccca'];
const backdrops=['back-sky','back-leaf','back-rose','back-lilac','back-sun'];
export const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]));
export function hash(...v){let h=2166136261;for(const c of v.join(':')){h^=c.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function random(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t^=t+Math.imul(t^t>>>7,61|t);return((t^t>>>14)>>>0)/4294967296;};}
export const portalSeeds=new Map();
const layoutCache=new Map();

// Each bay has its own subdivisions; no shared grid or repeating shelf recipe.
export function shelfLayout(tx,ty,universe=1){
 const key=`${universe}:${tx}:${ty}`;if(layoutCache.has(key))return layoutCache.get(key);
 const seed=hash(tx,ty,universe),r=random(seed),count=[2,3,3,4][Math.floor(r()*4)];
 const weights=Array.from({length:count},()=>.65+r()*1.1),sum=weights.reduce((a,b)=>a+b,0),available=W-24-count*16;
 let x=12,columns=[],rooms=[];
 for(let col=0;col<count;col++){
  const width=available*(weights[col]/sum)+16, rows=3+Math.floor(r()*3);
  const heights=Array.from({length:rows},()=>.62+r()*1.15),total=heights.reduce((a,b)=>a+b,0);
  let top=8+r()*12;
  columns.push({x,width,post:12+r()*9});
  for(let row=0;row<rows;row++){
   const height=(H-38)*heights[row]/total,base=top+height-23,roll=r();
   const shape=roll<.40?'rect':roll<.58?'arch':roll<.72?'sloped':roll<.87?'stepped':'round';
   rooms.push({x:x+13,width:width-29,top,base,height:base-top,shape,col,row,angle:shape==='sloped'?(r()>.5?1:-1)*(1.3+r()*2.8):0,seed:hash(seed,col,row)});
   top+=height;
  }
  x+=width;
 }
 const candidates=rooms.filter(q=>q.width>180&&q.height>180&&q.row>0);
 const target=candidates[Math.floor(r()*candidates.length)]||rooms.reduce((a,b)=>a.width*a.height>b.width*b.height?a:b);
 target.shape='portal';
 // A few shelves wander away from the ordinary room grid. Choose their rooms
 // independently so curves and return folds occur at different heights in each bay.
 const bends=rooms.filter(q=>q!==target&&q.width>210&&q.height>175),br=random(hash(seed,'bending-shelves'));
 const bendCount=Math.min(bends.length,seed%3===0?2:1);
 for(let i=0;i<bendCount;i++){
  const choice=Math.floor(br()*bends.length),q=bends.splice(choice,1)[0];
  q.shape=(i+seed)%2===0?'curved':'folded';q.angle=0;
 }
 // Give the first view both kinds, then let the seeded architecture take over.
 if(tx===0&&ty===0&&universe===17){
  for(const q of rooms)if(q.shape==='curved'||q.shape==='folded')q.shape='rect';
  rooms[0].shape='curved';rooms[6].shape='folded';
 }
 // A rare framed patch belongs to the surrounding case, with its own
 // polygonal compartments rather than a different world coordinate system.
 const mathRooms=rooms.filter(q=>q!==target&&!['curved','folded'].includes(q.shape)&&q.width>230&&q.height>190);
 const mr=random(hash(seed,'mathematical-alcove'));
 if(mathRooms.length&&mr()<.28){
  const q=mathRooms[Math.floor(mr()*mathRooms.length)];q.shape=mr()<.5?'penrose':'hat';q.angle=0;
 }
 if(tx===0&&ty===0&&universe===17){rooms[1].shape='penrose';rooms[1].angle=0;rooms[7].shape='hat';rooms[7].angle=0;}
 // A flat ordinary shelf gives the little card catalogue a permanent home.
 // Reserving its room before drawing keeps every level of detail consistent.
 const drawerRooms=rooms.filter(q=>!['portal','round','curved','folded','penrose','hat'].includes(q.shape)&&!q.angle&&q.width>140&&q.height>80);
 let drawerRoom=drawerRooms[hash(seed,'catalogue-room')%Math.max(1,drawerRooms.length)];
 if(!drawerRoom){drawerRoom=rooms.filter(q=>!['portal','penrose','hat'].includes(q.shape)).reduce((a,b)=>a.width*a.height>b.width*b.height?a:b);drawerRoom.shape='rect';drawerRoom.angle=0;}
 const drawerWidth=Math.min(172,Math.max(96,drawerRoom.width*.49),drawerRoom.width-42),drawerHeight=Math.min(56,drawerRoom.height-18);
 drawerRoom.catalogue={key:`catalogue-${universe}-${tx}-${ty}`,x:drawerRoom.x+drawerRoom.width-drawerWidth-5,y:drawerRoom.base-drawerHeight,w:drawerWidth,h:drawerHeight};
 const k=Math.min(.235,(target.width-48)/W,(target.height-70)/H);
 const portal={x:target.x+(target.width-W*k)/2,y:target.base-H*k-15,w:W*k,h:H*k,k,room:rooms.indexOf(target)};
 const layout={seed,columns,rooms,portal};layoutCache.set(key,layout);if(layoutCache.size>180)layoutCache.delete(layoutCache.keys().next().value);return layout;
}
export function getPortal(tx,ty,universe=1){const p=shelfLayout(tx,ty,universe).portal;return{...p,seed:portalSeeds.get(`${universe}:${tx}:${ty}`)??hash(universe,tx,ty,'inside')};}

/** World-space drawer bounds, matching the SVG's stable data-catalogue key. */
export function getDrawers(tx,ty,seed=1){
 return shelfLayout(tx,ty,seed).rooms.filter(q=>q.catalogue).map(q=>({...q.catalogue,x:q.catalogue.x+tx*W,y:q.catalogue.y+ty*H,tx,ty,seed}));
}

function catalogueDrawer(d,quality='full'){
 const {x,y,w,h,key}=d,fine=quality==='full'||quality==='compact',cx=w/2;
 return `<g class="catalogue-drawer" data-catalogue="${key}" data-drawer-bounds="${x},${y},${w},${h}" transform="translate(${x} ${y})" ${quality==='preview'?'aria-hidden="true"':'role="button" tabindex="0" aria-label="Open the card catalogue to find a book"'}><title>The card catalogue: find a book in the library.</title><path d="M-3 3H${w+3}V${h+2}H-3Z" fill="#32291f"/><rect width="${w}" height="${h}" rx="2" fill="#6d492e" stroke="${INK}" stroke-width="1.8"/><path d="M3 3H${w-3}V${h-3}H3Z" fill="url(#wood)" stroke="#402d20" stroke-width="1.2"/>${fine?`<path d="M3 3H${w-3}V${h-3}H3Z" fill="url(#grain)"/>`:''}<path d="M5 5H${w-5}M5 ${h-5}H${w-5}" stroke="#e3bf80" stroke-width=".8" opacity=".8"/><rect x="${cx-31}" y="${h*.19}" width="62" height="${h*.30}" rx="1.3" fill="#ad8540" stroke="#634820" stroke-width=".85"/><rect x="${cx-26}" y="${h*.19+3}" width="52" height="${h*.30-6}" fill="#eee0b9"/>${fine?`<text x="${cx}" y="${h*.19+11}" text-anchor="middle" font-family="Georgia,serif" font-size="6.6" letter-spacing=".65" fill="#4a3b29">CATALOGUE</text>`:''}<path d="M${cx-18} ${h*.70}h36v5h-36Z" fill="#bb9755" stroke="#654a27" stroke-width=".8"/><path d="M${cx-12} ${h*.70+3}v5q12 7 24 0v-5" fill="none" stroke="#654a27" stroke-width="4"/><path d="M${cx-12} ${h*.70+2}v5q12 7 24 0v-5" fill="none" stroke="#d9b76d" stroke-width="2.4"/></g>`;
}

export const definitions=`<defs>
 <linearGradient id="wood" x2="0" y2="1"><stop stop-color="#bd995e"/><stop offset=".16" stop-color="#e1bd7a"/><stop offset=".47" stop-color="#b58b4e"/><stop offset="1" stop-color="#8a6039"/></linearGradient>
 <linearGradient id="shelf-shadow" x2="0" y2="1"><stop stop-color="#282c28"/><stop offset="1" stop-color="#514439"/></linearGradient>
 <linearGradient id="back-sky" x2="0" y2="1"><stop stop-color="#354b52"/><stop offset="1" stop-color="#4b655f"/></linearGradient>
 <linearGradient id="back-leaf" x2="1" y2="1"><stop stop-color="#414b37"/><stop offset="1" stop-color="#596347"/></linearGradient>
 <linearGradient id="back-rose" x2="0" y2="1"><stop stop-color="#59433b"/><stop offset="1" stop-color="#705346"/></linearGradient>
 <linearGradient id="back-lilac" x2="1" y2="1"><stop stop-color="#443a4d"/><stop offset="1" stop-color="#5a4b5c"/></linearGradient>
 <linearGradient id="back-sun" x2="0" y2="1"><stop stop-color="#5c4b32"/><stop offset="1" stop-color="#766343"/></linearGradient>
 <linearGradient id="plaster" x2="1" y2="1"><stop stop-color="#dca38a"/><stop offset=".55" stop-color="#edc3a3"/><stop offset="1" stop-color="#aa755e"/></linearGradient>
 <linearGradient id="leather" x2="1" y2="0"><stop stop-color="#17100c" stop-opacity=".14"/><stop offset=".14" stop-color="#fff2c3" stop-opacity=".18"/><stop offset=".52" stop-color="#ffe3a2" stop-opacity=".03"/><stop offset="1" stop-color="#26131f" stop-opacity=".18"/></linearGradient>
 <linearGradient id="night" x2="0" y2="1"><stop stop-color="#173c50"/><stop offset="1" stop-color="#719ca0"/></linearGradient>
 <linearGradient id="stone" x2="0" y2="1"><stop stop-color="#d1b59a"/><stop offset=".13" stop-color="#e5c6a4"/><stop offset="1" stop-color="#aa806d"/></linearGradient>
 <pattern id="grain" width="93" height="36" patternUnits="userSpaceOnUse"><path d="M-10 5Q13 2 34 6T102 4M-5 9Q29 15 93 9M0 17Q24 13 46 17T98 17M-4 27Q38 20 98 28M2 32Q42 29 95 34" fill="none" stroke="#604631" stroke-opacity=".38" stroke-width=".75"/><path d="M5 7q17 -5 33 0M47 24q13 -5 28 -1" stroke="#f4dba2" stroke-opacity=".35" fill="none"/><ellipse cx="60" cy="8" rx="12" ry="3.5" fill="none" stroke="#705133" stroke-opacity=".42" stroke-width=".6"/><ellipse cx="60" cy="8" rx="5" ry="1.5" fill="#5e412d" opacity=".18"/></pattern>
 <pattern id="cloth" width="5.1" height="4.7" patternUnits="userSpaceOnUse"><path d="M.8 0v4.7M3.3 0v4.7M0 1h5.1M0 3.4h5.1" stroke="#271c19" stroke-opacity=".13" stroke-width=".42"/><path d="M1.5 .5v1.3M4 2.7v1.4" stroke="#ffecd1" stroke-opacity=".18" stroke-width=".4"/></pattern>
 <pattern id="book-scuffs" width="67" height="53" patternUnits="userSpaceOnUse"><path d="M6 7l4-2m25 4l2 1m13 22l6-1M10 35l2-4m9 13h5m33 4l2-2M40 47l4-1" stroke="#ffe0af" stroke-opacity=".24" stroke-width=".65"/><path d="M13 16l5-1m24 15l2 3m8-29l4 1m-25 27l2 1" stroke="#271d18" stroke-opacity=".18" stroke-width=".7"/></pattern>
 <pattern id="paper" width="31" height="27" patternUnits="userSpaceOnUse"><path d="M1 4l3-1M12 15l2 1M6 24h2M22 8h2" stroke="#fff1cd" stroke-opacity=".17" stroke-width=".65"/><path d="M18 7h1M3 17h1M28 23l-2-1" stroke="#281e17" stroke-opacity=".18" stroke-width=".7"/></pattern>
 <pattern id="stone-grit" width="47" height="39" patternUnits="userSpaceOnUse"><path d="M3 6l5-2m7 5h3m18 4l3-3M7 25l4 2m14-7l6-1m-7 16h6" fill="none" stroke="#493e34" stroke-opacity=".22" stroke-width=".75"/><path d="M8 8l6-1m21 18l5-1m-31 9l3-1" stroke="#fff4d8" stroke-opacity=".32" stroke-width="1.1"/><circle cx="26" cy="8" r=".8" fill="#4e3f32" opacity=".3"/><circle cx="39" cy="34" r="1" fill="#4e3f32" opacity=".18"/></pattern>
 <pattern id="wall-hatch" width="19" height="19" patternUnits="userSpaceOnUse"><path d="M0 19L19 0M10 19L19 10" stroke="#392c29" stroke-opacity=".16" stroke-width=".5"/></pattern>
 <clipPath id="tile-clip"><rect width="1080" height="1120"/></clipPath>
</defs><metadata id="math-attribution">${esc(HAT_ATTRIBUTION)}</metadata>`;

function beam(x,y,w,h=18,vertical=false,quality='full'){
 const d=`M${x} ${y+1}Q${x+w*.3} ${y-1} ${x+w*.5} ${y+1}L${x+w} ${y}V${y+h}Q${x+w*.7} ${y+h+2} ${x+w*.4} ${y+h}H${x}Z`;
 if(quality==='distant'||quality==='preview')return `<g stroke="${INK}" stroke-width="1.8"><path d="${d}" transform="translate(0 5)" fill="#4f3e2d"/><path d="${d}" fill="url(#wood)"/><path d="M${x+2} ${y+3}h${w-4}" stroke="#e3c48c" stroke-width="1"/></g>`;
 return`<g stroke="${INK}" stroke-width="1.8"><path d="${d}" transform="translate(0 5)" fill="#4f3e2d"/><path d="${d}" fill="url(#wood)"/><path d="${d}" fill="url(#grain)" stroke="none"/><path d="M${x+2} ${y+3}h${w-4}" stroke="#f2d296" stroke-width="1"/>${vertical?`<path d="M${x+4} ${y+6}v${h-12}M${x+w-4} ${y+10}v${h-20}" stroke="#4b3629" stroke-opacity=".4" stroke-width=".8"/>`:''}<circle cx="${x+6}" cy="${y+h*.55}" r="1.9" fill="#5a422e"/><path d="M${x+5} ${y+h*.55}h2" stroke="#d7ae6b" stroke-width=".7"/><circle cx="${x+w-6}" cy="${y+h*.55}" r="1.7" fill="#5a422e"/></g>`;
}

function rotatedBounds(w,h,a){const t=a*Math.PI/180,c=Math.cos(t),s=Math.sin(t),xs=[0,w*c,h*s,w*c+h*s],ys=[0,w*s,-h*c,w*s-h*c];return{minX:Math.min(...xs),maxX:Math.max(...xs),minY:Math.min(...ys),maxY:Math.max(...ys)};}

function leaningCluster(x,base,available,maxH,seed,r,quality='full'){
 const requested=2+Math.floor(r()*3),widths=Array.from({length:requested},()=>17+r()*15),firstHeight=maxH*(.70+r()*.13);
 const leading=Math.max(6,Math.min(12,Math.atan2(26,firstHeight)*180/Math.PI));
 for(let count=requested;count>=2;count--){
  const volumes=[],contacts=[];let localX=0,height=firstHeight;
  for(let i=0;i<count;i++){
   const angle=leading*(1-i/(count-1)),a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a),width=widths[i],anchorY=base-width*s;
   volumes.push({x:localX,y:anchorY,width,height,angle});
   if(i<count-1){
    // This is the actual upper right cover corner used by renderBook, rather
    // than an empty corner of its rectangular bounding box.
    const contact={x:localX+(width-1)*c+(height-1.9)*s,y:anchorY+(width-1)*s-(height-1.9)*c};
    const nextAngle=leading*(1-(i+1)/(count-1))*Math.PI/180,nc=Math.cos(nextAngle),ns=Math.sin(nextAngle),leftEdge=1.595;
    const distance=(base-contact.y-(widths[i+1]-leftEdge)*ns)/nc;
    localX=contact.x-leftEdge*nc-distance*ns;height=distance+4.2;
    contacts.push({x:contact.x,y:contact.y,nextDistance:distance});
   }
  }
  const span=volumes.at(-1).x+volumes.at(-1).width;
  if(span>available||volumes.some(v=>{const b=rotatedBounds(v.width,v.height,v.angle);return v.y+b.minY<base-maxH+.5;}))continue;
  const metadata=quality==='metadata';
  let out=metadata?'':`<g class="leaning-cluster leaning-book-group" data-contact-count="${contacts.length}" data-contact-points="${contacts.map(p=>`${(x+p.x).toFixed(4)},${p.y.toFixed(4)}`).join(';')}" data-cluster-bounds="${x},${base-maxH},${span},${maxH}">`;
  volumes.forEach((v,i)=>{if(!metadata)out+=`<g class="leaning-volume" data-neighbor="${i}"${contacts[i]?` data-contact="${(x+contacts[i].x).toFixed(4)},${contacts[i].y.toFixed(4)}" data-contact-local="${v.width-1},${-v.height+1.9},1.595,${-contacts[i].nextDistance}"`:''}>`;out+=renderBook({x:x+v.x,y:v.y,width:v.width,height:v.height,angle:v.angle,id:Math.floor(r()*BOOKS.length),seed:hash(seed,i,'leaning'),detail:quality});if(!metadata)out+='</g>';});
  return{markup:out+(metadata?'':'</g>'),span,count};
 }
 return null;
}

function uprightRun(x,base,width,maxH,seed,untidy=true,quality='full'){
 if(maxH<55)return'';
 const r=random(seed),metadata=quality==='metadata';let s=metadata?'':`<g class="book-run upright-book-run" data-run-bounds="${x},${base-maxH},${width},${maxH}">`,cursor=x+2,i=0,clustered=false;
 while(cursor<x+width-13&&i<60){
  if(untidy&&!clustered&&i===1&&width>112&&maxH>95){
   const cluster=leaningCluster(cursor,base,x+width-cursor-2,maxH,hash(seed,i,'cluster'),r,quality);clustered=true;
   if(cluster){s+=cluster.markup;cursor+=cluster.span+.8;i+=cluster.count;continue;}
  }
  let w=17+r()*18,h=Math.max(48,maxH*(.66+r()*.31)),a=0;
  if(untidy){const lean=r();if(lean>.84)a=(r()-.5)*8;else if(lean>.62)a=(r()-.5)*2.6;}
  const remaining=x+width-cursor-2;
  if(remaining<w+13){w=remaining;a=0;}
  let box=rotatedBounds(w,h,a),span=box.maxX-box.minX;
  if(span>remaining){a=0;w=Math.min(w,remaining);box=rotatedBounds(w,h,a);span=w;}
  if(box.maxY-box.minY>maxH){h-=box.maxY-box.minY-maxH+.3;box=rotatedBounds(w,h,a);span=box.maxX-box.minX;}
  if(w<12)break;
  s+=renderBook({x:cursor-box.minX,y:base-box.maxY,width:w,height:h,angle:a,id:Math.floor(r()*BOOKS.length),seed:hash(seed,i),detail:quality});
  cursor+=span+.5+r()*.7;i++;
 }return s+(metadata?'':'</g>');
}
function flatStack(x,base,width,maxH,seed,quality='full'){
 if(width<68||maxH<12)return'';
 const r=random(seed),metadata=quality==='metadata';let s=metadata?'':`<g class="book-run stacked-book-run" data-run-bounds="${x},${base-maxH},${width},${maxH}">`,floor=base,i=0;
 while(floor>base-maxH+9&&i<24){
  const length=(width-4)*(.88+r()*.115),a=90+(r()-.5)*(r()>.83?1.6:.6),t=a*Math.PI/180,budget=floor-(base-maxH);
  let thickness=Math.min(10.5+r()*7.5,(budget-length*Math.abs(Math.cos(t)))/Math.abs(Math.sin(t)));
  if(thickness<8.5)break;
  if(budget-thickness<10)thickness=(budget-length*Math.abs(Math.cos(t)))/Math.abs(Math.sin(t));
  const b=rotatedBounds(thickness,length,a),span=b.maxX-b.minX,jitter=1+r()*Math.max(0,width-span-2);
  if(!metadata)s+=`<g class="stack-volume" data-stack-floor="${floor}" data-stack-height="${b.maxY-b.minY}">`;s+=renderBook({x:x+jitter-b.minX,y:floor-b.maxY,width:thickness,height:length,angle:a,id:Math.floor(r()*BOOKS.length),seed:hash(seed,i,'flat'),detail:quality});if(!metadata)s+='</g>';
  floor-=b.maxY-b.minY+1+r();i++;
 }return s+(metadata?'':'</g>');
}
function shelfBooks(x,base,width,height,seed,mode=0,quality='full'){
 if(width<14)return'';
 if(mode===2&&width>135){const stackWidth=Math.min(width*.48,190);return flatStack(x,base,stackWidth,height*.88,seed,quality)+uprightRun(x+stackWidth+1.2,base,width-stackWidth-1.2,height,hash(seed,'standing'),true,quality);}
 if(mode===3&&width>78&&width<205)return flatStack(x,base,width,height*.91,seed,quality);
 return uprightRun(x,base,width,height,seed,mode!==0,quality);
}

function stairLandings(layout){
 const landings=[];
 layout.rooms.forEach((q,room)=>{
  if(q.shape==='portal'||q.shape==='round'||q.width<95)return;
  const bending=q.shape==='curved'||q.shape==='folded',floor=bending?q.base-Math.max(14,Math.min(23,q.height*.078,q.width*.06)):q.base;
  const angle=q.angle||0,a=angle*Math.PI/180,c=Math.cos(a),s=Math.sin(a);
  const add=(localX,localY,kind,side)=>{
   const x=q.x+(localX-q.x)*c-(localY-q.base)*s,y=q.base+(localX-q.x)*s+(localY-q.base)*c;
   if(x>12&&x<W-12&&y>55&&y<H-23)landings.push({x,y,angle,room,col:q.col,row:q.row,kind,side});
  };
  add(q.x+8,floor,bending?'bending-floorboard':'shelf-floor','left');
  add(q.x+q.width-8,floor,bending?'bending-floorboard':'shelf-floor','right');
  if(q.shape==='stepped'&&q.width>230&&q.height>215){
   add(q.x+q.width*.51+8,q.base-q.height*.50,'stepped-upper','left');
   add(q.x+q.width-8,q.base-q.height*.50,'stepped-upper','right');
  }
 });
 return landings;
}

function stairCandidates(layout,seed){
 const landings=stairLandings(layout),pairs=[];
 for(const from of landings)for(const to of landings){
  const dx=Math.abs(to.x-from.x),rise=from.y-to.y;
  if(from.col!==to.col||from.side===to.side||rise<65||dx<85||rise>Math.min(485,dx*2.7)||Math.abs(from.row-to.row)>2)continue;
  const adjacent=Math.abs(from.row-to.row)===1,comfortable=rise<dx*1.6;
  const variation=hash(seed,from.room,to.room,from.kind,to.kind,from.side)/4294967296;
  pairs.push({from,to,score:(adjacent?100:20)+(comfortable?45:0)+18/(1+Math.abs(rise/dx-.70))+variation*15});
 }
 return pairs.sort((a,b)=>b.score-a.score);
}

function landingBoard(p,quality='full'){
 const depth=p.kind==='stepped-upper'?7:9;
 return`<g class="stair-landing" data-room="${p.room}" data-kind="${p.kind}" data-anchor="${p.x},${p.y}" transform="translate(${p.x} ${p.y}) rotate(${p.angle})"><path d="M-13 0H13V${depth}H-13Z" fill="url(#wood)" stroke="${INK}" stroke-width="1.4"/>${quality==='full'||quality==='compact'?`<path d="M-13 0H13V${depth}H-13Z" fill="url(#grain)"/>`:''}<path d="M-12 1.5H12" stroke="#e9c68c" stroke-width="1"/></g>`;
}

function connectedStairway(pair,seed,quality='full'){
 const{from,to}=pair,span=Math.abs(to.x-from.x),dy=to.y-from.y,dir=to.x>from.x?1:-1;
 const count=Math.max(6,Math.min(28,Math.ceil(Math.max(span/23,-dy/20)))),run=span/count,rise=dy/count,railHeight=31,brace=15;
 let steps='M0 0';
 for(let i=1;i<=count;i++){const x=i===count?span:i*run,y=i===count?dy:i*rise;steps+=`V${y}H${x}`;}
 let out=`<g class="stairway connected-stairway" data-start="${from.x},${from.y}" data-end="${to.x},${to.y}" data-from-room="${from.room}" data-to-room="${to.room}" data-start-kind="${from.kind}" data-end-kind="${to.kind}" data-actual-anchors="${from.x},${from.y};${to.x},${to.y}" data-tread-count="${count}" data-tread-run="${run}" data-tread-rise="${rise}" stroke="${INK}" stroke-linejoin="round"><title>A staircase between two shelf landings.</title><g transform="translate(${from.x} ${from.y})${dir<0?' scale(-1 1)':''}"><path class="stair-carriage" d="${steps}L${span} ${dy+brace}L0 ${brace}Z" fill="url(#wood)" stroke-width="1.7"/><path d="${steps}L${span} ${dy+brace}L0 ${brace}Z" fill="url(#grain)" stroke="none"/>`;
 for(let i=0;i<count;i++){
  const x=i*run,nextX=i===count-1?span:(i+1)*run,topY=i===count-1?dy:(i+1)*rise,oldY=i*rise;
  out+=`<path class="stair-riser" d="M${x} ${oldY}V${topY}H${nextX}" fill="none" stroke="#84644a" stroke-width="2.1"/><path class="stair-tread" d="M${x} ${topY}H${nextX}V${topY-4}H${x}Z" fill="url(#stone)" stroke-width="1.15"/><path d="M${x+.8} ${topY-.6}H${nextX-.8}" stroke="#ebcfaa" stroke-width=".9"/>`;
  if(quality==='full')out+=`<path d="M${x} ${topY}H${nextX}V${topY-4}H${x}Z" fill="url(#stone-grit)" stroke="none"/><path d="M${x+run*.22} ${topY+5}h${run*.45}" stroke="#745640" stroke-opacity=".6" stroke-width=".65"/>`;
 }
 let posts='',postHighlights='';
 for(let i=0;i<=count;i+=i===count?1:Math.min(2,count-i)){
  const x=i===count?span:i*run,y=i===count?dy:i*rise;
  posts+=`M${x} ${y}v${-railHeight}`;postHighlights+=`M${x+.7} ${y-1}v${1-railHeight}`;
 }
 out+=`<path class="stair-baluster" d="${posts}" stroke="#3f392d" stroke-width="3"/><path d="${postHighlights}" stroke="#b29c6d" stroke-width=".85"/><path class="stair-rail" data-local-start="0,${-railHeight}" data-local-end="${span},${dy-railHeight}" d="M0 ${-railHeight}L${span} ${dy-railHeight}" stroke="#332e25" stroke-width="5"/><path d="M0 ${-railHeight-1}L${span} ${dy-railHeight-1}" stroke="#c9ad79" stroke-width="1.8"/></g>${landingBoard(from,quality)}${landingBoard(to,quality)}</g>`;
 return out;
}

function connectedStairs(layout,seed,secondSeed,quality){
 const candidates=stairCandidates(layout,seed);if(!candidates.length)return'';
 const main=candidates[0];let out=connectedStairway(main,seed,quality);
 if(secondSeed!==null){
  const secondCandidates=stairCandidates(layout,secondSeed),other=secondCandidates.find(p=>p.from.col!==main.from.col)||secondCandidates.find(p=>!([p.from.room,p.to.room].some(i=>i===main.from.room||i===main.to.room)));
  if(other)out+=connectedStairway(other,secondSeed,quality);
 }
 return out;
}

function flyingBook(tx,ty,universe,quality,tilt){
 const pair=Math.floor(tx/2),side=((tx%2)+2)%2;
 if(side!==hash(universe,ty,pair,'flying-book-side')%2)return'';
 const seed=hash(universe,tx,ty,'book-flight'),r=random(seed),margin=100;
 const corners=[{x:105+r()*45,y:110+r()*55,quadrant:0},{x:W-105-r()*45,y:115+r()*70,quadrant:1},{x:W-110-r()*50,y:H-105-r()*55,quadrant:2},{x:110+r()*50,y:H-110-r()*45,quadrant:3}];
 const interiors=[{x:W*(.27+r()*.26),y:H*(.22+r()*.22)},{x:W*(.47+r()*.27),y:H*(.55+r()*.25)}];
 const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
 const order=shuffle(corners.slice()),slots=shuffle([0,1,2,3]);let points=[];
 order.forEach((p,i)=>{points.push(p);if(i===slots[0])points.push(interiors[0]);if(i===slots[1])points.push(interiors[1]);});
 if(r()>.5)points.reverse();
 const first=Math.floor(r()*points.length);points=points.slice(first).concat(points.slice(0,first));
 const start=points[0],factor=(.68+r()*.30)/6;
 // Symmetrically shorten each Catmull–Rom tangent near the case edges. Both
 // control handles stay in the bay and joined segments retain the same tangent.
 const tangents=points.map((p,i)=>{
  const before=points[(i+points.length-1)%points.length],after=points[(i+1)%points.length],vx=(after.x-before.x)*factor,vy=(after.y-before.y)*factor;
  const limit=Math.min(1,Math.abs(vx)>1e-8?Math.min(p.x-margin,W-margin-p.x)/Math.abs(vx):1,Math.abs(vy)>1e-8?Math.min(p.y-margin,H-margin-p.y)/Math.abs(vy):1);
  return{x:vx*Math.max(0,limit),y:vy*Math.max(0,limit)};
 });
 const fmt=p=>`${(p.x-start.x).toFixed(3)} ${(p.y-start.y).toFixed(3)}`;
 let path='M0 0';for(let i=0;i<points.length;i++){
  const next=(i+1)%points.length,p=points[i],q=points[next],a=tangents[i],b=tangents[next];
  path+=`C${fmt({x:p.x+a.x,y:p.y+a.y})} ${fmt({x:q.x-b.x,y:q.y-b.y})} ${fmt(q)}`;
 }path+='Z';
 const duration=35+(seed%25001)/1000;
 let waypoints=points.filter(p=>p.quadrant!==undefined&&p!==start);
 if(waypoints.length>3){
  let omit=0,best=-1;for(let i=0;i<waypoints.length;i++){
   const subset=[start,...waypoints.filter((_,j)=>j!==i)],xs=subset.map(p=>p.x),ys=subset.map(p=>p.y),area=(Math.max(...xs)-Math.min(...xs))*(Math.max(...ys)-Math.min(...ys));
   if(area>best){best=area;omit=i;}
  }waypoints=waypoints.filter((_,i)=>i!==omit);
 }
 const fallback=waypoints.map((p,i)=>`--flight-x${i+1}:${(p.x-start.x).toFixed(3)}px;--flight-y${i+1}:${(p.y-start.y).toFixed(3)}px;`).join('');
 return`<g class="floating-book" data-flight-tile="${tx},${ty}" data-flight-origin="${start.x},${start.y}" data-flight-pair="${pair},${ty}" transform="translate(${start.x} ${start.y})"><g class="flying-book-motion" data-flight-path="${path}" data-flight-duration="${duration}" data-flight-route="${points.map(p=>`${(p.x-start.x).toFixed(3)},${(p.y-start.y).toFixed(3)}`).join(';')}" data-flight-order="${points.map(p=>p.quadrant??'interior').join(',')}" data-flight-waypoints="${waypoints.map(p=>`${(p.x-start.x).toFixed(3)},${(p.y-start.y).toFixed(3)}`).join(';')}" style="--flight-path:path('${path}');--flight-duration:${duration}s;--flight-tilt:${tilt}deg;${fallback}">${motif('openbook',0,0,.7,seed,quality)}<path d="M-16 -29q-21 -17-27 -8q5 15 25 17M19 -29q18 -19 25 -9q-3 16-26 18" fill="#e9dfbd" stroke="${INK}" stroke-width="1"/></g></g>`;
}

function roomPath(q){const{x,width:w,top:t,base:b,shape}=q;if(shape==='arch'){const rise=Math.min(q.height*.33,w*.30);return`M${x} ${b}V${t+rise}Q${x+w*.5} ${t-rise*.75} ${x+w} ${t+rise}V${b}Z`;}return`M${x} ${t}H${x+w}V${b}H${x}Z`;}
const curios=['toyhouse','rockinghorse','fishbowl','cheese','owl','mantelclock','cuckooclock','hourglass','clock','mushrooms','toyboat','teapot','mouse','toyrobot','fox','plant','snail','telescope','openbook','moon','cat','balloon'];
const impossibleCurios=['penrosetriangle','impossiblecube','impossibletrident'];
const plantKinds=['fern','geranium','pothos','cactus'];
function discovery(kind,x,y,scale,seed,quality='full'){const id=DISCOVERIES.findIndex(d=>d.kind===kind),drawing=kind==='plant'?pottedPlant(plantKinds[seed%plantKinds.length],x,y,scale,seed,quality):motif(kind,x,y,scale,seed,quality);return`<g class="discovery" data-find="${id}" aria-label="${esc(kind)}"><title>Look closer: ${esc(kind)}</title>${drawing}</g>`;}
function plantedCompanion(x,y,scale,seed,quality='full'){const id=DISCOVERIES.findIndex(d=>d.kind==='plant');return`<g class="discovery" data-find="${id}" aria-label="Potted plant"><title>A little shelf garden</title>${pottedPlant(plantKinds[seed%plantKinds.length],x,y,scale,seed,quality)}</g>`;}

function miniature(seed){return previewMarkup(0,0,seed,false);}
function portalRoom(q,p,tx,ty,seed,includePortal,quality='full'){
 const x=q.x,t=q.top,b=q.base,w=q.width,arcY=p.y+8,cx=p.x+p.w/2;
 let s=`<path d="M${x} ${t}H${x+w}V${b}H${x}Z" fill="url(#plaster)" stroke="${INK}" stroke-width="2"/><path d="M${x} ${t}H${x+w}V${b}H${x}Z" fill="url(#stone-grit)"/><path d="M${p.x-9} ${p.y+p.h+6}V${arcY}Q${cx} ${p.y-57} ${p.x+p.w+9} ${arcY}V${p.y+p.h+6}Z" fill="#ae785c" stroke="${INK}" stroke-width="2.3"/><path d="M${p.x-3} ${p.y+p.h+3}V${arcY}Q${cx} ${p.y-43} ${p.x+p.w+3} ${arcY}V${p.y+p.h+3}Z" fill="#332e29" stroke="#e0b888" stroke-width="4"/>`;
 if(includePortal){const miniatureMarkup=miniature(p.seed);s+=`<svg class="portal" data-portal="${tx},${ty}" data-child="${p.seed}" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" viewBox="0 0 1080 1120" overflow="hidden"><title>A library inside a library. Zoom into this doorway.</title><g class="portal-content" data-seed="${p.seed}" data-initial-bytes="${miniatureMarkup.length}">${miniatureMarkup}</g></svg>`;}
 s+=`<path d="M${p.x-7} ${p.y+p.h+4}h${p.w+14}l-9 9H${p.x-16}Z" fill="url(#wood)" stroke="${INK}" stroke-width="1.7"/>`;
 const labelW=Math.min(w-18,150);s+=`<rect x="${cx-labelW/2}" y="${Math.max(t+8,p.y-49)}" width="${labelW}" height="18" rx="2" fill="#ebd39e" stroke="${INK}"/><text x="${cx}" y="${Math.max(t+8,p.y-49)+12}" text-anchor="middle" font-family="Georgia,serif" font-size="8" fill="${INK}" letter-spacing=".55">THE SMALLER LIBRARY</text>`;
 for(let i=0;i<8;i++){const a=i*Math.PI/7;s+=`<path d="M${cx+Math.cos(a)*(p.w*.52)} ${arcY-Math.sin(a)*30}l${Math.cos(a)*7} ${-Math.sin(a)*8}" stroke="#74513f" stroke-width="1"/>`;}
 return s;
}

function roomContents(q,index,layout,detail=true,quality='full'){
 const r=random(q.seed),localX=q.x,w=q.width,base=q.base,height=q.height;
 let s='',kind=curios[(index+layout.seed%curios.length)%curios.length];
 const ornamentSeed=hash(q.seed,'impossible-ornament');
 if(ornamentSeed%100<16)kind=impossibleCurios[Math.floor(ornamentSeed/100)%impossibleCurios.length];
 if(layout.seed===hash(0,0,17))kind=curios[index%curios.length];
 if(layout.seed===hash(0,0,17)&&[2,9,12].includes(index))kind=impossibleCurios[[2,9,12].indexOf(index)];
 if(q.shape==='penrose'||q.shape==='hat')return renderMathShelf(q,q.seed,detail,quality);
 if(q.shape==='curved'||q.shape==='folded'){
  const nook=bendingNook(q,q.seed);
  return renderBendingShelf(q,q.seed,detail,quality)+(nook?discovery(kind,nook.x,nook.y,nook.scale,q.seed,quality):'');
 }
 if(q.shape==='round'){
  const radius=Math.min(w*.48,height*.47),cx=localX+w/2,cy=q.top+height/2,ledge=cy+radius*.53,span=radius*1.55,clip=`circle-${layout.seed}-${index}`;
  s+=`<defs><clipPath id="${clip}"><circle cx="${cx}" cy="${cy}" r="${radius-8}"/></clipPath></defs><circle cx="${cx}" cy="${cy}" r="${radius}" fill="url(#wood)" stroke="${INK}" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${radius-8}" fill="url(#shelf-shadow)" stroke="#816140" stroke-width="2"/><circle cx="${cx}" cy="${cy}" r="${radius-2}" fill="none" stroke="#e2bc7b" stroke-width="1"/><g clip-path="url(#${clip})">`;
  s+=detail?flatStack(cx-span/2,ledge,span*.58,radius,q.seed,quality):'';
  s+=discovery(kind,cx+span*.22,ledge,Math.min(.95,radius/65),q.seed,quality)+beam(cx-span/2,ledge,span,12,false,quality)+'</g>';
  return s;
 }
 if(q.catalogue){
  const clearance=q.shape==='arch'?Math.min(height*.28,w*.24):0,usable=q.catalogue.x-localX-8;
  return shelfBooks(localX,base,usable,Math.min(335,height-clearance-14),q.seed,Math.floor(r()*4),quality)+catalogueDrawer(q.catalogue,quality)+beam(localX-4,base,w+8,18,false,quality);
 }
 const slope=q.angle?`translate(${localX} ${base}) rotate(${q.angle}) translate(${-localX} ${-base})`:'';
 s+=`<g${slope?` transform="${slope}"`:''}>`;
 const isGarden=(index+layout.seed)%7===2&&w>250&&height>185;
 const isImpossible=(index+layout.seed)%11===3&&w>225&&height>190;
 const objectScale=Math.min(1.08,(height-30)/125,w/235),objectWidth=110*objectScale;
 const objectX=localX+w-objectWidth*.52-9;
 let usable=w-objectWidth-16;
 if(isGarden){const scale=Math.min(1.3,(height-13)/165,w/280);const id=BOOKS.findIndex(b=>b.title==='The Secret Cardigan'),key=bookOccurrenceKey({x:-57,y:-6,width:113,height:155,id,seed:q.seed});s+=`<g class="book garden-volume" data-book="${id}" data-book-key="${key}"><title>The Secret Cardigan</title>${motif('gardenbook',localX+w*.5,base,scale,q.seed,quality)}</g>`;s+=shelfBooks(localX,base,w*.25,height-18,hash(q.seed,'left'),1,quality)+shelfBooks(localX+w*.77,base,w*.21,height-25,hash(q.seed,'right'),0,quality);}
 else if(isImpossible){s+=motif('impossible',localX+w*.5,base,Math.min(w/215,(height-14)/165),q.seed,quality);s+=discovery('owl',localX+w-28,base,.48,q.seed,quality)+discovery('cheese',localX+25,base,.43,q.seed,quality);}
 else if(q.shape==='stepped'&&w>230&&height>215){
  const middle=base-height*.50,shelfX=localX+w*.51;
  s+=shelfBooks(localX,base,w*.44,height-25,hash(q.seed,'tall'),1,quality)+shelfBooks(shelfX,middle,w*.46,height*.43,hash(q.seed,'upper'),2,quality)+beam(shelfX,middle,w*.49,13,false,quality);
  s+=shelfBooks(shelfX,base,w*.18,height*.43,hash(q.seed,'lower'),0,quality)+discovery(kind,localX+w*.80,base,Math.min(.9,height/270),q.seed,quality);
 }else{
  const clearance=q.shape==='arch'?Math.min(height*.28,w*.24):0;
  const plantScale=Math.min(.88,(height-clearance-20)/140,w/425);
  const planted=detail&&w>230&&height>160&&index%3===1;
  const plantWidth=planted?90*plantScale:0;
  usable-=plantWidth;
  s+=detail?shelfBooks(localX,base,usable,Math.min(335,height-clearance-14),q.seed,Math.floor(r()*4),quality):'';
  if(planted)s+=plantedCompanion(localX+usable+plantWidth*.50,base,plantScale,hash(q.seed,'pot'),quality);
  s+=discovery(kind,objectX,base,objectScale,q.seed,quality);
  if(kind==='owl'&&w>250)s+=discovery('cheese',objectX-44,base,.43,q.seed+1,quality);
  if(kind==='mouse')s+=discovery('cheese',objectX-45,base,.47,q.seed+1,quality);
  if(height>260&&r()>.65)s+=discovery('mouse',objectX-35,base,.46,q.seed+1,quality);
 }
 s+=beam(localX-4,base,w+8,16+r()*7,false,quality);
 return s+'</g>';
}

// Search walks exactly the same book-run generators as the drawing. It does
// not construct tiles, decorative SVG, portals, or browser DOM nodes.
function collectRoomBooks(q,index,layout){
 const x=q.x,w=q.width,base=q.base,height=q.height,quality='metadata',r=random(q.seed);
 if(q.shape==='portal')return;
 if(q.shape==='penrose'||q.shape==='hat'){
  withBookTransform([1,0,0,1,q.x,q.top],()=>{for(const cell of mathShelfGeometry(q,q.seed).cells)for(const book of cell.books)renderBook(book);});return;
 }
 if(q.shape==='curved'||q.shape==='folded'){
  withBookTransform([1,0,0,1,Number(q.x.toFixed(3)),Number(q.top.toFixed(3))],()=>collectBendingBooks(q,q.seed));return;
 }
 if(q.shape==='round'){
  const radius=Math.min(w*.48,height*.47),cx=x+w/2,cy=q.top+height/2,ledge=cy+radius*.53,span=radius*1.55;
  flatStack(cx-span/2,ledge,span*.58,radius,q.seed,quality);return;
 }
 if(q.catalogue){
  const clearance=q.shape==='arch'?Math.min(height*.28,w*.24):0;
  shelfBooks(x,base,q.catalogue.x-x-8,Math.min(335,height-clearance-14),q.seed,Math.floor(r()*4),quality);return;
 }
 const angle=(q.angle||0)*Math.PI/180,c=Math.cos(angle),s=Math.sin(angle),transform=[c,s,-s,c,x-x*c+base*s,base-x*s-base*c];
 withBookTransform(transform,()=>{
  const isGarden=(index+layout.seed)%7===2&&w>250&&height>185,isImpossible=(index+layout.seed)%11===3&&w>225&&height>190;
  if(isGarden){
   const scale=Math.min(1.3,(height-13)/165,w/280),id=BOOKS.findIndex(b=>b.title==='The Secret Cardigan');
   withBookTransform([scale,0,0,scale,x+w*.5,base],()=>renderBook({x:-57,y:-6,width:113,height:155,id,seed:q.seed}));
   shelfBooks(x,base,w*.25,height-18,hash(q.seed,'left'),1,quality);shelfBooks(x+w*.77,base,w*.21,height-25,hash(q.seed,'right'),0,quality);
  }else if(isImpossible)return;
  else if(q.shape==='stepped'&&w>230&&height>215){
   const middle=base-height*.50,shelfX=x+w*.51;
   shelfBooks(x,base,w*.44,height-25,hash(q.seed,'tall'),1,quality);shelfBooks(shelfX,middle,w*.46,height*.43,hash(q.seed,'upper'),2,quality);shelfBooks(shelfX,base,w*.18,height*.43,hash(q.seed,'lower'),0,quality);
  }else{
   const clearance=q.shape==='arch'?Math.min(height*.28,w*.24):0,plantScale=Math.min(.88,(height-clearance-20)/140,w/425),planted=w>230&&height>160&&index%3===1,plantWidth=planted?90*plantScale:0;
   const objectScale=Math.min(1.08,(height-30)/125,w/235),usable=w-110*objectScale-16-plantWidth;
   shelfBooks(x,base,usable,Math.min(335,height-clearance-14),q.seed,Math.floor(r()*4),quality);
  }
 });
}

const spatialBookCache=new Map(),SPATIAL_CACHE_LIMIT=36;
// Unrotated runs fit their room; only the surrounding room may rotate, by at
// most 4.1 degrees. Its pivot and all room points lie in this 1080×1120 bay,
// so hypot(W,H)*sin(5deg) <136 is a strict center-displacement bound. The 200
// unit halo also covers rounding and the special garden cover conservatively.
export const BOOK_TILE_HALO=200;

/** Main-world copies only: miniature doorway libraries belong to other seeds. */
export function getTileBooks(tx,ty,seed=1){
 const key=`${seed}:${tx}:${ty}`;
 if(spatialBookCache.has(key)){const cached=spatialBookCache.get(key);spatialBookCache.delete(key);spatialBookCache.set(key,cached);return cached.books;}
 const layout=shelfLayout(tx,ty,seed),books=captureBookGeometry(()=>withBookTransform([1,0,0,1,tx*W,ty*H],()=>layout.rooms.forEach((q,index)=>collectRoomBooks(q,index,layout))));
 const byId=new Map();
 for(const book of books){
  Object.assign(book,{tx,ty,seed});
  if(book.x<tx*W-BOOK_TILE_HALO||book.x>(tx+1)*W+BOOK_TILE_HALO||book.y<ty*H-BOOK_TILE_HALO||book.y>(ty+1)*H+BOOK_TILE_HALO)throw new RangeError('A book exceeds the spatial search tile halo.');
  if(!byId.has(book.bookId))byId.set(book.bookId,[]);byId.get(book.bookId).push(book);
 }
 spatialBookCache.set(key,{books,byId});while(spatialBookCache.size>SPATIAL_CACHE_LIMIT)spatialBookCache.delete(spatialBookCache.keys().next().value);
 return books;
}

function searchAbort(signal){if(signal?.aborted){const error=new Error('Book search cancelled.');error.name='AbortError';throw error;}}

/** Find the exact nearest cover center. The unvisited-ring lower bound includes
 * the tile halo; no fixed-radius approximation can silently choose a far copy.
 * Yielding between small tile batches keeps searches cancellable and responsive. */
export async function findNearestBook(bookId,{x,y,seed=1},{signal,yieldEvery=2,onProgress,maxRings=Infinity}={}){
 if(!Number.isInteger(bookId)||bookId<0||bookId>=BOOKS.length)throw new RangeError('Unknown book title.');
 if(![x,y,seed].every(Number.isFinite))throw new TypeError('Book search needs finite world coordinates and a library seed.');
 const cx=Math.floor(x/W),cy=Math.floor(y/H),batch=Math.max(1,Math.floor(yieldEvery)||1);
 let best=null,bestSquared=Infinity,examined=0,sliceStarted=performance.now();
 for(let radius=0;radius<=maxRings;radius++){
  const ring=[];
  if(!radius)ring.push([cx,cy]);else{
   for(let dx=-radius;dx<=radius;dx++){ring.push([cx+dx,cy-radius]);ring.push([cx+dx,cy+radius]);}
   for(let dy=-radius+1;dy<radius;dy++){ring.push([cx-radius,cy+dy]);ring.push([cx+radius,cy+dy]);}
  }
  for(const [tx,ty] of ring){
   searchAbort(signal);getTileBooks(tx,ty,seed);
   for(const book of spatialBookCache.get(`${seed}:${tx}:${ty}`).byId.get(bookId)||[]){
    const distance=(book.x-x)**2+(book.y-y)**2;
    if(distance<bestSquared||(distance===bestSquared&&book.occurrenceKey<(best?.occurrenceKey||''))){best=book;bestSquared=distance;}
   }
   examined++;
   if(examined%batch===0||performance.now()-sliceStarted>=8){onProgress?.({examined,radius,bestDistance:Math.sqrt(bestSquared)});await new Promise(resolve=>setTimeout(resolve,0));searchAbort(signal);sliceStarted=performance.now();}
  }
  const lowerBound=Math.max(0,Math.min(x-(cx-radius)*W-BOOK_TILE_HALO,(cx+radius+1)*W-x-BOOK_TILE_HALO,y-(cy-radius)*H-BOOK_TILE_HALO,(cy+radius+1)*H-y-BOOK_TILE_HALO));
  if(best&&bestSquared<=lowerBound*lowerBound){searchAbort(signal);return{...best,distance:Math.sqrt(bestSquared),examinedTiles:examined,searchRadius:radius};}
 }
 throw new RangeError('No nearest copy was established within the requested search extent.');
}

export function tileMarkup(tx,ty,universe=1,detail=true,includePortal=true,quality='full',pixelScale=Infinity){
 return withBookScale(pixelScale,()=>drawTile(tx,ty,universe,detail,includePortal,quality));
}

function drawTile(tx,ty,universe,detail,includePortal,quality){
 const layout=shelfLayout(tx,ty,universe),r=random(layout.seed),p=getPortal(tx,ty,universe),seed=layout.seed,rich=quality==='full'||quality==='compact';
 let s=`<g class="shelf-tile" data-tx="${tx}" data-ty="${ty}" data-quality="${quality}" data-layout="${layout.columns.length}:${layout.rooms.map(q=>q.shape).join(',')}" transform="translate(${tx*W} ${ty*H})" clip-path="url(#tile-clip)"><rect width="1080" height="1120" fill="#61503e"/><rect width="1080" height="1120" fill="url(#shelf-shadow)"/>${rich?'<rect width="1080" height="1120" fill="url(#wall-hatch)"/>':''}`;
 for(let i=0;i<layout.rooms.length;i++){
  const q=layout.rooms[i],clip=`room-${seed}-${i}`,d=roomPath(q);
  s+=`<g class="shelf-room" data-shape="${q.shape}" data-room-bounds="${q.x-16},${q.top-18},${q.width+32},${q.height+64}" data-width="${q.width.toFixed(2)}" data-height="${q.height.toFixed(2)}">${q.shape==='curved'||q.shape==='folded'?`<defs><clipPath id="${clip}"><path d="${d}"/></clipPath></defs>`:''}`;
  if(q.shape==='portal')s+=portalRoom(q,p,tx,ty,seed,includePortal,quality)+beam(q.x-4,q.base,q.width+8,20,false,quality);
  else{
   s+=`<path d="${d}" fill="url(#${backdrops[Math.floor(r()*backdrops.length)]})" stroke="${INK}" stroke-width="2"/>${rich?`<path d="${d}" fill="url(#paper)"/>`:''}`;
   if(q.shape==='arch')s+=`<path d="${d}" fill="none" stroke="url(#wood)" stroke-width="9"/><path d="${d}" fill="none" stroke="${INK}" stroke-width="1.2"/>`;
   const bending=q.shape==='curved'||q.shape==='folded';
   s+=(bending?`<g clip-path="url(#${clip})">`:'')+roomContents(q,i,layout,detail,quality)+(bending?'</g>':'');
  }
  s+='</g>';
 }
 for(const col of layout.columns)s+=beam(col.x-5,0,col.post,H,true,quality);
 s+=beam(W-12,0,15,H,true,quality);
 const source=layout.rooms.find(q=>q.shape==='portal');
 // Keep the decoration stream stable while deriving the new flight choices
 // from their own seed; existing ladders, notes, and plants keep their places.
 const stairSeed=hash(seed,'connected-landings',r(),r(),r(),r()),secondFlight=r()>.45,secondSeed=secondFlight?hash(seed,'second-landings',r(),r(),r(),r()):null;
 s+=connectedStairs(layout,stairSeed,secondSeed,quality);
 const ladderRooms=layout.rooms.filter(q=>q.shape!=='portal'&&q.height>170),ladderRoom=ladderRooms[seed%Math.max(1,ladderRooms.length)];
 if(ladderRoom){const scale=Math.min(1.9,(ladderRoom.height+80)/200);s+=`<g transform="translate(${ladderRoom.x+ladderRoom.width*.82} ${ladderRoom.base+12}) rotate(${r()>.5?-12:9})">${discovery('ladder',0,0,scale,seed,quality)}</g>`;}
 if(seed%3===1){const q=layout.rooms.find(q=>q.shape==='stepped')||layout.rooms[0];s+=discovery('ladder',q.x+q.width*.48,q.base,.85,seed+8,quality);}
 const paperRoom=layout.rooms[Math.floor(r()*layout.rooms.length)],flightTilt=(r()-.5)*25;
 s+=flyingBook(tx,ty,universe,quality,flightTilt);
 const gardenRooms=layout.rooms.filter((q,i)=>q.shape==='curved'||q.shape==='folded'||i%3===1);
 for(const q of gardenRooms){
  const vineSeed=hash(q.seed,'draped-vine'),drop=70+vineSeed%52;
  s+=trailingVine(q.x+4,q.base+7,q.width-8,drop,vineSeed,quality);
 }
 const portalSide=source.x+source.width-25,portalPotScale=Math.min(.62,source.height/360);
 if(source.width-p.w>95)s+=plantedCompanion(portalSide,source.base,portalPotScale,hash(seed,'door-garden'),quality);
 s+=`<g transform="translate(${paperRoom.x+10} ${paperRoom.base-70}) rotate(-11)" stroke="${INK}" stroke-width=".8"><path d="M0 0h30v42h-30Z" fill="#fff0cb"/><path d="M5 9h21M5 15h16M5 22h19M5 29h11" stroke="#9f8552"/></g>`;
 return s+`${rich?'<rect width="1080" height="1120" fill="url(#paper)" pointer-events="none"/>':''}</g>`;
}

export function overviewMarkup(tx,ty,universe=1,translated=true){
 const layout=shelfLayout(tx,ty,universe),r=random(layout.seed),quality='preview';let s=`<g${translated?` transform="translate(${tx*W} ${ty*H})"`:''}><rect width="1080" height="1120" fill="#443e32"/>`;
 for(const q of layout.rooms){
  const d=roomPath(q);s+=`<path d="${d}" fill="url(#${backdrops[hash(q.seed,'backdrop')%backdrops.length]})" stroke="#aa854f" stroke-width="9"/>`;
  if(q.shape==='penrose'||q.shape==='hat'){s+=overviewMathShelf(q,q.seed);continue;}
  if(q.shape==='curved'||q.shape==='folded'){s+=overviewBendingShelf(q,q.seed);continue;}
  if(q.shape==='round'){s+=`<circle cx="${q.x+q.width/2}" cy="${q.top+q.height/2}" r="${Math.min(q.width,q.height)*.43}" fill="#b88c60" stroke="#433629" stroke-width="8"/>`;continue;}
  const right=q.catalogue?q.catalogue.x-8:q.x+q.width;
  let x=q.x+2;while(x<right-12){const remaining=right-x-2,w=Math.min(17+r()*18,remaining),h=Math.max(45,(q.height-20)*(.5+r()*.43));s+=`<rect x="${x}" y="${q.base-h}" width="${w}" height="${h}" rx="1.2" fill="${colors[Math.floor(r()*colors.length)]}" stroke="#342d24" stroke-width="1.4"/><path d="M${x+3} ${q.base-h+8}h${w-6}M${x+3} ${q.base-8}h${w-6}" stroke="#e8cb88" stroke-width="1.25"/>`;x+=w+.5+r()*.7;}
  if(q.catalogue)s+=catalogueDrawer(q.catalogue,quality);
  s+=beam(q.x-3,q.base,q.width+6,17,false,quality);
 }
 for(const col of layout.columns)s+=beam(col.x-5,0,col.post,H,true,quality);
 return s+'</g>';
}

// A doorway only a few dozen pixels wide needs architectural silhouettes,
// not hundreds of individually fitted spines. The real room boundaries and
// mathematical tiles remain intact; close-up portal content is installed later.
export function previewMarkup(tx,ty,universe=1,translated=true){
 const layout=shelfLayout(tx,ty,universe),quality='preview';
 let out=`<g class="library-preview"${translated?` transform="translate(${tx*W} ${ty*H})"`:''}><rect width="${W}" height="${H}" fill="#443e32"/>`;
 for(const q of layout.rooms){
  out+=`<path d="${roomPath(q)}" fill="url(#${backdrops[hash(q.seed,'backdrop')%backdrops.length]})" stroke="#9b764e" stroke-width="7"/>`;
  if(q.shape==='penrose'||q.shape==='hat'){out+=overviewMathShelf(q,q.seed);continue;}
  if(q.shape==='curved'||q.shape==='folded'){out+=overviewBendingShelf(q,q.seed,'silhouette');continue;}
  const r=random(q.seed),count=4+q.seed%3,available=q.catalogue?q.catalogue.x-q.x-8:q.width,width=(available-12)/count;
  for(let i=0;i<count;i++){
   const h=(q.height-28)*(.48+r()*.43),x=q.x+5+i*width;
   out+=`<path d="M${x} ${q.base}V${q.base-h}h${width-2}V${q.base}Z" fill="${colors[Math.floor(r()*colors.length)]}"/>`;
  }
  if(q.catalogue)out+=catalogueDrawer(q.catalogue,quality);
  out+=beam(q.x-3,q.base,q.width+6,17,false,quality);
 }
 for(const col of layout.columns)out+=beam(col.x-5,0,col.post,H,true,quality);
 return out+'</g>';
}
