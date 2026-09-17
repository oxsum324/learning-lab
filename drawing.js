import {SHEETS,COLORS,emptyWorkspace,toWorkspace,changeLayout,validDrawing,shape,moveShape,makeTemplate} from './drawing-model.js?v=0.10.0';
import {LAYOUTS,lessonLayout} from './drawing-layouts.js?v=0.10.0';
const NS='http://www.w3.org/2000/svg';
const svgNode=(tag,attrs={})=>{const n=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,String(v));return n;};
function arrow(g,x1,y1,x2,y2,color){g.append(svgNode('line',{x1,y1,x2,y2,stroke:color,'stroke-width':3}));const a=Math.atan2(y2-y1,x2-x1),l=13;g.append(svgNode('path',{d:`M ${x2-l*Math.cos(a-.45)} ${y2-l*Math.sin(a-.45)} L ${x2} ${y2} L ${x2-l*Math.cos(a+.45)} ${y2-l*Math.sin(a+.45)}`,fill:'none',stroke:color,'stroke-width':3}));}
export function renderShape(s){
 const g=svgNode('g',{'stroke-linecap':'round','stroke-linejoin':'round'}),{x1:x,y1:y,x2,y2,color:c}=s;
 const line=(a,b,d,e,w=3)=>g.append(svgNode('line',{x1:a,y1:b,x2:d,y2:e,stroke:c,'stroke-width':w}));
 const path=d=>g.append(svgNode('path',{d,fill:'none',stroke:c,'stroke-width':3}));
 if(s.type==='line')line(x,y,x2,y2,5);
 if(s.type==='rect')g.append(svgNode('rect',{x:Math.min(x,x2),y:Math.min(y,y2),width:Math.abs(x2-x),height:Math.abs(y2-y),fill:'none',stroke:c,'stroke-width':3}));
 if(s.type==='circle')g.append(svgNode('ellipse',{cx:(x+x2)/2,cy:(y+y2)/2,rx:Math.abs(x2-x)/2,ry:Math.abs(y2-y)/2,fill:'none',stroke:c,'stroke-width':3}));
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
function drawGuides(svg,layout,fontSize=26){
 const g=svgNode('g',{'pointer-events':'none','data-guides':layout});
 for(const z of LAYOUTS[layout].zones){
  g.append(svgNode('rect',{x:z.x,y:z.y,width:z.width,height:z.height,fill:'none',stroke:'#bccac3','stroke-width':1}));
  const title=svgNode('text',{x:z.x+18,y:z.y+Math.max(35,fontSize),fill:'#61766d','font-size':fontSize,'font-family':'Microsoft JhengHei, sans-serif'});
  const chars=Array.from(z.label),count=Math.max(4,Math.floor((z.width-36)/fontSize));
  for(let i=0;i<chars.length;i+=count){const line=svgNode('tspan',{x:z.x+18,dy:i?fontSize*1.2:0});line.textContent=chars.slice(i,i+count).join('');title.append(line);}g.append(title);
  if(z.baseline!==null)g.append(svgNode('line',{x1:100,y1:z.baseline,x2:900,y2:z.baseline,stroke:'#a9bdb4','stroke-width':1.5,'stroke-dasharray':'8 6'}));
 }
 if(LAYOUTS[layout].beam)for(const x of [180,820])g.append(svgNode('line',{x1:x,y1:50,x2:x,y2:LAYOUTS[layout].height-20,stroke:'#b7cec4','stroke-dasharray':'5 7'}));
 svg.append(g);
}
export function renderDrawing(d,key,{grid=false,guideFont=26}={}){
 const modern=d?.version===2,h=modern?d.height:520;
 const label=modern?LAYOUTS[d.layout].name:SHEETS[key];
 const svg=svgNode('svg',{viewBox:`0 0 1000 ${h}`,xmlns:NS,role:'img','aria-label':label+'作答圖'});svg.append(svgNode('rect',{width:1000,height:h,fill:'white'}));
 if(grid){const g=svgNode('g',{stroke:'#e9eee9','stroke-width':1,'pointer-events':'none'});for(let x=0;x<=1000;x+=25)g.append(svgNode('line',{x1:x,y1:0,x2:x,y2:h}));for(let y=0;y<=h;y+=25)g.append(svgNode('line',{x1:0,y1:y,x2:1000,y2:y}));svg.append(g);}
 if(modern)drawGuides(svg,d.layout,guideFont);
 for(const [i,s] of (d?.sheets[key]??[]).entries()){const g=renderShape(s);g.dataset.shape=String(i);svg.append(g);}return svg;
}
export function renderAnswerDrawing(d){return renderDrawing(toWorkspace(d),'workspace');}
const toolNames={rect:'矩形／斷面框',circle:'圓形／鋼筋孔位',pan:'捲動／瀏覽',select:'選取／移動',line:'構件直線',arrow:'力箭頭',udl:'均佈載重',moment:'彎矩箭頭',pin:'鉸支承',roller:'滾支承',fixed:'固定端',text:'文字',pen:'自由筆',curve:'變形曲線'};
export class DrawingEditor{
 constructor(root,onChange){this.root=root;this.onChange=onChange;this.data=emptyWorkspace();this.key='workspace';this.zoom=1;this.topic='';this.tool='select';this.selected=-1;this.clip=null;this.past=[];this.future=[];this.drag=null;this.mount();this.paint();}
 mount(){this.root.innerHTML=`<div class="drawing-controls"><div class="drawing-head"><h3>圖解作答</h3><span class="active-tool" aria-live="polite"></span><div class="drawing-history"><button type="button" data-action="undo">復原</button><button type="button" data-action="redo">重做</button></div></div>
 <p class="drawing-layout-name"></p>
 <div class="drawing-quickbar"><div class="drawing-tools" role="group" aria-label="常用繪圖工具"></div></div>
 <div class="drawing-menus">
 <details class="drawing-menu"><summary>圖紙／縮放</summary><label>圖紙版型<select data-prop="layout" aria-label="圖紙版型"></select></label><label>畫布縮放<select data-prop="zoom" aria-label="畫布縮放"><option value="1">符合寬度</option><option value="1.5">放大 150%</option><option value="2">放大 200%</option></select></label><p class="muted">切換版型保留圖形原位，可復原；分區只作定位參考。</p></details>
 <details class="drawing-menu"><summary>更多工具</summary><div class="drawing-extra-tools" role="group" aria-label="其他繪圖工具"></div></details>
 <details class="drawing-menu drawing-settings"><summary>文字／樣式</summary><div class="drawing-options"><label>標註文字<input data-prop="text" maxlength="120" placeholder="例如 R_A、30 kN、δ_B"></label><label>顏色<select data-prop="color"><option value="#173c36">深綠</option><option value="#22746a">綠</option><option value="#b64b32">紅</option><option value="#285ca8">藍</option></select></label><label>曲度（正負改方向）<input data-prop="bend" type="range" min="-200" max="200" value="75"></label><button type="button" data-action="apply">套用至選取圖形</button></div></details>
 <details class="drawing-menu"><summary>底圖／編輯</summary><div class="drawing-actions"><label>放置區域<select data-prop="zone" aria-label="底圖放置區域"></select></label><label>底圖<select data-prop="template"><option value="simple">簡支梁</option><option value="cantilever">懸臂梁</option><option value="propped">支承懸臂</option><option value="axes">剪力／彎矩基線</option><option value="section">空白矩形斷面</option><option value="hsection">H 形斷面輪廓</option><option value="layers">土層界線</option><option value="plot">空白座標軸</option></select></label><button type="button" data-action="template">加入底圖</button><button type="button" data-action="stamp">置於中央</button><button type="button" data-action="cut">剪下</button><button type="button" data-action="copy">複製</button><button type="button" data-action="paste">貼上</button><button type="button" data-action="reverse">反向</button><button type="button" data-action="rotate">旋轉支承90°</button><button type="button" data-action="delete">刪除選取</button><button type="button" data-action="export">下載整張 SVG</button></div><label>選取已畫圖形<select data-prop="selection" aria-label="選取已畫圖形"></select></label></details>
 </div></div>
 <div class="drawing-board"></div>
 <p class="drawing-status" role="status">同一張圖可跨區作答；選「捲動」以手指移動畫面。</p>
 <details class="drawing-help"><summary>操作說明與保存方式</summary><p class="muted">選工具後拖曳畫線、箭頭或曲線，點一下放支承或文字。選取圖形可拖移或用方向鍵微調；拖曳藍色端點可改長度。底圖只含構件與支承。梁圖以相同水平位置上下對齊；不需要的區域可留白。手機可放大畫布，選「捲動」平移或捲頁。</p><p class="muted">圖解隨草稿與 JSON 備份保存。可以只畫圖提交，由教練審閱；系統不會自動判定受力圖或變形圖正確。</p></details>`;
 const makeButton=(name,fn)=>{const b=document.createElement('button');b.type='button';b.textContent=name;b.onclick=fn;return b;};
 for(const [id,l] of Object.entries(LAYOUTS)){const o=document.createElement('option');o.value=id;o.textContent=l.name;this.prop('layout').append(o);}
 this.prop('layout').onchange=()=>{const id=this.prop('layout').value;this.commit(()=>{this.data=changeLayout(this.data,id);this.selected=-1;});this.closeMenus();this.message('版型已切換；已有圖形保留原位，可復原。');};
 this.prop('zoom').onchange=()=>{this.zoom=Number(this.prop('zoom').value);this.closeMenus();this.paint();this.message('縮放只改變觀看大小；選「捲動」移動畫面。');};
 for(const k of ['pan','select','pen','arrow','line','udl','moment','pin','roller','fixed','text','curve','rect','circle']){const n=toolNames[k];const b=makeButton(n,()=>{this.cancelDrag();this.tool=k;this.closeMenus();if(['text','curve'].includes(k))this.root.querySelector('.drawing-settings').open=true;this.paint();if(k==='text')this.prop('text').focus();else this.board.focus({preventScroll:true});});b.dataset.tool=k;b.setAttribute('aria-label',n);b.title=n;b.textContent=({pan:'捲動',select:'選取',line:'直線',arrow:'箭頭'})[k]??n;this.root.querySelector(['pan','select','pen','arrow','line'].includes(k)?'.drawing-tools':'.drawing-extra-tools').append(b);}
 this.root.querySelectorAll('.drawing-menu').forEach(menu=>menu.addEventListener('toggle',()=>{if(menu.open)this.root.querySelectorAll('.drawing-menu').forEach(other=>{if(other!==menu)other.open=false;});}));
 this.root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>this.action(b.dataset.action));
 this.prop('selection').onchange=e=>{this.selected=Number(e.target.value);this.tool='select';this.syncProps();this.paint();};
 this.board=this.root.querySelector('.drawing-board');this.board.tabIndex=0;this.board.setAttribute('role','group');this.board.setAttribute('aria-label','圖解作答畫布');
 this.board.addEventListener('pointerdown',e=>this.down(e));this.board.addEventListener('pointermove',e=>this.move(e));this.board.addEventListener('pointerup',()=>this.up());this.board.addEventListener('pointercancel',()=>this.cancelDrag());this.board.addEventListener('lostpointercapture',()=>{if(this.drag)this.cancelDrag();});
 this.board.addEventListener('keydown',e=>{if(this.tool==='pan'||this.selected<0)return;const moves={ArrowLeft:[-5,0],ArrowRight:[5,0],ArrowUp:[0,-5],ArrowDown:[0,5]};if(moves[e.key]){e.preventDefault();this.commit(()=>{this.items()[this.selected]=moveShape(this.items()[this.selected],...moves[e.key],this.data.height);});}else if(e.key==='Delete'){e.preventDefault();this.action('delete');}});
 this.lastWidth=this.board.clientWidth;
 this.resizeObserver=new ResizeObserver(()=>{const width=this.board.clientWidth;if(width>0&&width!==this.lastWidth){this.lastWidth=width;this.cancelDrag();this.paint();}});this.resizeObserver.observe(this.board);
 }
 closeMenus(){this.root.querySelectorAll('.drawing-menu').forEach(menu=>menu.open=false);}
 prop(name){return this.root.querySelector(`[data-prop="${name}"]`);}
 items(){return this.data.sheets[this.key];}
 set(d,topic=this.topic,day=1){this.cancelDrag();this.topic=topic;this.data=toWorkspace(d,lessonLayout(topic,day));this.selected=-1;this.past=[];this.future=[];this.board.scrollLeft=0;this.closeMenus();this.paint();}
 get(){return structuredClone(this.data);}
 message(text){this.root.querySelector('.drawing-status').textContent=text;}
 save(before){if(!validDrawing(this.data)){this.data=before;this.selected=-1;this.paint();this.message('圖形超過上限或座標不合法，這次變更未保存。整張圖最多480個物件。');return;}if(JSON.stringify(before)!==JSON.stringify(this.data)){this.past.push(before);if(this.past.length>35)this.past.shift();this.future=[];this.onChange(this.get());}this.paint();}
 commit(fn){this.cancelDrag();const before=this.get();fn();this.save(before);}
 syncProps(){const s=this.items()[this.selected];if(s){this.prop('text').value=s.text;this.prop('color').value=s.color;this.prop('bend').value=String(s.bend);}}
 paint(){const guideFont=Math.max(26,13000/(Math.max(240,this.board.clientWidth)*this.zoom));const svg=renderDrawing(this.data,this.key,{grid:true,guideFont});this.svg=svg;svg.style.touchAction=this.tool==='pan'?'pan-x pan-y':'none';this.board.style.touchAction=svg.style.touchAction;svg.style.width=`${this.zoom*100}%`;
 svg.querySelectorAll('[data-shape]').forEach(g=>{g.style.cursor=this.tool==='pan'?'grab':this.tool==='select'?'move':'crosshair';if(Number(g.dataset.shape)===this.selected)g.classList.add('selected-shape');});
 const s=this.items()[this.selected];if(s&&['line','arrow','udl','curve','rect','circle'].includes(s.type)&&this.tool==='select'){for(const end of [1,2]){const h=svgNode('circle',{cx:s['x'+end],cy:s['y'+end],r:9,fill:'#fff',stroke:'#285ca8','stroke-width':3});h.dataset.handle=String(end);svg.append(h);}}
 this.board.replaceChildren(svg);this.root.querySelector('.active-tool').textContent='目前：'+toolNames[this.tool];this.root.querySelectorAll('[data-tool]').forEach(b=>{b.classList.toggle('chosen',b.dataset.tool===this.tool);b.setAttribute('aria-pressed',String(b.dataset.tool===this.tool));});this.root.querySelector('.drawing-layout-name').textContent=LAYOUTS[this.data.layout].name;this.prop('layout').value=this.data.layout;this.prop('zoom').value=String(this.zoom);
 const zones=this.prop('zone');if(zones.dataset.layout!==this.data.layout){zones.dataset.layout=this.data.layout;zones.replaceChildren();const list=LAYOUTS[this.data.layout].zones;for(const [i,z] of (list.length?list:[{label:'自由畫布'}]).entries()){const o=document.createElement('option');o.value=String(i);o.textContent=z.label;zones.append(o);}}
 const options=this.prop('selection');options.replaceChildren();const none=document.createElement('option');none.value='-1';none.textContent='未選取';options.append(none);this.items().forEach((s,i)=>{const o=document.createElement('option');o.value=String(i);o.textContent=`${i+1}. ${toolNames[s.type]}${s.text?' · '+s.text:''}`;options.append(o);});options.value=String(this.selected);
 for(const action of ['cut','copy','reverse','delete','apply'])this.root.querySelector(`[data-action="${action}"]`).disabled=this.selected<0;
 this.root.querySelector('[data-action="undo"]').disabled=!this.past.length;this.root.querySelector('[data-action="redo"]').disabled=!this.future.length;this.root.querySelector('[data-action="paste"]').disabled=!this.clip;
 }
 point(e){const p=this.svg.createSVGPoint();p.x=e.clientX;p.y=e.clientY;const v=p.matrixTransform(this.svg.getScreenCTM().inverse());return [Math.max(0,Math.min(1000,v.x)),Math.max(0,Math.min(this.data.height,v.y))];}
 currentShape(type,x,y){const s=shape(type,x,y);s.color=this.prop('color').value;s.text=this.prop('text').value||(type==='text'?'標註':'');s.bend=Number(this.prop('bend').value);return s;}
 down(e){if(this.tool==='pan'||e.isPrimary===false)return;if(e.button!==0&&e.pointerType!=='touch')return;e.preventDefault();this.board.focus({preventScroll:true});const [x,y]=this.point(e);const before=this.get();
 if(this.tool==='select'){const hit=e.target.closest('[data-shape]'),handle=e.target.dataset.handle;if(handle&&this.selected>=0){this.drag={before,start:[x,y],index:this.selected,handle:Number(handle),original:structuredClone(this.items()[this.selected])};}else if(hit){this.selected=Number(hit.dataset.shape);this.syncProps();this.drag={before,start:[x,y],index:this.selected,original:structuredClone(this.items()[this.selected])};}else{this.selected=-1;this.paint();return;}}
 else {if(this.items().length>=480){this.message('這張圖已達480個物件，請整理後再畫。');return;}const s=this.currentShape(this.tool,x,y);s.x2=x;s.y2=y;this.items().push(s);this.selected=this.items().length-1;this.drag={before,start:[x,y],index:this.selected,newShape:true};}
 this.board.setPointerCapture(e.pointerId);this.paint();}
 move(e){if(!this.drag)return;const [x,y]=this.point(e),d=this.drag;let s=this.items()[d.index];if(d.handle){s['x'+d.handle]=x;s['y'+d.handle]=y;}else if(!d.newShape){this.items()[d.index]=moveShape(d.original,x-d.start[0],y-d.start[1],this.data.height);}else if(s.type==='pen'){const last=s.points.at(-1);if(Math.hypot(x-last[0],y-last[1])>3&&s.points.length<300)s.points.push([x,y]);s.x2=x;s.y2=y;}else if(['line','arrow','udl','curve','rect','circle'].includes(s.type)){s.x2=x;s.y2=y;}this.paint();}
 up(){if(!this.drag)return;const d=this.drag;this.drag=null;const s=this.items()[d.index];if(d.newShape&&['line','arrow','udl','curve','rect','circle'].includes(s.type)&&Math.hypot(s.x2-s.x1,s.y2-s.y1)<3){s.x2=Math.min(1000,s.x1+150);if(['rect','circle'].includes(s.type))s.y2=Math.min(this.data.height,s.y1+100);}this.save(d.before);this.message(`同頁圖解：${this.items().length}個物件，已更新草稿。`);}
 cancelDrag(){if(this.drag){this.data=this.drag.before;this.drag=null;this.selected=-1;this.paint();}}
 action(a){if(a==='copy'||a==='cut'){if(this.selected<0)return;this.clip=structuredClone(this.items()[this.selected]);if(a==='cut')this.commit(()=>{this.items().splice(this.selected,1);this.selected=-1;});else{this.paint();this.message('已複製，可貼到同頁其他區域。');}return;}
 if(a==='paste'&&this.clip){this.commit(()=>{this.items().push(moveShape(this.clip,25,25,this.data.height));this.selected=this.items().length-1;});return;}
 if(a==='undo'&&this.past.length){this.cancelDrag();this.future.push(this.get());this.data=this.past.pop();this.selected=-1;this.onChange(this.get());this.paint();return;}
 if(a==='redo'&&this.future.length){this.cancelDrag();this.past.push(this.get());this.data=this.future.pop();this.selected=-1;this.onChange(this.get());this.paint();return;}
 if(a==='delete'&&this.selected>=0){this.commit(()=>{this.items().splice(this.selected,1);this.selected=-1;});return;}
 if(a==='apply'&&this.selected>=0){this.commit(()=>{Object.assign(this.items()[this.selected],{text:this.prop('text').value,color:this.prop('color').value,bend:Number(this.prop('bend').value)});});return;}
 if(a==='rotate'&&this.selected>=0){const s=this.items()[this.selected];if(!['pin','roller','fixed'].includes(s.type)){this.message('旋轉適用於鉸支承、滾支承與固定端。');return;}this.commit(()=>{s.turn=((s.turn??0)+90)%360;});return;}if(a==='reverse'&&this.selected>=0){this.commit(()=>{const s=this.items()[this.selected];if(s.type==='arrow'){[s.x1,s.x2]=[s.x2,s.x1];[s.y1,s.y2]=[s.y2,s.y1];}else if(s.type==='curve')s.bend=-s.bend;else s.direction*=-1;});return;}
 if(a==='template'){this.commit(()=>{const zone=LAYOUTS[this.data.layout].zones[Number(this.prop('zone').value)]??{x:0,y:0,width:1000,height:this.data.height};const name=this.prop('template').value;const items=makeTemplate(name).map(s=>{const beam=LAYOUTS[this.data.layout].beam&&['simple','cantilever','propped'].includes(name);const point=(x,y)=>[zone.x+x*zone.width/1000,beam?zone.baseline+y-240:zone.y+60+y*(zone.height-100)/520];const [x1,y1]=point(s.x1,s.y1),[x2,y2]=point(s.x2,s.y2);return {...s,x1,y1,x2,y2,points:s.points.map(([x,y])=>point(x,y))};});this.items().push(...items);this.selected=-1;});return;}
 if(a==='stamp'){if(['select','pan'].includes(this.tool)){this.message('先選擇一種繪圖工具，再按置於中央。');return;}this.commit(()=>{const zone=LAYOUTS[this.data.layout].zones[Number(this.prop('zone').value)]??{x:0,y:0,width:1000,height:this.data.height};const x=zone.x+zone.width/2,y=zone.y+zone.height/2;const s=this.currentShape(this.tool,x,y);if(['rect','circle'].includes(s.type))s.y2=Math.min(this.data.height,y+100);if(this.tool==='arrow'){s.x2=x;s.y2=Math.max(0,y-110);}this.items().push(s);this.selected=this.items().length-1;});return;}
 if(a==='export'){const svg=renderDrawing(this.data,this.key);const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download=`學習圖解-同頁作答.svg`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.message('已交給瀏覽器下載SVG；可放大或用瀏覽器列印。');}
 }
}
