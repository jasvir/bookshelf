// Original vector foliage. Pots sit on y=0; trailing vines stay inside their
// supplied width and drop, with the longest shoots at the edges of the shelf.
const INK = '#34402d';
const CHARTREUSE = '#b6cc3b';
const LEAF = '#79b347';
const DEEP = '#438844';
const YELLOW = '#f3cf3f';
const MAGENTA = '#d75291';
const SCARLET = '#e76047';
const num = value => Number(value.toFixed(3));
const path = (d, color = INK, width = .8, opacity = 1) => `<path d="${d}" fill="none" stroke="${color}" stroke-width="${width}" opacity="${opacity}"/>`;
const dot = (x, y, r, color) => `<circle cx="${num(x)}" cy="${num(y)}" r="${r}" fill="${color}" stroke="none"/>`;
const distant = quality => quality === 'distant' || quality === 'preview';
const leafShapes = {
  heart:'M0 0C-6 -7 -13 -4 -10 3C-8 8 -2 11 0 16C3 11 10 8 11 2C13 -5 6 -7 0 0Z',
  ivy:'M0 0L-10 -3L-8 4L-13 7L-5 9L0 17L5 9L13 7L8 4L10 -3Z',
  fern:'M0 0Q-6 -5 0 -15Q6 -6 0 0Z',
  geranium:'M0 0Q-12 2 -13 -5Q-20 -12 -11 -14Q-12 -23 -4 -19Q2 -27 6 -19Q16 -22 15 -14Q24 -10 15 -4Q15 4 4 1Z',
};
const shapeCommands = new Map();
let flowerSilhouette;

function convexHull(points) {
  const sorted=points.sort((a,b)=>a[0]-b[0]||a[1]-b[1]);
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  const half=list=>{
    const out=[];
    for(const point of list){while(out.length>1&&cross(out.at(-2),out.at(-1),point)<=0)out.pop();out.push(point);}
    return out;
  };
  return half(sorted).slice(0,-1).concat(half(sorted.slice().reverse()).slice(0,-1));
}

// Bézier curves lie inside their control-point hulls. Separating these hulls is
// a conservative proof that silhouettes do not overlap, including the paired
// fern leaflets that touch at their stems but occupy opposite sides of a frond.
function hullsOverlap(a,b) {
  for(const polygon of [a,b])for(let i=0;i<polygon.length;i++) {
    const p=polygon[i],q=polygon[(i+1)%polygon.length],nx=q[1]-p[1],ny=p[0]-q[0];
    const projection=points=>points.map(point=>point[0]*nx+point[1]*ny);
    const pa=projection(a),pb=projection(b);
    if(Math.max(...pa)<=Math.min(...pb)+1e-6||Math.max(...pb)<=Math.min(...pa)+1e-6)return false;
  }
  return true;
}

// Only the controlled, absolute M/L/C/Q/Z silhouettes below pass through this
// small converter. Bake their transforms once, so many leaves can share a path
// without retaining a transform-bearing SVG element for each leaf.
function transformedShape(d,x,y,scale,angle) {
  let commands=shapeCommands.get(d);
  if(!commands) {
    commands=Array.from(d.matchAll(/([MLCQZ])([^MLCQZ]*)/g),match=>({command:match[1],values:(match[2].match(/-?\d*\.?\d+/g)||[]).map(Number)}));
    shapeCommands.set(d,commands);
  }
  const radians=angle*Math.PI/180,c=Math.cos(radians)*scale,s=Math.sin(radians)*scale;
  const bounds=[Infinity,Infinity,-Infinity,-Infinity];
  const points=[];
  const result=commands.map(({command,values})=>command+values.map((value,index)=>{
    if(index%2)return null;
    const px=x+value*c-values[index+1]*s,py=y+value*s+values[index+1]*c;
    points.push([px,py]);
    bounds[0]=Math.min(bounds[0],px);bounds[1]=Math.min(bounds[1],py);
    bounds[2]=Math.max(bounds[2],px);bounds[3]=Math.max(bounds[3],py);
    return `${num(px)} ${num(py)}`;
  }).filter(value=>value!==null).join(' ')).join('');
  return {d:result,bounds,hull:convexHull(points)};
}

function silhouette(shape,x,y,scale,angle,color) {
  const baked=transformedShape(shape,x,y,scale,angle);
  return `<path data-foliage-batch="${baked.bounds.map(num).join(',')}" data-foliage-hull="${baked.hull.map(point=>point.map(num).join(',')).join(';')}" d="${baked.d}" fill="${color}" stroke="none"/>`;
}

// Batch only consecutive, opaque silhouettes whose conservative bounds do not
// overlap. Other artwork and every overlap flush the pending batch, preserving
// the original paint order and avoiding changes to alpha compositing.
function batchSilhouettes(markup) {
  const candidates=/<path data-foliage-batch="([^"]+)" data-foliage-hull="([^"]+)" d="([^"]+)" fill="([^"]+)" stroke="none"\/>/g;
  let out='',end=0,pending=[];
  const flush=()=>{
    const colors=new Map();
    for(const item of pending)colors.set(item.color,(colors.get(item.color)||'')+item.d);
    for(const [color,d] of colors)out+=`<path d="${d}" fill="${color}" stroke="none"/>`;
    pending=[];
  };
  for(const match of markup.matchAll(candidates)) {
    const gap=markup.slice(end,match.index);
    if(gap.trim()){flush();out+=gap;}
    const bounds=match[1].split(',').map(Number);
    const hull=match[2].split(';').map(point=>point.split(',').map(Number));
    if(pending.some(item=>bounds[0]<item.bounds[2]&&bounds[2]>item.bounds[0]&&bounds[1]<item.bounds[3]&&bounds[3]>item.bounds[1]&&hullsOverlap(item.hull,hull)))flush();
    pending.push({bounds,hull,d:match[3],color:match[4]});
    end=match.index+match[0].length;
  }
  flush();
  return out+markup.slice(end);
}
function random(seed) {
  return () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t ^= t + Math.imul(t ^ t >>> 7, 61 | t); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}

function heartLeaf(x, y, scale, angle, color = LEAF, marbled = false, quality = 'full') {
  if(distant(quality))return silhouette(leafShapes.heart,x,y,scale,angle,color);
  if(quality==='compact') {
    const transform=`translate(${num(x)} ${num(y)}) rotate(${num(angle)}) scale(${num(scale)})`;
    return `<path class="foliage-leaf" data-leaf-kind="heart" transform="${transform}" d="M0 0C-6 -7 -13 -4 -10 3C-8 8 -2 11 0 16C3 11 10 8 11 2C13 -5 6 -7 0 0Z" fill="${color}"/><path transform="${transform}" d="M-2 -1Q-10 -5 -8 3Q-5 9 -1 11Q-4 4 -2 -1Z" fill="${marbled?'#dfd74d':'#c4d858'}" stroke="none" opacity=".8"/>`;
  }
  return `<g class="foliage-leaf" data-leaf-kind="heart" transform="translate(${num(x)} ${num(y)}) rotate(${num(angle)}) scale(${num(scale)})">
    <path d="M0 0C-6 -7 -13 -4 -10 3C-8 8 -2 11 0 16C3 11 10 8 11 2C13 -5 6 -7 0 0Z" fill="${color}"/>
    <path d="M-2 -1Q-10 -5 -8 3Q-5 9 -1 11Q-4 4 -2 -1Z" fill="${marbled ? '#dfd74d' : '#c4d858'}" stroke="none" opacity=".8"/>
    ${quality==='compact'?'':path('M0 0Q1 8 0 15M0 4l-5 -3M1 7l6 -4M1 10l-5 -3M1 12l5 -3', '#437337', .6, .85)+path('M-7 1q-2 3 2 5', '#e4e77a', .55, .8)}
  </g>`;
}

function ivyLeaf(x, y, scale, angle, color = DEEP, marbled = false, quality = 'full') {
  if(distant(quality))return silhouette(leafShapes.ivy,x,y,scale,angle,color);
  if(quality==='compact') {
    const transform=`translate(${num(x)} ${num(y)}) rotate(${num(angle)}) scale(${num(scale)})`;
    return `<path class="foliage-leaf" data-leaf-kind="ivy" transform="${transform}" d="M0 0L-10 -3L-8 4L-13 7L-5 9L0 17L5 9L13 7L8 4L10 -3Z" fill="${color}"/><path transform="${transform}" d="M0 1L-8 0L-5 5L-9 7L-3 8L0 14Z" fill="#a4bf45" stroke="none" opacity=".9"/>`;
  }
  return `<g class="foliage-leaf" data-leaf-kind="ivy" transform="translate(${num(x)} ${num(y)}) rotate(${num(angle)}) scale(${num(scale)})">
    <path d="M0 0L-10 -3L-8 4L-13 7L-5 9L0 17L5 9L13 7L8 4L10 -3Z" fill="${color}"/>
    <path d="M0 1L-8 0L-5 5L-9 7L-3 8L0 14Z" fill="#a4bf45" stroke="none" opacity=".9"/>
    ${quality==='compact'?'':path('M0 0v15M0 4l-7 -4M0 6l7 -6M0 9l-9 -2M0 10l9 -3', '#d2dc68', .6, .9)}
  </g>`;
}

function blade(x, y, scale, angle, color = LEAF, quality = 'full') {
  if(distant(quality))return silhouette(leafShapes.fern,x,y,scale,angle,color);
  if(quality==='compact')return `<path class="foliage-leaf" data-leaf-kind="fern" transform="translate(${num(x)} ${num(y)}) rotate(${num(angle)}) scale(${num(scale)})" d="M0 0Q-6 -5 0 -15Q6 -6 0 0Z" fill="${color}" stroke-width=".8"/>`;
  return `<g class="foliage-leaf" data-leaf-kind="fern" transform="translate(${num(x)} ${num(y)}) rotate(${num(angle)}) scale(${num(scale)})">
    <path d="M0 0Q-6 -5 0 -15Q6 -6 0 0Z" fill="${color}" stroke-width=".8"/>
    ${quality==='compact'?'':`<path d="M0 -1Q-2 -8 0 -14" fill="none" stroke="#d3df64" stroke-width=".8"/>`+path('M-1 -5l-2 -2m3 -1l2 -2', '#447736', .55, .8)}
  </g>`;
}

function flower(x, y, scale, color = MAGENTA, seed = 0, quality = 'full') {
  if(distant(quality)) {
    if(!flowerSilhouette) {
      const ellipse='M2.8 -4.5C2.8 -1.96 1.546 .1 0 .1C-1.546 .1 -2.8 -1.96 -2.8 -4.5C-2.8 -7.04 -1.546 -9.1 0 -9.1C1.546 -9.1 2.8 -7.04 2.8 -4.5Z';
      flowerSilhouette=Array.from({length:5},(_,i)=>transformedShape(ellipse,0,0,1,i*72).d).join('');
    }
    // At this scale keep each bloom's color and five-petal silhouette. Fine
    // alternating petal shading reappears in compact/full; identical opaque
    // petals have the same winding and can safely share one compound path.
    const bloom=`<path transform="translate(${num(x)} ${num(y)}) rotate(${seed%25}) scale(${num(scale)})" d="${flowerSilhouette}" fill="${color}" stroke="none"/>`;
    return bloom+dot(x,y,num(2.5*scale),YELLOW);
  }
  const petals = Array.from({length:5}, (_, i) => `<ellipse cx="0" cy="-4.5" rx="2.8" ry="4.6" transform="rotate(${i * 72})" fill="${i % 2 ? color : color === MAGENTA ? '#ea73aa' : '#f98555'}" stroke-width=".55"/>`).join('');
  return `<g class="foliage-flower" transform="translate(${num(x)} ${num(y)}) rotate(${seed % 25}) scale(${num(scale)})">${petals}${dot(0, 0, 2.5, YELLOW)}${quality==='compact'?'':dot(-.6, -.7, .7, '#fff2a0')+path('M1 1l.6 .6', '#9a7833', .55)}</g>`;
}

function pot(seed, preferred = 0, quality = 'full') {
  const variety = (Math.abs(Math.trunc(seed)) + preferred) % 3;
  const palettes = [
    {body:'#4975c5',dark:'#2e4d91',light:'#8dbde0',rim:'#7ea8d8'},
    {body:'#ab83cd',dark:'#78579d',light:'#d7b9e8',rim:'#cda5df'},
    {body:'#d87b51',dark:'#a75a3f',light:'#f2b56a',rim:'#eca068'},
  ];
  const c=palettes[variety];
  if(quality==='preview')return `<g class="plant-pot" data-pot-color="${['cobalt','lavender','terracotta'][variety]}"><path d="M-26 -34L-19 -4Q0 2 20 -4L27 -34Z" fill="${c.body}" stroke="#3f3436" stroke-width="1.1"/><path d="M19 -32l-4 27l5 -1l6 -28Z" fill="${c.dark}" stroke="none"/><path d="M-29 -36h58l-1 6Q0 -23 -28 -30Z" fill="${c.rim}" stroke="#3f3436" stroke-width=".95"/><ellipse cx="0" cy="-36" rx="29" ry="4.3" fill="#453e29" stroke="#3f3436" stroke-width=".85"/></g>`;
  let decoration='';
  if(variety===0) {
    decoration = path('M-19 -24q5 -3 10 0t10 0t10 0t9 0M-17 -11q6 3 11 0t11 0t11 0', '#e9e4a7', 1.1, .95);
    decoration += `<path d="${[-13,0,13].map(x=>`M${x} -22l1.7 4l4.3 1l-3.5 2.7l.6 4l-3.7 -2l-3.8 2l.7 -4l-3.5 -2.7l4.4 -1Z`).join('')}" fill="#ead64f" stroke="#405991" stroke-width=".55"/>`;
  } else if(variety===1) {
    decoration = path('M-17 -9Q-9 -26 11 -21M-9 -14q-1 -8 -6 -7m7 4q1 -8 5 -8m2 5q3 -6 7 -5', '#6b5b9c', 1, .9);
    if(!distant(quality))decoration += flower(-13,-20,.27,'#ef88ad',0,quality) + flower(-2,-24,.26,'#ef88ad',0,quality) + flower(11,-21,.28,'#ef88ad',0,quality);
    decoration += path('M-16 -6h30', '#e2c3eb', 1.2, .8);
  } else {
    decoration = `<path d="M-23 -27h46v5h-46Z" fill="#dca249" stroke="none"/>` + path('M-22 -25l5 3l5 -3l5 3l5 -3l5 3l5 -3l5 3l5 -3', '#825d39', .65, .8);
    decoration += path('M-15 -14q3 -4 6 0q-3 4 -6 0m11 0q3 -4 6 0q-3 4 -6 0m11 0q3 -4 6 0q-3 4 -6 0M-18 -8h36', '#f0bc74', .8, .9);
  }
  return `<g class="plant-pot" data-pot-color="${['cobalt','lavender','terracotta'][variety]}">
    <ellipse cx="0" cy="-1.5" rx="27" ry="2" fill="#302822" opacity=".15" stroke="none"/>
    <path d="M-26 -34L-19 -4Q0 2 20 -4L27 -34Z" fill="${c.body}" stroke="#3f3436" stroke-width="1.1"/>
    <path d="M-24 -31l6 23l5 3l-5 -25Z" fill="${c.light}" stroke="none" opacity=".76"/>
    <path d="M19 -32l-4 27l5 -1l6 -28Z" fill="${c.dark}" stroke="none" opacity=".8"/>
    <path d="M-19 -4Q0 -1 20 -4v2Q0 3 -19 -2Z" fill="${c.dark}" stroke-width=".65"/>
    ${decoration}
    <path d="M-29 -36h58l-1 6Q0 -23 -28 -30Z" fill="${c.rim}" stroke="#3f3436" stroke-width=".95"/>
    <ellipse cx="0" cy="-36" rx="29" ry="4.3" fill="#634c35" stroke="#3f3436" stroke-width=".85"/>
    <ellipse cx="0" cy="-36" rx="25" ry="2.8" fill="#453e29" stroke="none"/>
    ${path('M-25 -34Q0 -28 25 -34', c.light, .8, .9)}
    ${quality==='compact'||distant(quality)?'':dot(-15,-35,1,'#9b7b46')+dot(9,-36,.7,'#9b7b46')}
  </g>`;
}

function fern(seed, quality = 'full') {
  let out='';
  const ends=[[-38,-68],[-31,-97],[-9,-115],[15,-110],[35,-92],[40,-65]];
  ends.forEach(([ex,ey],index)=>{
    const a={x:(index-2.5)*1.1,y:-35},b={x:ex*.55,y:ey+4},c={x:ex,y:ey};
    const point=t=>{const u=1-t;return{x:u*u*a.x+2*u*t*b.x+t*t*c.x,y:u*u*a.y+2*u*t*b.y+t*t*c.y};};
    out+=path(`M${num(a.x)} ${a.y}Q${num(b.x)} ${b.y} ${ex} ${ey}`, '#477d36', 1.35);
    for(let i=1;i<=7;i++){
      if(quality==='preview'&&i%2===0)continue;
      const t=i/8,p=point(t),tx=2*(1-t)*(b.x-a.x)+2*t*(c.x-b.x),ty=2*(1-t)*(b.y-a.y)+2*t*(c.y-b.y);
      const tangent=Math.atan2(ty,tx)*180/Math.PI,scale=.58-(t*.29);
      out+=blade(p.x,p.y,scale,tangent+145,(i+index+seed)%3===0?CHARTREUSE:LEAF,quality);
      out+=blade(p.x,p.y,scale,tangent+35,(i+index)%3===0?'#9cbe3d':'#67a546',quality);
    }
    const tangent=Math.atan2(c.y-b.y,c.x-b.x)*180/Math.PI;
    out+=blade(ex,ey,.35,tangent+90,CHARTREUSE,quality);
  });
  out+=path('M-2 -36Q-12 -63 -7 -82M4 -35Q18 -52 15 -66', '#83a546', .9);
  return out+pot(seed,2,quality);
}

function pothos(seed, quality = 'full') {
  let out=path('M0 -36Q-12 -66 3 -108M-1 -50Q-26 -76 -22 -93M3 -59Q28 -81 26 -102M-3 -66Q-17 -94 -8 -111M9 -76Q17 -102 10 -114', '#427f39', 1.5);
  const leaves=[[-7,-106,.68,15],[-21,-91,.84,39],[8,-108,.74,-26],[24,-99,.78,-24],[-12,-89,.95,10],[8,-90,.93,-38],[27,-79,.88,-20],[-25,-72,.84,35],[-6,-70,.91,14],[13,-66,.96,-39],[-21,-54,.79,39],[1,-50,.85,-8],[25,-51,.75,-47]];
  leaves.forEach(([x,y,s,a],i)=>{out+=heartLeaf(x,y,s,a,(i+seed)%4===0?CHARTREUSE:(i%3===0?'#8bbd3f':'#57a349'),i%3===0,quality);});
  out+=path('M-9 -50Q-32 -39 -25 -26', '#608941', 1.05);
  out+=heartLeaf(-25,-27,.53,11,CHARTREUSE,true,quality);
  out+=path('M10 -44Q29 -37 25 -24', '#608941', 1.05);
  out+=heartLeaf(25,-24,.48,-13,'#77ac45',false,quality);
  return out+pot(seed,0,quality);
}

function geranium(seed, quality = 'full') {
  let out=path('M0 -36Q-2 -67 -2 -99M-2 -54Q-16 -76 -23 -86M0 -59Q17 -78 23 -90M-6 -77Q-19 -90 -15 -103M6 -70Q13 -89 9 -102', '#4c843b', 1.6);
  const lobed=(x,y,s,a,color)=>distant(quality)?silhouette(leafShapes.geranium,x,y,s,a,color):`<g class="foliage-leaf" data-leaf-kind="geranium" transform="translate(${x} ${y}) rotate(${a}) scale(${s})"><path d="M0 0Q-12 2 -13 -5Q-20 -12 -11 -14Q-12 -23 -4 -19Q2 -27 6 -19Q16 -22 15 -14Q24 -10 15 -4Q15 4 4 1Z" fill="${color}"/>${quality==='compact'?'':path('M0 0L2 -20M0 -3l-12 -7M1 -6l12 -8M0 -7l-8 -9M1 -4l12 -3', '#b9d352', .8, .85)+`<path d="M-12 -12q3 -4 7 -3M7 -17q5 -1 6 3" fill="none" stroke="#d5df68" stroke-width=".65"/>`}</g>`;
  [[-17,-50,.78,-31], [18,-51,.8,26],[-11,-71,.74,-20],[15,-74,.72,34],[-4,-43,.73,4]].forEach(([x,y,s,a],i)=>{out+=lobed(x,y,s,a,i%2?LEAF:DEEP);});
  const clusters=[[-23,-89,.65,SCARLET],[1,-101,.7,MAGENTA],[23,-93,.62,SCARLET],[-13,-105,.48,'#d94981'],[11,-108,.48,MAGENTA]];
  clusters.forEach(([x,y,s,c],index)=>{
    out+=quality==='preview'?flower(x,y,s,c,seed+index,quality):flower(x-4*s,y+2*s,s*.7,c,seed+index,quality)+flower(x+4*s,y+2*s,s*.72,c,seed+index+9,quality)+flower(x,y-4*s,s*.72,c,seed+index+4,quality);
    out+=dot(x,y+5*s,1.3,'#5d8a3b');
  });
  out+=path('M-29 -89l-3 -7m58 4l4 -5', '#648839', .9);
  out+=`<path d="M-34 -99q-3 -5 0 -6q5 0 4 5Z" fill="${SCARLET}" stroke-width=".65"/><path d="M28 -101q1 -5 5 -3q2 4 -3 6Z" fill="${MAGENTA}" stroke-width=".65"/>`;
  return out+pot(seed,1,quality);
}

function cactus(seed, quality = 'full') {
  let out=`<path d="M-9 -35v-56q0 -16 10 -16q11 0 11 16v56Z" fill="#79ae50"/>
    <path d="M-7 -49h-12q-12 0 -12 -12v-12q0 -8 6 -8q6 0 6 8v10q0 4 12 4Z" fill="#6d9d47"/>
    <path d="M9 -61q12 1 12 -6v-15q0 -7 6 -7q7 0 7 7v15q0 20 -25 18Z" fill="#8bbb48"/>
    <path d="M-3 -37v-53q0 -11 4 -11" fill="none" stroke="#b8d05d" stroke-width="2"/>
    ${path('M5 -36v-58M-26 -75v13q0 6 9 6M29 -82v16q0 11 -13 12', '#426f3a', .9, .85)}
    ${path('M-23 -77v13m47 -18v12', '#c2d568', 1, .8)}`;
  if(quality!=='compact'&&!distant(quality))for(let y=-95;y<-40;y+=11){out+=path(`M-8 ${y}l-4 -1m4 3l-3 2M12 ${y+4}l4 -2m-4 5l3 1M1 ${y+2}l-2 -2m2 2l2 -2`, '#4b6a38', .65, .9);}
  out+=path('M-29 -70l-4 -1m3 8l-4 2m66 -10l5 -2m-5 7l5 1', '#4b6a38', .7);
  out+=flower(1,-107,.73,MAGENTA,seed,quality)+flower(28,-88,.45,SCARLET,seed+4,quality);
  out+=`<path d="M-18 -34q-6 -12 -10 -11q-8 2 -3 11Z" fill="#98bc4c" stroke-width=".7"/>${path('M-27 -44l2 8', '#d6da72', .7)}`;
  return out+pot(seed,0,quality);
}

const plants={fern,pothos,geranium,cactus};
export const plantKinds=Object.freeze(Object.keys(plants));

function looseLeaves(kind,seed,quality) {
  // The fixed outer home transform is never animated. CSS moves only the inner
  // group, so a leaf can turn around its own stem without orbiting the whole pot.
  if(kind==='cactus'||quality==='preview')return'';
  if(quality==='distant')quality='compact';
  const homes=kind==='fern'?[[-30,-79,.35,-22]]:kind==='geranium'?[[-19,-73,.35,17],[17,-82,.31,-26]]:[[-20,-84,.37,28],[23,-76,.34,-21]];
  return homes.map(([x,y,size,angle],index)=>{
    const duration=18+Math.abs((seed+index*7)%14),delay=-(2+Math.abs((seed*3+index*11)%27));
    const drift=index?-6:7,drop=kind==='geranium'?57:64,turn=index?-43:38;
    const leaf=kind==='fern'?blade(0,0,size,angle,CHARTREUSE,quality):kind==='geranium'?ivyLeaf(0,0,size,angle,LEAF,false,quality):heartLeaf(0,0,size,angle,CHARTREUSE,true,quality);
    return `<g class="falling-leaf-home" transform="translate(${x} ${y})" data-leaf-home="${x},${y}"><g class="falling-leaf" opacity="0" style="--leaf-duration:${duration}s;--leaf-delay:${delay}s;--leaf-drift:${drift}px;--leaf-drop:${drop}px;--leaf-turn:${turn}deg;transform-origin:0px 0px;transform-box:view-box">${leaf}</g></g>`;
  }).join('');
}

/** A bright floor-anchored potted plant, approximately ±45 × 120 units.
 * distant batches opaque silhouettes; preview also omits tiny decoration and
 * falling leaves. Closer compact/full versions retain their original detail.
 */
export function pottedPlant(kind,x,y,scale=1,seed=0,quality='full') {
  if(![x,y,scale].every(Number.isFinite)||scale<=0)return'';
  const safeSeed=Number.isFinite(seed)?Math.trunc(seed):0;
  const name=Object.hasOwn(plants,kind)?kind:'pothos',draw=plants[name];
  const staticArt=draw(safeSeed,quality);
  return `<g class="potted-plant plant-${name}" transform="translate(${x} ${y}) scale(${scale})" stroke="${INK}" stroke-width=".9" stroke-linecap="round" stroke-linejoin="round">${distant(quality)?batchSilhouettes(staticArt):staticArt}${looseLeaves(name,safeSeed,quality)}</g>`;
}

/** Leafy swags along a board, with deep shoots kept near its two ends.
 * All artwork lies in x…x+width, y−10…y+drop, including leaf outlines.
 */
export function trailingVine(x,y,width,drop=80,seed=0,quality='full') {
  if(![x,y,width,drop].every(Number.isFinite)||width<24||drop<12)return'';
  const safeSeed=Number.isFinite(seed)?Math.trunc(seed):0,r=random(safeSeed);
  const unit=Math.min(.95,width/160,Math.max(.18,drop/98)),margin=unit*20+4;
  const span=width-margin*2,at=t=>({x:margin+span*t,y:5+Math.sin(t*Math.PI)*1.5+Math.sin(t*Math.PI*2)*.4});
  let out='';
  const points=Array.from({length:33},(_,i)=>at(i/32));
  const stem=points.map((p,i)=>`${i?'L':'M'}${num(p.x)} ${num(p.y)}`).join('');
  out+=path(stem,'#477f37',1.7)+(quality==='compact'||distant(quality)?'':path(stem,'#bdd64e',.55,.85));
  const count=Math.max(5,Math.floor(span/(unit*10+3)));
  for(let i=0;i<count;i++){
    const p=at((i+.35)/count),angle=i%2?-110:110,scale=unit*(.8+r()*.23);
    const leaf=(i+safeSeed)%3===0?ivyLeaf:heartLeaf;
    if(quality!=='compact'&&!distant(quality))out+=path(`M${num(p.x)} ${num(p.y)}l${i%2?-2:2} ${i%2?-1:1}`,'#668e3b',.75);
    // Consume the same random values before skipping tiny preview leaves, so
    // every retained leaf agrees with the closer versions of this vine.
    if(quality!=='preview'||i%2===0)out+=leaf(p.x,p.y,scale,angle,i%4===0?CHARTREUSE:i%3===0?DEEP:LEAF,i%4===0,quality);
    if(i%8===2&&quality!=='preview')out+=flower(p.x,p.y-3,unit*.43,i%2?MAGENTA:SCARLET,safeSeed+i,quality);
  }
  if(drop>24){
    // Edge shoots are long; the two inner shoots only fringe the board.
    const shoots=[{t:.025,length:.94},{t:.975,length:.99},{t:.20,length:.32},{t:.80,length:.38}];
    shoots.forEach((shoot,index)=>{
      const a=at(shoot.t),end=index>1?Math.min(10,a.y+3):Math.max(a.y+3,(drop-margin)*shoot.length),wiggle=unit*3;
      const samples=Math.max(3,Math.floor((end-a.y)/(unit*15+3)));
      const shootPoint=t=>({x:a.x+Math.sin(t*Math.PI*3+index)*wiggle*Math.sin(t*Math.PI),y:a.y+(end-a.y)*t});
      const ps=Array.from({length:24},(_,i)=>shootPoint(i/23)),d=ps.map((p,i)=>`${i?'L':'M'}${num(p.x)} ${num(p.y)}`).join('');
      out+=path(d,'#527e35',1.05)+(quality==='compact'||distant(quality)?'':path(d,'#b6ce4b',.38,.85));
      for(let i=1;i<=samples;i++){
        const p=shootPoint(i/(samples+1)),angle=i%2?64:-64,scale=unit*(index>1?.52+r()*.05:.66+r()*.26);
        const leaf=(i+index+safeSeed)%3===0?ivyLeaf:heartLeaf;
        if(quality!=='preview'||i%2===1)out+=leaf(p.x,p.y,scale,angle,i%3===0?CHARTREUSE:(index%2?DEEP:LEAF),i%4===0,quality);
        if(index>1&&i===samples-1&&quality!=='preview')out+=flower(p.x+unit*2,p.y,unit*.4,index%2?MAGENTA:SCARLET,safeSeed+i,quality);
      }
      const p=shootPoint(.95),tendril=unit*(index>1?.45:1);
      out+=path(`M${num(p.x)} ${num(p.y)}q${num(tendril*8)} ${num(tendril*6)} ${num(tendril*4)} ${num(tendril*8)}q${num(-tendril*5)} ${num(tendril*2)} ${num(-tendril*5)} ${num(-tendril*2)}`,'#6c963b',.7);
    });
  }
  return `<g class="trailing-vine" data-vine-width="${width}" data-vine-drop="${drop}" transform="translate(${x} ${y})" stroke="${INK}" stroke-width=".8" stroke-linecap="round" stroke-linejoin="round">${distant(quality)?batchSilhouettes(out):out}</g>`;
}
