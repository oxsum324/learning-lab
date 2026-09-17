import {SHEETS,COLORS,emptyDrawing,validDrawing,shape,moveShape,makeTemplate} from './drawing-model.js?v=0.7.0';
const NS='http://www.w3.org/2000/svg';
const svgNode=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
function arrow(g,x1,y1,x2,y2,color){g.append(svgNode('line',{x1,y1,x2,y2,stroke:color,'stroke-width':3}));const a=Math.atan2(y2-y1,x2-x1),l=13;g.append(svgNode('path',{d:`M ${x2-l*Math.cos(a-.45)} ${y2-l*Math.sin(a-.45)} L ${x2} ${y2} L ${x2-l*Math.cos(a+.45)} ${y2-l*Math.sin(a+.45)}`,fill:'none',stroke:color,'stroke-width':3}));}
export function renderShape(s){
 const g=svgNode('g',{'stroke-linecap':'round','stroke-linejoin':'round'}),{x1:x,y1:y,x2,y2,color:c}=s;
 const line=(a,b,d,e,w=3)=>g.append(svgNode('line',{x1:a,y1:b,x2:d,y2:e,stroke:c,'stroke-width':w}));
 const path=d=>g.append(svgNode('path',{d,fill:'none',stroke:c,'stroke-width':3}));
 if(s.type==='line')line(x,y,x2,y2,5);
 if(s.type==='arrow')arrow(g,x,y,x2,y2,c);
 if(s.type==='curve'){const dx=x2-x,dy=y2-y,l=Math.hypot(dx,dy)||1;path(`M ${x} ${y} Q ${(x+x2)/2-dy/l*s.bend} ${(y+y2)/2+dx/l*s.bend} ${x2} ${y2}`);}
 if(s.type==='pen'){if(s.points.length===1)g.append(svgNode('circle',{cx:s.points[0][0],cy:s.points[0][1],r:2,fill:c}));else path(s.points.map(([a,b],i)=>`${i?'L':'M'} ${a} ${b}`).join(' '));}
 if(s.type==='text'){const t=svgNode('text',{x,y,fill:c,'font-size':23,'font-family':'Microsoft JhengHei, sans-serif'});t.textContent=s.text;g.append(t);}
 if(s.type==='udl'){line(x,y,x2,y2,2);const len=Math.hypot(x2-x,y2-y),n=Math.max(2,Math.ceil(len/45));for(let i=0;i<=n;i++){const px=x+(x2-x)*i/n,py=y+(y2-y)*i/n;arrow(g,px,py,px,py+60*s.direction,c);}}
 if(s.type==='moment'){const r=32,start=-Math.PI/4,end=start+s.direction*1.55*Math.PI;const points=Array.from({length:35},(_,i)=>[x+r*Math.cos(start+(end-start)*i/34),y+r*Math.sin(start+(end-start)*i/34)]);path(points.map(([a,b],i)=>`${i?'L':'M'} ${a} ${b}`).join(' '));arrow(g,...points.at(-2),...points.at(-1),c);}
 if(s.type==='pin'||s.type==='roller'){path(`M ${x} ${y} L ${x-22} ${y+31} L ${x+22} ${y+31} Z`);if(s.type==='roller'){for(const dx of [-12,12])g.append(svgNode('circle',{cx:x+dx,cy:y+38,r:5,fill:'white',stroke:c,'stroke-width':2}));line(x-30,y+46,x+30,y+46,2);}else{line(x-32,y+36,x+32,y+36,2);for(let i=-25;i<30;i+=10)line(x+i,y+36,x+i-7,y+43,1);}}
 if(s.type==='fixed'){line(x,y-40,x,y+40,5);for(let dy=-35;dy<=40;dy+=12)line(x,y+dy,x-18,y+dy+12,2);}
 if(s.turn&&['pin','roller','fixed'].includes(s.type))g.setAttribute('transform',`rotate(${s.turn} ${x} ${y})`);return g;
}
export function renderDrawing(d,key,{grid=false}={}){
 const svg=svgNode('svg',{viewBox:'0 0 1000 520',xmlns:NS,role:'img','aria-label':SHEETS[key]+'作答圖'});svg.append(svgNode('rect',{width:1000,height:520,fill:'white'}));
 if(grid){const g=svgNode('g',{stroke:'#e9eee9','stroke-width':1,'pointer-events':'none'});for(let x=0;x<=1000;x+=25)g.append(svgNode('line',{x1:x,y1:0,x2:x,y2:520}));for(let y=0;y<=520;y+=25)g.append(svgNode('line',{x1:0,y1:y,x2:1000,y2:y}));svg.append(g);}
 for(const [i,s] of (d?.sheets[key]??[]).entries()){const g=renderShape(s);g.dataset.shape=String(i);svg.append(g);}return svg;
}
const toolNames={select:'選取／移動',line:'構件直線',arrow:'力箭頭',udl:'均佈載重',moment:'彎矩箭頭',pin:'鉸支承',roller:'滾支承',fixed:'固定端',text:'文字',pen:'自由筆',curve:'變形曲線'};
export class DrawingEditor{
 constructor(root,onChange){this.root=root;this.onChange=onChange;this.data=emptyDrawing();this.key='force';this.tool='select';this.selected=-1;this.clip=null;this.past=[];this.future=[];this.drag=null;this.mount();this.paint();}
 mount(){this.root.innerHTML=`<div class="drawing-head"><h3>圖解作答</h3><span>受力、內力與變形分頁保存</span></div><div class="drawing-sheets" role="group" aria-label="圖紙種類"></div><div class="drawing-tools" role="toolbar" aria-label="繪圖工具"></div><div class="drawing-options"><label>標註文字<input data-prop="text" maxlength="120" placeholder="例如 R_A、30 kN、δ_B"></label><label>顏色<select data-prop="color"><option value="#173c36">深綠</option><option value="#22746a">綠</option><option value="#b64b32">紅</option><option value="#285ca8">藍</option></select></label><label>曲度（正負改方向）<input data-prop="bend" type="range" min="-200" max="200" value="75"></label><button type="button" data-action="apply">套用至選取圖形</button></div><div class="drawing-actions"><label>底圖<select data-prop="template"><option value="simple">簡支梁</option><option value="cantilever">懸臂梁</option><option value="propped">支承懸臂</option><option value="axes">剪力／彎矩基線</option></select></label><button type="button" data-action="template">加入底圖</button><button type="button" data-action="stamp">置於中央</button><button type="button" data-action="cut">剪下</button><button type="button" data-action="copy">複製</button><button type="button" data-action="paste">貼上</button><button type="button" data-action="reverse">反向</button><button type="button" data-action="rotate">旋轉支承90°</button><button type="button" data-action="delete">刪除選取</button><button type="button" data-action="undo">復原</button><button type="button" data-action="redo">重做</button><button type="button" data-action="export">下載此圖 SVG</button></div><p class="muted">選工具後，在畫布拖曳畫線／箭頭／曲線，點一下放支承或文字。選取後可拖移或用方向鍵微調；拖曳藍色端點可調整長度。底圖只含構件與支承。觸控可畫圖，請在畫布外滑動捲頁。</p><div class="drawing-board"></div><label>選取已畫圖形<select data-prop="selection" aria-label="選取已畫圖形"></select></label><p class="drawing-status" role="status"></p>`;
 const makeButton=(name,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=fn;return b;};
 for(const [k,n] of Object.entries(SHEETS)){const b=makeButton(n,()=>{this.cancelDrag();this.key=k;this.selected=-1;this.paint();});b.dataset.sheet=k;this.root.querySelector('.drawing-sheets').append(b);}
 for(const [k,n] of Object.entries(toolNames)){const b=makeButton(n,()=>{this.cancelDrag();this.tool=k;this.paint();});b.dataset.tool=k;this.root.querySelector('.drawing-tools').append(b);}
 this.root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>this.action(b.dataset.action));
 this.prop('selection').onchange=e=>{this.selected=Number(e.target.value);this.tool='select';this.syncProps();this.paint();};
 this.board=this.root.querySelector('.drawing-board');this.board.tabIndex=0;this.board.setAttribute('role','group');this.board.setAttribute('aria-label','圖解作答畫布');
 this.board.addEventListener('pointerdown',e=>this.down(e));this.board.addEventListener('pointermove',e=>this.move(e));this.board.addEventListener('pointerup',()=>this.up());this.board.addEventListener('pointercancel',()=>this.cancelDrag());this.board.addEventListener('lostpointercapture',()=>{if(this.drag)this.cancelDrag();});
 this.board.addEventListener('keydown',e=>{if(this.selected<0)return;const moves={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]};if(moves[e.key]){e.preventDefault();this.commit(()=>{this.items()[this.selected]=moveShape(this.items()[this.selected],...moves[e.key]);});}else if(e.key==='Delete'){e.preventDefault();this.action('delete');}});
 }
 prop(name){return this.root.querySelector(`[data-prop="${name}"]`);}
 items(){return this.data.sheets[this.key];}
 set(d){this.cancelDrag();this.data=structuredClone(d??emptyDrawing());this.selected=-1;this.past=[];this.future=[];this.paint();}
 get(){return structuredClone(this.data);}
 message(text){this.root.querySelector('.drawing-status').textContent=text;}
 save(before){if(!validDrawing(this.data)){this.data=before;this.selected=-1;this.paint();this.message('圖形超過上限或座標不合法，這次變更未保存。每張圖最多120個物件。');return;}if(JSON.stringify(before)!==JSON.stringify(this.data)){this.past.push(before);if(this.past.length>35)this.past.shift();this.future=[];this.onChange(this.get());}this.paint();}
 commit(fn){this.cancelDrag();const before=this.get();fn();this.save(before);}
 syncProps(){const s=this.items()[this.selected];if(s){this.prop('text').value=s.text;this.prop('color').value=s.color;this.prop('bend').value=String(s.bend);}}
 paint(){const svg=renderDrawing(this.data,this.key,{grid:true});this.svg=svg;svg.style.touchAction='none';
 svg.querySelectorAll('[data-shape]').forEach(g=>{g.style.cursor=this.tool==='select'?'move':'crosshair';if(Number(g.dataset.shape)===this.selected)g.classList.add('selected-shape');});
 const s=this.items()[this.selected];if(s&&['line','arrow','udl','curve'].includes(s.type)&&this.tool==='select'){for(const end of [1,2]){const h=svgNode('circle',{cx:s['x'+end],cy:s['y'+end],r:9,fill:'#fff',stroke:'#285ca8','stroke-width':3});h.dataset.handle=String(end);svg.append(h);}}
 this.board.replaceChildren(svg);this.root.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('chosen',b.dataset.tool===this.tool);b.setAttribute('aria-pressed',String(b.dataset.tool===this.tool));});this.root.querySelectorAll('[data-sheet]').forEach(b=>{b.classList.toggle('chosen',b.dataset.sheet===this.key);b.setAttribute('aria-pressed',String(b.dataset.sheet===this.key));});
 const options=this.prop('selection');options.replaceChildren();const none=document.createElement('option');none.value='-1';none.textContent='未選取';options.append(none);this.items().forEach((s,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=`${i+1}. ${toolNames[s.type]}${s.text?' · '+s.text:''}`;options.append(o);});options.value=String(this.selected);
 for(const action of ['cut','copy','reverse','delete','apply'])this.root.querySelector(`[data-action="${action}"]`).disabled=this.selected<0;
 this.root.querySelector('[data-action="undo"]').disabled=!this.past.length;this.root.querySelector('[data-action="redo"]').disabled=!this.future.length;this.root.querySelector('[data-action="paste"]').disabled=!this.clip;
 }
 point(e){const p=this.svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const v=p.matrixTransform(this.svg.getScreenCTM().inverse());return [Math.max(0,Math.min(1000,v.x)),Math.max(0,Math.min(520,v.y))];}
 currentShape(type,x,y){const s=shape(type,x,y);s.color=this.prop('color').value;s.text=this.prop('text').value||(type==='text'?'標註':'');s.bend=Number(this.prop('bend').value);return s;}
 down(e){if(e.button!==0&&e.pointerType!=='touch')return;e.preventDefault();this.board.focus({preventScroll:true});const [x,y]=this.point(e);const before=this.get();
 if(this.tool==='select'){const hit=e.target.closest('[data-shape]'),handle=e.target.dataset.handle;if(handle&&this.selected>=0){this.drag={before,start:[x,y],index:this.selected,handle:Number(handle),original:structuredClone(this.items()[this.selected])};}else if(hit){this.selected=Number(hit.dataset.shape);this.syncProps();this.drag={before,start:[x,y],index:this.selected,original:structuredClone(this.items()[this.selected])};}else{this.selected=-1;this.paint();return;}}
 else {if(this.items().length>=120){this.message('這張圖已達120個物件，請整理後再畫。');return;}const s=this.currentShape(this.tool,x,y);s.x2=x;s.y2=y;this.items().push(s);this.selected=this.items().length-1;this.drag={before,start:[x,y],index:this.selected,newShape:true};}
 this.board.setPointerCapture(e.pointerId);this.paint();}
 move(e){if(!this.drag)return;const [x,y]=this.point(e),d=this.drag;let s=this.items()[d.index];if(d.handle){s['x'+d.handle]=x;s['y'+d.handle]=y;}else if(!d.newShape){this.items()[d.index]=moveShape(d.original,x-d.start[0],y-d.start[1]);}else if(s.type==='pen'){const last=s.points.at(-1);if(Math.hypot(x-last[0],y-last[1])>3&&s.points.length<300)s.points.push([x,y]);s.x2=x;s.y2=y;}else if(['line','arrow','udl','curve'].includes(s.type)){s.x2=x;s.y2=y;}this.paint();}
 up(){if(!this.drag)return;const d=this.drag;this.drag=null;const s=this.items()[d.index];if(d.newShape&&['line','arrow','udl','curve'].includes(s.type)&&Math.hypot(s.x2-s.x1,s.y2-s.y1)<3)s.x2=Math.min(1000,s.x1+150);this.save(d.before);this.message(`${SHEETS[this.key]}：${this.items().length}個物件。圖解會隨草稿及JSON備份保存。`);}
 cancelDrag(){if(this.drag){this.data=this.drag.before;this.drag=null;this.selected=-1;this.paint();}}
 action(a){if(a==='copy'||a==='cut'){if(this.selected<0)return;this.clip=structuredClone(this.items()[this.selected]);if(a==='cut')this.commit(()=>{this.items().splice(this.selected,1);this.selected=-1;});else{this.paint();this.message('已複製，可切換圖紙後貼上。');}return;}
 if(a==='paste'&&this.clip){this.commit(()=>{this.items().push(moveShape(this.clip,25,25));this.selected=this.items().length-1;});return;}
 if(a==='undo'&&this.past.length){this.cancelDrag();this.future.push(this.get());this.data=this.past.pop();this.selected=-1;this.onChange(this.get());this.paint();return;}
 if(a==='redo'&&this.future.length){this.cancelDrag();this.past.push(this.get());this.data=this.future.pop();this.selected=-1;this.onChange(this.get());this.paint();return;}
 if(a==='delete'&&this.selected>=0){this.commit(()=>{this.items().splice(this.selected,1);this.selected=-1;});return;}
 if(a==='apply'&&this.selected>=0){this.commit(()=>{Object.assign(this.items()[this.selected],{text:this.prop('text').value,color:this.prop('color').value,bend:Number(this.prop('bend').value)});});return;}
 if(a==='rotate'&&this.selected>=0){const s=this.items()[this.selected];if(!['pin','roller','fixed'].includes(s.type)){this.message('旋轉適用於鉸支承、滾支承與固定端。');return;}this.commit(()=>{s.turn=((s.turn??0)+90)%360;});return;}if(a==='reverse'&&this.selected>=0){this.commit(()=>{const s=this.items()[this.selected];if(s.type==='arrow'){[s.x1,s.x2]=[s.x2,s.x1];[s.y1,s.y2]=[s.y2,s.y1];}else if(s.type==='curve')s.bend=-s.bend;else s.direction*=-1;});return;}
 if(a==='template'){this.commit(()=>{this.items().push(...makeTemplate(this.prop('template').value));this.selected=-1;});return;}
 if(a==='stamp'){if(this.tool==='select'){this.message('先選擇一種繪圖工具，再按置於中央。');return;}this.commit(()=>{const s=this.currentShape(this.tool,420,230);if(this.tool==='arrow'){s.x2=420;s.y2=120;}this.items().push(s);this.selected=this.items().length-1;});return;}
 if(a==='export'){const svg=renderDrawing(this.data,this.key);const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`學習圖解-${SHEETS[this.key].replace('/','-')}.svg`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.message('已交給瀏覽器下載SVG；可放大或用瀏覽器列印。');}
 }
}
