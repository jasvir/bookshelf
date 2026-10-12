// Short SVG detail dissolves retain existing artwork, rather than cloning it.
// Old local IDs are isolated before the replacement enters either SVG surface.
let detailSerial=0;
const XLINK='http://www.w3.org/1999/xlink';
const ARIA_IDS=new Set(['aria-labelledby','aria-describedby','aria-controls','aria-owns','aria-details','aria-errormessage','aria-flowto','aria-activedescendant']);
const element=node=>node&&typeof node.getAttribute==='function'&&typeof node.setAttribute==='function'&&node.classList;

function rootsOf(nodes){
 if(!Array.isArray(nodes))return [];
 const roots=[...new Set(nodes.filter(element))];
 return roots.filter(root=>!roots.some(other=>other!==root&&other.contains(root)));
}
function setAttribute(node,name,value){
 if(value===null)node.removeAttribute(name);
 else if(name.startsWith('xlink:')&&node.setAttributeNS)node.setAttributeNS(XLINK,name,value);
 else node.setAttribute(name,value);
}
function attributesToRestore(){
 const saved=new Map();
 return{
  remember(node,name){let attrs=saved.get(node);if(!attrs){attrs=new Map();saved.set(node,attrs);}if(!attrs.has(name))attrs.set(name,node.getAttribute(name));},
  restore(){for(const[node,attrs]of saved)for(const[name,value]of attrs)setAttribute(node,name,value);saved.clear();}
 };
}

export function createDetailTransitions({enabled=()=>true,duration=180,maxTransitions=2,maxNodes=12000,onFinish=()=>{}}={}){
 const active=new Set();
 const milliseconds=Number.isFinite(duration)?Math.max(0,Math.min(200,duration)):180;
 const slots=Number.isFinite(maxTransitions)?Math.max(0,Math.floor(maxTransitions)):2;
 const budget=Number.isFinite(maxNodes)?Math.max(0,Math.floor(maxNodes)):12000;
 let retainedNodes=0,peakNodes=0;
 function allowed(){try{return Boolean(enabled());}catch{return false;}}
 function canStart(nodes=0){return Number.isFinite(nodes)&&nodes>=0&&allowed()&&milliseconds>0&&active.size<slots&&retainedNodes+nodes<=budget;}
 function notify(callback,handle){
  try{callback?.(handle);}catch(error){
   // Cleanup must finish even if a consumer fails while returning art to its cache.
   try{globalThis.reportError?.(error);}catch{}
  }
 }
 function reserve({outgoing,owner,onFinish:finished}={}){
  if(!canStart())return null;
  let oldRoots=rootsOf(outgoing);
  if(!oldRoots.length)return null;
  // A second reservation cannot take ownership of an already fading subtree.
  for(const handle of active)if(oldRoots.some(root=>handle.overlaps(root)))return null;
  const elements=[],stack=[...oldRoots];
  while(stack.length){const node=stack.pop();elements.push(node);for(const child of node.children)stack.push(child);}
  const nodes=elements.length;
  if(!canStart(nodes))return null;
  const oldAttributes=attributesToRestore(),newAttributes=attributesToRestore();
  const ids=new Map(),usedIDs=new Set(elements.map(node=>node.getAttribute('id')).filter(Boolean));
  const prefix=`detail-transition-${++detailSerial}-`;
  let sequence=0;
  // All IDs share one mapping, including clips referenced across the static and
  // motion roots. Shared definitions such as #wood are absent from this map.
  for(const node of elements){
   const id=node.getAttribute('id');if(!id)continue;
   let replacement;
   do{replacement=`${prefix}${++sequence}`;}while(usedIDs.has(replacement)||node.ownerDocument?.getElementById?.(replacement));
   usedIDs.add(replacement);ids.set(id,replacement);oldAttributes.remember(node,'id');node.setAttribute('id',replacement);
  }
  for(const node of elements)for(const name of node.getAttributeNames()){
   if(name==='id')continue;
   const original=node.getAttribute(name);let value=original;
   value=value.replace(/url\(\s*(['"]?)#([^'"\s)]+)\1\s*\)/g,(match,quote,id)=>ids.has(id)?match.replace(`#${id}`,`#${ids.get(id)}`):match);
   if(name==='href'||name==='xlink:href')value=value.replace(/^(\s*)#([^\s]+)(\s*)$/,(match,before,id,after)=>ids.has(id)?`${before}#${ids.get(id)}${after}`:match);
   if(ARIA_IDS.has(name))value=value.replace(/\S+/g,id=>ids.get(id)||id);
   if(value!==original){oldAttributes.remember(node,name);setAttribute(node,name,value);}
  }
  for(const root of oldRoots){
   for(const name of ['class','aria-hidden','pointer-events'])oldAttributes.remember(root,name);
   root.classList.add('detail-outgoing');root.setAttribute('aria-hidden','true');root.setAttribute('pointer-events','none');
  }
  let newRoots=[],listeners=[],timer=0,started=false,complete=false,startedAt=0;
  function finish(){
   if(complete)return false;
   complete=true;clearTimeout(timer);timer=0;
   for(const[root,listener]of listeners)root.removeEventListener('animationend',listener);
   listeners=[];
   // Restoring an old ID while it is still connected would collide with the new
   // drawing. Cache callbacks see the detached, fully restored old artwork.
   for(const root of oldRoots)root.remove();
   oldAttributes.restore();newAttributes.restore();
   oldRoots=[];newRoots=[];active.delete(handle);retainedNodes-=nodes;
   notify(finished,handle);notify(onFinish,handle);
   return true;
  }
  function start(incoming){
   if(complete||started)return false;
   newRoots=rootsOf(incoming);
   if(!allowed()||!newRoots.length||newRoots.some(root=>oldRoots.some(old=>old===root||old.contains(root)||root.contains(old)))){finish();return false;}
   started=true;startedAt=globalThis.performance?.now?.()||0;
   clearTimeout(timer);
   try{
    for(const root of newRoots){
     newAttributes.remember(root,'class');newAttributes.remember(root,'style');
     const listener=event=>{
      if(complete||event.target!==root||event.animationName!=='detail-arrive')return;
      // A queued event from an older use of this cached root cannot finish its
      // newer animation after a rapid navigation/cancel/reuse sequence.
      if(Number.isFinite(event.timeStamp)&&event.timeStamp<startedAt)return;
      finish();
     };
     root.addEventListener('animationend',listener);listeners.push([root,listener]);
     root.style.setProperty('--detail-duration',`${milliseconds}ms`);root.classList.add('detail-incoming');
    }
    timer=setTimeout(finish,Math.min(240,milliseconds+60));
    return true;
   }catch{finish();return false;}
  }
  const handle={owner,nodes,start,finish,overlaps(root){return[...oldRoots,...newRoots].some(other=>other===root||other.contains(root)||root.contains(other));}};
  active.add(handle);retainedNodes+=nodes;peakNodes=Math.max(peakNodes,retainedNodes);
  // Reserve is normally followed by start in the same task. A failed caller
  // cannot leave namespaced, frozen artwork retained indefinitely.
  timer=setTimeout(finish,240);
  return handle;
 }
 function finishOwner(owner){for(const handle of [...active])if(handle.owner===owner)handle.finish();}
 function finishAll(){for(const handle of [...active])handle.finish();}
 return{reserve,finishAll,finishOwner,canStart,get activeCount(){return active.size;},get retainedNodes(){return retainedNodes;},get peakNodes(){return peakNodes;}};
}
