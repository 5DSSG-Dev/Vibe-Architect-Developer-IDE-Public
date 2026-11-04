import { validateScene } from './model.js';

export function renderAtlasTargets(container, scene) {
  validateScene(scene);
  const fragment = document.createDocumentFragment();
  for (const target of scene.targets) {
    const xs=target.polygon.map(p=>p[0]), ys=target.polygon.map(p=>p[1]);
    const left=Math.min(...xs), top=Math.min(...ys), width=Math.max(...xs)-left, height=Math.max(...ys)-top;
    const anchor=document.createElement('a');
    anchor.id=`target-${target.id}`; anchor.href=target.href; anchor.className=`object-link ${target.kind}`;
    anchor.setAttribute('aria-label',target.label);
    anchor.style.left=`${left*100}%`; anchor.style.top=`${top*100}%`;
    anchor.style.width=`${width*100}%`; anchor.style.height=`${height*100}%`;
    const shape = `polygon(${target.polygon.map(([x,y])=>`${(x-left)/width*100}% ${(y-top)/height*100}%`).join(',')})`;
    anchor.style.clipPath=shape;
    // Clipping the anchor makes the real click area follow the artwork.
    const glow=document.createElement('span'); glow.className='object-glow'; anchor.append(glow);
    anchor.addEventListener('focus',()=>showLabel(target.label));
    anchor.addEventListener('pointerenter',()=>showLabel(target.label));
    anchor.addEventListener('blur',resetLabel); anchor.addEventListener('pointerleave',resetLabel);
    fragment.append(anchor);
  }
  container.replaceChildren(fragment);
}
const hint=document.querySelector('#scene-hint');
function showLabel(label) { if(hint) hint.textContent=label; }
function resetLabel() { if(hint) hint.textContent='Choose a book, or follow the crystal.'; }

document.addEventListener('click',event=>{
  const anchor=event.target.closest('a[id]');
  if (!anchor) return;
  try { sessionStorage.setItem(`atlas-focus:${location.pathname}`,anchor.id); } catch { /* Navigation works without storage. */ }
});
function restoreFocus() {
  let id;
  try { id=sessionStorage.getItem(`atlas-focus:${location.pathname}`); sessionStorage.removeItem(`atlas-focus:${location.pathname}`); } catch { return; }
  if (id && !location.hash) document.getElementById(id)?.focus({preventScroll:true});
}
async function initialize() {
  const sceneName=document.body.dataset.atlas;
  const region=document.querySelector('#object-links');
  try {
    const response=await fetch('content/navigation.json');
    if (!response.ok) throw Error('Navigation unavailable');
    const data=await response.json();
    renderAtlasTargets(region,data[sceneName]);
    const image=document.querySelector('.atlas-art');
    image.addEventListener('error',()=>{
      region.hidden=true;
      document.querySelector('#scene-status').textContent='The illustration could not load. You can still browse every book below.';
    });
    if (image.complete && !image.naturalWidth) image.dispatchEvent(new Event('error'));
  } catch {
    document.querySelector('#scene-status').textContent='The illustrated links are unavailable. Every destination is still listed below.';
  }
  if (location.hash.startsWith('#target-')) document.getElementById(location.hash.slice(1))?.focus({preventScroll:true});
  else restoreFocus();
}
window.addEventListener('pageshow',event=>{ if(event.persisted) restoreFocus(); });
initialize();
