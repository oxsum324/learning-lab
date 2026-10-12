// Decorative assets only. Technical diagrams remain in drawing-layouts.js.
export const TOPIC_ART={
 'structural-analysis':'topic-structure-v1.jpg',
 'reinforced-concrete':'topic-concrete-v1.jpg',
 'steel-structures':'topic-steel-v1.jpg',
 'structural-dynamics':'topic-dynamics-v1.jpg',
 'soil-foundations':'topic-soil-v1.jpg'
};
export const PHASE_ART=['phase-balance-v1.jpg','phase-energy-v1.jpg','phase-compatibility-v1.jpg','phase-integration-v1.jpg'];
export function decorativeImage(file,className,width,height){
 const img=document.createElement('img');
 img.dataset.artSrc='assets/'+file;img.alt='';img.className=className;
 img.width=width;img.height=height;img.loading='lazy';img.decoding='async';
 return img;
}
export function loadPanelArt(name){
 // No src in hidden panels: opening today's practice must not download artwork.
 if(document.body.dataset.view!==name)return;
 const panel=document.getElementById(name);if(!panel||panel.hidden)return;
 for(const img of panel.querySelectorAll('img[data-art-src]')){
  if(img.classList.contains('topic-hero')&&!matchMedia('(min-width: 601px)').matches)continue;
  if(!img.getAttribute('src'))img.src=img.dataset.artSrc;
 }
}
