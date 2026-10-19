// Compact navigation hides child links without changing the user's expanded groups.
export function syncSidebarGroups(sidebar,{compact=false}={}){
 for(const group of sidebar?.querySelectorAll?.('.portal-sales-group')||[]){
  const open=!compact&&group.classList.contains('is-expanded');
  const subnav=group.querySelector('.portal-sales-subnav'),parent=group.querySelector('.portal-sales-parent');
  if(subnav)subnav.inert=!open;
  parent?.setAttribute('aria-expanded',String(open));
 }
}
export function sidebarClickWave(event,{document:dom,window:win}){
 const original=event.target.closest?.('.portal-sidebar button');
 if(!original||!original.matches?.('.portal-sidebar button')||original.disabled||win.matchMedia?.('(prefers-reduced-motion: reduce)').matches)return;
 const button=[...(dom.querySelectorAll?.('.portal-sidebar button')||[])].find(row=>row.dataset.tab===original.dataset.tab&&row.dataset.salesToggle===original.dataset.salesToggle&&row.dataset.accountingToggle===original.dataset.accountingToggle&&row.getAttribute?.('aria-label')===original.getAttribute?.('aria-label'));
 if(!button||typeof button.append!=='function'||typeof button.getBoundingClientRect!=='function')return;
 const rect=button.getBoundingClientRect(),size=Math.max(rect.width,rect.height)*2,wave=dom.createElement('i');
 wave.className='portal-click-wave';wave.setAttribute('aria-hidden','true');
 const x=event.detail&&event.clientX>=rect.left&&event.clientX<=rect.right?event.clientX-rect.left:rect.width/2,y=event.detail&&event.clientY>=rect.top&&event.clientY<=rect.bottom?event.clientY-rect.top:rect.height/2;
 wave.style.cssText=`width:${size}px;height:${size}px;left:${x-size/2}px;top:${y-size/2}px`;
 button.append(wave);wave.addEventListener('animationend',()=>wave.remove(),{once:true});
}
