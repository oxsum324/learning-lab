const NS='http://www.w3.org/2000/svg';
const make=(tag,a={},text)=>{const n=document.createElementNS(NS,tag);for(const[k,v]of Object.entries(a))n.setAttribute(k,String(v));if(text!==undefined)n.textContent=text;return n;};
export function problemDiagram(c){
 const s=make('svg',{viewBox:'0 0 620 250',role:'img','aria-label':c.title+'題設示意；不按比例'});
 s.append(make('rect',{width:620,height:250,rx:16,fill:'#f4f6f1'}));
 const line=(x1,y1,x2,y2,w=3)=>s.append(make('line',{x1,y1,x2,y2,stroke:'#234d50','stroke-width':w}));
 const text=(x,y,t)=>s.append(make('text',{x,y,fill:'#27424f','font-size':26,'font-family':'Microsoft JhengHei,sans-serif'},t));
 const arrow=(x,y,ex,ey)=>{line(x,y,ex,ey,2);const a=Math.atan2(ey-y,ex-x),l=12;s.append(make('path',{d:`M${ex-l*Math.cos(a-.45)},${ey-l*Math.sin(a-.45)} L${ex},${ey} L${ex-l*Math.cos(a+.45)},${ey-l*Math.sin(a+.45)}`,fill:'none',stroke:'#27786b','stroke-width':2}));};
 const rect=(x,y,w,h)=>s.append(make('rect',{x,y,width:w,height:h,fill:'#dce7de',stroke:'#274b50','stroke-width':2}));
 const k=c.drawing.kind,id=c.model;
 if(id==='phase'){rect(180,35,200,50);rect(180,85,200,55);rect(180,140,200,65);text(230,68,'空氣');text(230,120,'水');text(230,181,'土粒');text(410,70,'Va');text(410,120,'Vw');text(410,181,'Vs');text(90,237,'三相體積與重量基準分開列示');}
 else if(id==='triaxial'){rect(250,65,120,130);arrow(310,12,310,60);arrow(160,125,240,125);arrow(460,125,380,125);text(330,40,'σ₁');text(130,108,'σ₃');text(420,108,'σ₃');text(270,224,'孔壓 u');}
 else if(id==='mohr'){line(90,192,530,192,2);line(90,192,90,35,2);line(90,160,490,55,3);text(110,120,'有效應力破壞包絡線');text(530,222,'σ′');text(55,37,'τ');text(220,232,'排水強度包絡線示意');}
 else if(['darcy','layer-k','seepage'].includes(id)){rect(190,70,250,120);line(190,130,440,130,1);if(id==='seepage'){arrow(270,205,270,85);arrow(350,205,350,85);text(93,225,'向上滲流');}else{arrow(95,110,175,110);arrow(450,150,530,150);text(260,224,'L、k、Δh');}text(255,109,'土層 1');text(255,169,'土層 2');if(id!=='layer-k'){text(70,42,'水頭依題設');}}
 else if(['pile','pile-group'].includes(id)){line(80,75,540,75);rect(210,40,200,30);for(const x of (id==='pile'?[310]:[250,310,370])){rect(x-8,70,16,130);arrow(x,229,x,204);}arrow(310,8,310,36);text(95,132,c.condition&&id==='pile'?'負摩擦 ↓':'周摩擦 ↑');text(415,210,'端承');text(125,246,'樁數、尺寸及力的方向依題設');}
 else if(['earth','wall'].includes(id)){rect(240,60,290,135);rect(215,45,25,155);for(let y=80;y<190;y+=30)arrow(250+(y-60)/2,y,245,y);text(280,40,'擋土側');text(80,225,'土壓、牆重與底面抗力分別列示');}
 else if(id==='slope'){s.append(make('path',{d:'M90 195 L440 55 L540 55 L540 195 Z',fill:'#dce7de',stroke:'#274b50','stroke-width':2}));line(155,195,455,75,1);text(100,225,'β');text(330,155,'滑動面');text(135,34,c.condition?'順坡飽和滲流':'乾燥無凝聚力');}
 else if(id==='uplift'){rect(160,85,300,40);for(const x of [200,270,340,410])arrow(x,195,x,130);arrow(310,25,310,78);text(330,47,'W');text(200,229,'底面水頭 h、上舉 U');}
 else if(k==='soil'){rect(80,70,460,115);for(const y of [110,150])line(80,y,540,y,1);rect(245,45,130,25);arrow(310,12,310,44);text(330,32,'題給地表條件');line(440,70,440,185,1);text(454,130,'z／H');text(100,222,'土層、水位、排水基準依題設');}
 else if(k==='section'){
  if(id==='h-section'||id.startsWith('steel-')||['classification','asdlrfd','block'].includes(id)){rect(200,45,220,24);rect(298,69,24,110);rect(200,179,220,24);text(160,233,'斷面性質與尺寸依題設');}
  else{rect(210,40,200,160);for(const x of [240,280,320,360,390])s.append(make('circle',{cx:x,cy:173,r:6,fill:'#286b61'}));text(124,113,'壓力');text(425,177,'拉力');text(158,232,'斷面與鋼筋僅示意，非配筋施工圖');}
 }else if(['capacity','rc-capacity'].includes(id)){
  line(95,140,525,140,7);line(95,65,525,65,1);for(let x=115;x<525;x+=45)arrow(x,65,x,123);text(300,43,'q');
  for(const x of [95,525]){s.append(make('path',{d:`M${x-16} 103 A22 22 0 1 1 ${x+20} 108`,fill:'none',stroke:'#27786b','stroke-width':3}));text(x-35,195,'Mpr');}
  text(88,228,c.condition?'指定端：VM − Vg（有號）':'指定端：VM + Vg（有號）');
 }else if(k==='connection'){if(id==='weld'){rect(160,140,300,20);rect(300,50,20,90);s.append(make('path',{d:'M280 140 L300 120 L300 140 Z',fill:'#b99763',stroke:'#245458'}));if(c.condition)s.append(make('path',{d:'M320 120 L340 140 L320 140 Z',fill:'#b99763',stroke:'#245458'}));text(195,107,'w');text(350,126,'te');text(120,220,'等腳角銲與有效喉厚示意');}else if(id==='eccentric'){
  rect(205,70,210,125);for(const x of [250,370])for(const y of [100,165])s.append(make('circle',{cx:x,cy:y,r:9,fill:'#f5f1e6',stroke:'#245458','stroke-width':3}));line(310,54,310,204,1);const x=c.condition?130:490;arrow(x,35,x,130);line(Math.min(x,310),42,Math.max(x,310),42,1);text(c.condition?145:380,32,c.condition?'−e':'＋e');text(238,232,'四栓 (±a, ±b)；外力 V ↓');
 }else{rect(130,65,240,110);rect(260,80,230,110);for(const x of [290,340])for(const y of [105,155])s.append(make('circle',{cx:x,cy:y,r:9,fill:'#f5f1e6',stroke:'#245458','stroke-width':3}));text(90,224,'荷重、接合數與有效面積依題設');arrow(485,25,485,76);}}
 else if(k==='truss'){line(120,65,310,183,5);line(500,65,310,183,5);line(95,58,145,58);line(475,58,525,58);arrow(310,190,310,228);text(340,222,'P');text(165,125,'N');text(424,125,'N');}
 else if(id==='bridge'){
  line(130,200,490,200,6);const columns=c.condition?[230,390]:[310];for(const x of columns){line(x,200,x,96,6);for(let h=x-22;h<x+25;h+=12)line(h,207,h-8,219,1);}rect(180,75,260,24);arrow(450,85,540,85);text(290,61,'m');text(150,247,c.condition?'兩柱並聯：同位移、勁度相加':'單一懸臂柱：基底固定');
 }else if(k==='dynamic'){
  const two=['two-dof','modal','base-shear'].includes(id);line(170,205,450,205,6);line(210,205,210,two?67:102,4);line(410,205,410,two?67:102,4);rect(180,95,260,24);text(264,85,two?'m₂':'m');if(two){rect(180,155,260,20);text(264,148,'m₁');}line(450,93,550,93,2);text(473,80,'u →');text(145,238,'質量、勁度、阻尼與座標依題設');
 }else if(k==='frame'){if(['buckling','torsional'].includes(id)){line(310,65,310,195,7);arrow(310,12,310,58);text(343,128,'柱');text(180,232,'有效長度與挫屈模式依題設');}else{line(160,190,160,70,6);line(160,70,450,70,6);if(id==='frame'){line(130,197,190,197);arrow(450,12,450,65);text(280,106,'a');text(115,145,'h');}else{line(450,70,450,190,6);line(130,197,190,197);line(420,197,480,197);arrow(335,12,335,65);}text(210,235,'支承與節點條件依題設');}}
 else if(k==='axial'){rect(120,100,370,28);line(110,75,110,155,6);line(500,114,565,114);text(520,92,'P →');text(240,171,'L、EA');}
 else{
  const fixed=['cantilever','force-flexibility','propped','settlement'].includes(id)||(['udl','plastic'].includes(id)&&c.condition);
  line(90,140,530,140,7);if(fixed){line(90,100,90,175,5);for(let y=103;y<176;y+=12)line(90,y,74,y+10,2);}else{s.append(make('path',{d:'M90 146 L73 172 L107 172 Z',fill:'none',stroke:'#234d50','stroke-width':2}));}
  const supported=!fixed||id==='settlement'||(id==='propped'&&!c.condition);if(supported){s.append(make('path',{d:'M530 146 L513 169 L547 169 Z',fill:'none',stroke:'#234d50','stroke-width':2}));if(id==='settlement'){line(530,170,530,195,3);line(507,199,553,199,3);}else for(const x of [521,539])s.append(make('circle',{cx:x,cy:178,r:5,fill:'none',stroke:'#234d50'}));}
  if(id==='plastic'&&c.condition){line(530,100,530,175,5);for(let y=103;y<176;y+=12)line(530,y,546,y+10,2);}
  const udl=['udl','beam-deflection','propped','force-flexibility'].includes(id);if(udl){line(90,70,530,70,1);for(let x=90;x<=530;x+=44)arrow(x,70,x,125);text(285,49,'q');}else if(id!=='settlement'){let r=c.params.r??(['cantilever'].includes(id)?1:.5);if(id==='point'&&c.condition)r=1-r;let x=90+440*r;arrow(x,48,x,126);text(x+14,64,'P');}else{text(273,83,c.condition?'B 向上位移':'B 向下沉陷');}
  text(76,215,'A');text(524,215,'B');line(95,232,525,232,1);text(299,224,'L');
 }
 return s;
}
