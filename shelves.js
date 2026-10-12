import { BOOKS } from './catalog.js';
import { renderBook } from './books.js';

const INK = '#382c27';
const num = value => Number(value.toFixed(3));
const hash = value => { let h = 2166136261; for (const c of String(value)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
function random(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function dimensions(q) {
  if (![q.x, q.width, q.top, q.base, q.height].every(Number.isFinite)) return null;
  const height = Math.min(q.height, q.base - q.top);
  return q.width > 40 && height > 55 ? { width: q.width, height, x: q.x, top: q.top, base: q.top + height, shape: q.shape === 'folded' ? 'folded' : 'curved' } : null;
}

function cubic(a, b, c, d, steps = 28) {
  const points = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps, u = 1 - t;
    points.push({ x: u*u*u*a.x + 3*u*u*t*b.x + 3*u*t*t*c.x + t*t*t*d.x, y: u*u*u*a.y + 3*u*u*t*b.y + 3*u*t*t*c.y + t*t*t*d.y });
  }
  return points;
}

function boardDepth(d) { return Math.max(14,Math.min(23,d.height*.078,d.width*.06)); }

function geometry(d) {
  const w = d.width, h = d.height, point = (x, y) => ({ x: w*x, y: h*y });
  const thickness = boardDepth(d), right = w-thickness-6;
  if (d.shape === 'curved') {
    const a = point(0,.76), b = point(.77,.70), c = {x:right,y:h*.475},e = point(.77,.24),f = point(0,.24);
    const points = [
      ...cubic(a,point(.24,.76),point(.53,.81),b),
      ...cubic(b,{x:right,y:h*.65},{x:right,y:h*.59},c).slice(1),
      ...cubic(c,{x:right,y:h*.32},point(.89,.24),e).slice(1),
      ...cubic(e,point(.53,.24),point(.25,.24),f).slice(1),
    ];
    return { thickness, paths: [points], order: [0], joins:[a,f,c],bookHeight:Math.min(108,h*.26,w*.25),description:'The lower shelf rises into the right case post, turns, and returns into the left post above.' };
  }
  const left=thickness+6,p=[{x:left,y:h*.76},{x:right,y:h*.57},{x:right,y:h*.21},{x:left,y:h*.33},{x:right,y:h*.88}];
  const paths = p.slice(0,-1).map((a, i) => [a,p[i+1]]);
  // The last leg is painted first. Its lower end emerges on the other side of
  // the foremost shelf, making the impossible over-and-under fold visible.
  return {thickness,paths,order:[3,2,1,0],joins:p,bookHeight:Math.min(104,h*.205,w*.205),description:'Case shelves fold around both side posts, with a returning rail passing behind the front shelf.'};
}

function metrics(points) {
  const lengths = [0];
  for (let i = 1; i < points.length; i++) lengths.push(lengths[i-1] + Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y));
  return { points, lengths, length: lengths.at(-1), normals:points.map((_,i)=>normalAt(points,i)) };
}

function onPath(m, distance) {
  const s = Math.max(0,Math.min(m.length,distance));
  let lo=1,hi=m.lengths.length-1;
  while(lo<hi){const mid=(lo+hi)>>1;if(m.lengths[mid]<s)lo=mid+1;else hi=mid;}
  const i=lo;
  const a = m.points[i-1], b = m.points[i], length = m.lengths[i]-m.lengths[i-1], t = length ? (s-m.lengths[i-1])/length : 0;
  const tx = (b.x-a.x)/length, ty = (b.y-a.y)/length;
  return { x: a.x+(b.x-a.x)*t, y: a.y+(b.y-a.y)*t, tx, ty, angle: Math.atan2(ty,tx)*180/Math.PI };
}

function normalAt(points, i) {
  const a = points[Math.max(0,i-1)], b = points[Math.min(points.length-1,i+1)], length = Math.hypot(b.x-a.x,b.y-a.y);
  return { x: (b.y-a.y)/length, y: -(b.x-a.x)/length };
}

function linePath(points, offset = 0, normals) {
  return points.map((p,i) => { const n = normals?.[i]??normalAt(points,i); return `${i?'L':'M'}${num(p.x+n.x*offset)} ${num(p.y+n.y*offset)}`; }).join('');
}

function ribbonPath(points, thickness, normals) {
  return linePath(points,0,normals) + [...points].reverse().map((p,j) => { const n = normals?.[points.length-1-j]??normalAt(points,points.length-1-j); return `L${num(p.x-n.x*thickness)} ${num(p.y-n.y*thickness)}`; }).join('') + 'Z';
}

function woodenRibbon(points, thickness, index, shape, detail, quality, m) {
  const fine = quality === 'full' || quality === 'compact';
  const face = ribbonPath(points,thickness,m.normals), top = ribbonPath(points,-2.5,m.normals), line = linePath(points,0,m.normals), shadow = ribbonPath(points,thickness+2,m.normals);
  let out = `<g class="bending-ribbon shelf-ribbon-${index}" data-return="${index>0||shape==='curved'}">
    <path class="shelf-depth" d="${shadow}" transform="translate(2.6 4)" fill="${INK}" opacity=".72" stroke="${INK}" stroke-width="1.2"/>
    <path class="shelf-face" d="${face}" fill="url(#wood)" stroke="${INK}" stroke-width="1.7" stroke-linejoin="round"/>
    ${fine?`<path d="${face}" fill="url(#grain)" stroke="none"/>`:''}
    <path class="shelf-top" d="${top}" fill="url(#wood)" stroke="${INK}" stroke-width=".65"/>
    <path d="${line}" fill="none" stroke="#e6c386" stroke-width="1.2"/>
    <path d="${linePath(points,-thickness*.66,m.normals)}" fill="none" stroke="#664a31" stroke-width=".7" opacity=".6"/>`;
  if (detail && quality === 'full') {
    const count = Math.max(1,Math.floor(m.length/78));
    for (let i=0;i<count;i++) {
      const p = onPath(m,(i+.5)*m.length/count), nx=p.ty, ny=-p.tx, xx=p.x-nx*thickness*.55, yy=p.y-ny*thickness*.55;
      out += `<g transform="translate(${num(xx)} ${num(yy)}) rotate(${num(p.angle)})"><ellipse rx="5.6" ry="1.5" fill="none" stroke="#684b31" stroke-width=".65" opacity=".7"/><ellipse rx="2.1" ry=".65" fill="#65452f" opacity=".4"/><path d="M-13 2q7 -2 15 -1M-8 -3q8 1 15 -1" fill="none" stroke="#f0d6a0" stroke-width=".5" opacity=".65"/></g>`;
    }
  }
  return out + '</g>';
}

function bookCorners(p, width, height) {
  // The book's bottom center sits on P, and its upward normal is intentionally
  // upside down on a returning arm. All four corners stay in the room.
  const x = p.x-p.tx*width/2, y = p.y-p.ty*width/2;
  return { x, y, corners: [[0,0],[width,0],[0,-height],[width,-height]].map(([a,b]) => ({ x:x+a*p.tx-b*p.ty, y:y+a*p.ty+b*p.tx })) };
}

function booksAlong(points, d, g, seed, index, detail, quality, m) {
  const r = random(hash(`${seed}:${index}:bending-books`));
  const nominal = Math.max(10,Math.min(22,d.width*.049));
  let cursor = Math.max(9,g.thickness), out = '', i = 0;
  while (cursor < m.length-10 && i < 90) {
    const width = nominal*(.77+r()*.39), center = cursor+width/2;
    if (center+width/2 > m.length-8) break;
    const p = onPath(m,center), angle = ((p.angle%360)+360)%360;
    const turn = d.shape==='curved' && angle>195 && angle<330 ? .73 : 1;
    let height = Math.max(23,g.bookHeight*(.70+r()*.28)*turn), box = bookCorners(p,width,height);
    for (let attempts=0; attempts<16 && box.corners.some(c=>c.x<3||c.x>d.width-3||c.y<3||c.y>d.height-3); attempts++) { height*=.88; box=bookCorners(p,width,height); }
    if (height>=17 && box.corners.every(c=>c.x>=2&&c.x<=d.width-2&&c.y>=2&&c.y<=d.height-2) && !occupiesNook(box.corners,d)) {
      out += `<g class="shelf-following-book" data-shelf-path="${index}" data-path-distance="${num(center)}" data-tangent-angle="${num(p.angle)}" data-anchor="${num(p.x)},${num(p.y)}">`;
      out += renderBook({x:box.x,y:box.y,width,height,angle:p.angle,id:Math.floor(r()*BOOKS.length),seed:hash(`${seed}:${index}:${i}:spine`),detail:detail?quality:'preview'});
      out += '</g>';
    }
    cursor += width+.55+r()*.45; i++;
  }
  return out;
}

function nookGeometry(d) {
  if (d.shape==='curved')return{x:d.width*.145,y:d.height*.505,width:d.width*.29,scale:Math.min(.64,d.width/720,d.height/460)};
  return{x:d.width*.80,y:d.height-boardDepth(d),width:d.width*.22,scale:Math.min(.65,d.width/720,d.height/440)};
}

function occupiesNook(corners,d) {
  const p=nookGeometry(d),minX=Math.min(...corners.map(c=>c.x)),maxX=Math.max(...corners.map(c=>c.x)),minY=Math.min(...corners.map(c=>c.y)),maxY=Math.max(...corners.map(c=>c.y));
  return maxX>p.x-p.width*.51&&minX<p.x+p.width*.51&&maxY>p.y-p.scale*112-4&&minY<p.y+(d.shape==='curved'?boardDepth(d)*.8+4:3);
}

/** A reliable flat ledge for one of the library's small inhabitants. */
export function bendingNook(q,seed=1) {
  const d=dimensions(q); if(!d)return null;
  const nook=nookGeometry(d);
  return {x:q.x+nook.x,y:q.top+nook.y,scale:nook.scale};
}

function littleLedge(d,thickness,quality) {
  const p=nookGeometry(d);
  if(d.shape==='folded')return`<g class="bending-nook floorboard-nook" data-nook="${num(p.x)},${num(p.y)},${num(p.scale)}"/>`;
  const x=0,t=thickness*.8,y=p.y,bracket=Math.min(18,d.height*.07),run=Math.min(19,p.width*.19);
  const face=`M${num(x)} ${num(y)}h${num(p.width)}v${num(t)}h${num(-p.width)}Z`;
  const fine=quality==='full'||quality==='compact';
  return `<g class="bending-nook post-joined-nook" data-nook="${num(p.x)},${num(p.y)},${num(p.scale)}"><path d="${face}" fill="url(#wood)" stroke="${INK}" stroke-width="1.5"/>${fine?`<path d="${face}" fill="url(#grain)"/>`:''}<path d="M1 ${num(y+1.8)}h${num(p.width-2)}" stroke="#e2bd7e" stroke-width="1"/><path d="M7 ${num(y+t)}v${num(bracket)}l${num(run)} ${num(-bracket)}M${num(p.width-8)} ${num(y+t)}v${num(bracket)}l${num(-run)} ${num(-bracket)}" fill="none" stroke="${INK}" stroke-width="2.4"/>${fine?`<rect x="2.5" y="${num(y+t*.25)}" width="8" height="${num(t*.5)}" rx="1.1" fill="none" stroke="${INK}" stroke-width=".6"/><path d="M5.5 ${num(y+t*.5)}h2" stroke="#edd09a" stroke-width=".7"/>`:''}</g>`;
}

function foldedJoints(g,quality) {
  let out='';
  for(let i=0;i<g.paths.length-1;i++) {
    const a=g.paths[i].at(-1),p0=g.paths[i][0],p1=g.paths[i+1][1];
    const length0=Math.hypot(a.x-p0.x,a.y-p0.y),length1=Math.hypot(p1.x-a.x,p1.y-a.y);
    const n0={x:(a.y-p0.y)/length0,y:-(a.x-p0.x)/length0},n1={x:(p1.y-a.y)/length1,y:-(p1.x-a.x)/length1};
    const t=g.thickness, path=`M${num(a.x)} ${num(a.y)}L${num(a.x-n0.x*t)} ${num(a.y-n0.y*t)}L${num(a.x-n1.x*t)} ${num(a.y-n1.y*t)}Z`;
    out+=`<path class="fold-endgrain" d="${path}" fill="url(#wood)" stroke="${INK}" stroke-width="1.3"/>${quality==='full'||quality==='compact'?`<path d="${path}" fill="url(#grain)" opacity=".7"/>`:''}`;
  }
  return out;
}

function casePosts(d,g,detail,quality) {
  const t=g.thickness,post=Math.max(10,Math.min(17,t*.65));
  let out=`<g class="bending-case-frame" data-left-edge="0" data-right-edge="${num(d.width)}" data-board-depth="${num(t)}">`;
  for(const x of [0,d.width-post]) {
    out+=`<rect class="case-support-post" x="${num(x)}" y="0" width="${num(post)}" height="${num(d.height)}" fill="url(#wood)" stroke="${INK}" stroke-width="1.5"/>${quality==='full'||quality==='compact'?`<rect x="${num(x)}" y="0" width="${num(post)}" height="${num(d.height)}" fill="url(#grain)"/>`:''}<path d="M${num(x+2)} 3v${num(d.height-6)}M${num(x+post-2)} 4v${num(d.height-8)}" stroke="#dcb97c" stroke-width=".7" opacity=".7"/>`;
  }
  const y=d.height-t;
  out+=`<path class="bending-floorboard" d="M0 ${num(y)}H${num(d.width)}V${num(d.height)}H0Z" fill="url(#wood)" stroke="${INK}" stroke-width="1.6"/>${quality==='full'||quality==='compact'?`<path d="M0 ${num(y)}H${num(d.width)}V${num(d.height)}H0Z" fill="url(#grain)"/>`:''}<path d="M1 ${num(y+2.1)}h${num(d.width-2)}" stroke="#e6c385" stroke-width="1.4"/>`;
  if(detail)for(const x of [post*.55,d.width-post*.55])out+=`<circle cx="${num(x)}" cy="${num(d.height-t*.5)}" r="1.8" fill="${INK}" opacity=".85"/><path d="M${num(x-1)} ${num(d.height-t*.5)}h2" stroke="#e8b665" stroke-width=".6"/>`;
  return out+'</g>';
}

function caseJoinery(d,g,detail,quality) {
  const t=g.thickness,post=Math.max(10,Math.min(17,t*.65));
  let out='<g class="case-shelf-joinery" data-anchored="true">';
  for(const p of g.joins) {
    const right=p.x>d.width*.5,x=right?Math.max(d.width-t-8,p.x):0,width=right?d.width-x:Math.max(post,p.x+3),top=Math.max(2,p.y-2),depth=Math.min(t+3,d.height-top-2);
    out+=`<path class="post-shelf-mortise" d="M${num(x)} ${num(top)}h${num(width)}v${num(depth)}h${num(-width)}Z" fill="url(#wood)" stroke="${INK}" stroke-width="1.2"/>${quality==='full'||quality==='compact'?`<path d="M${num(x)} ${num(top)}h${num(width)}v${num(depth)}h${num(-width)}Z" fill="url(#grain)"/>`:''}<path d="M${num(x+1)} ${num(top+2)}h${num(width-2)}" stroke="#dbb577" stroke-width="1"/>`;
    if(detail){const cx=right?d.width-post*.5:post*.5,cy=top+depth*.53;out+=`<rect x="${num(cx-3)}" y="${num(cy-2.1)}" width="6" height="4.2" rx=".6" fill="none" stroke="${INK}" stroke-width=".7"/><path d="M${num(cx-1)} ${num(cy)}h2" stroke="${INK}" stroke-width=".85"/>`;}
  }
  return out+'</g>';
}

function render(q,seed,detail,quality='full') {
  const d=dimensions(q); if(!d)return'';
  const g=geometry(d);
  let out=`<g class="bending-shelf shelf-bending shelf-${d.shape}${detail?'':' overview-bending-shelf'}" data-shape="${d.shape}" data-geometry="${d.shape==='curved'?'continuous-hairpin-return':'four-leg-crossing-return'}" data-anchored="true" data-room-x="${num(d.x)}" data-room-top="${num(d.top)}" data-width="${num(d.width)}" data-height="${num(d.height)}" data-floor="${num(d.base)}" transform="translate(${num(d.x)} ${num(d.top)})"><title>${g.description}</title>`;
  out+=casePosts(d,g,detail&&quality==='full',quality);
  for(const index of g.order) {
    const m=metrics(g.paths[index]);
    if(quality!=='silhouette')out+=booksAlong(g.paths[index],d,g,seed,index,detail,quality,m);
    out+=woodenRibbon(g.paths[index],g.thickness,index,d.shape,detail,quality,m);
  }
  if(d.shape==='folded')out+=foldedJoints(g,quality);
  out+=littleLedge(d,g.thickness,quality);
  out+=caseJoinery(d,g,detail&&quality==='full',quality);
  return out+'</g>';
}

/** A substantial architectural return, with books following the whole tangent. */
export function renderBendingShelf(q,seed=1,detail=true,quality='full') { return render(q,seed,detail,quality); }

/** The same shelf geometry with inexpensive colored book shapes for miniatures. */
export function overviewBendingShelf(q,seed=1,quality='preview') { return render(q,seed,false,quality); }
