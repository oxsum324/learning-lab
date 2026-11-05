// Builds the current steel lesson course from the hash-locked SI source.
// Givens follow the 110–114 exam papers: integer tf, tf/cm² and tf·m values, section properties and member lengths in cm.
// Every checked value below is computed from the stated model; nothing is copied from the SI source.
export const STEEL_EXAM_VERSION='steel-structures-2026-11-v5';
const MARK='本日核對短題（先完成，再填下方欄位）';
export const EXAM_RULE='原卷單位：應力與 E 用 tf/cm²，力用 tf，彎矩用 tf·m；斷面性質（A、I、S、Z、r）與構材長度用 cm 系，型鋼標稱尺寸沿原卷以 mm 標示。';
const round=x=>Number(x.toPrecision(7));
const F=(id,label,value,unit)=>({id,label,value:round(value),unit});
const n=x=>String(Number(x.toPrecision(10)));

// Specified models, kept explicit so tests can recompute them independently.
export function hSection({H,bf,tw,tf}){const h=H-2*tf,A=2*bf*tf+tw*h,I=(bf*H**3-(bf-tw)*h**3)/12;return {A,I,rx:Math.sqrt(I/A),Sx:I/(H/2)};}
export function netArea({b,t,dh,s,g}){return t*(b-2*dh+s*s/(4*g));}
export function blockShear({Agv,Ant,Anv,Agt,Fy,Fu,phi}){return phi*Math.min(.6*Fy*Agv+Fu*Ant,.6*Fu*Anv+Fy*Agt);}
export function compression({A,KL,r,Fy,E,phi}){
 const ratio=KL/r,lc=ratio/Math.PI*Math.sqrt(Fy/E);
 if(!(lc<=1.5))throw Error('超出題設非彈性挫屈式 λc≤1.5 範圍');
 return {ratio,lc,Fcr:.658**(lc*lc)*Fy,strength:phi*A*.658**(lc*lc)*Fy};
}
export function ltbInterpolation({Lb,Lp,Lr,Mp,Mr,phi}){if(!(Lp<Lb&&Lb<Lr))throw Error('Lb 不在插值區間');const Mn=Mp-(Mp-Mr)*(Lb-Lp)/(Lr-Lp);return {Mn,design:phi*Mn};}

export const STEEL_EXAM_GIVENS={
 2:{H:300,bf:150,tw:8,tf:12},
 3:{Ag:16,Fy:2.5,Pu:30,Pa:19,phi:.9,asd:.6},
 4:{b:20,t:1,dh:2.2,s:4,g:6,Fy:2.5,Fu:4.1,U:.85,phiY:.9,phiU:.75},
 5:{A:{Agv:18,Ant:4,Anv:15,Agt:4.5},B:{Agv:15,Ant:5.5,Anv:12,Agt:6},Fy:2.5,Fu:4.1,phi:.75},
 6:{A:60,KL:360,rx:5.5,ry:3.5,Fy:2.5,E:2040,phi:.9},
 7:{A:{A:60,KL:360,ry:3,Fy:2.5,E:2040,phi:.9},B:{Ag:18,An:14.5,U:.85,Fy:2.5,Fu:4.1,phiY:.9,phiU:.75}},
 11:{Lb:5,Lp:3,Lr:9,Mp:20,Mr:10,phi:.9},
 14:{B:{Pc:70,Mc:16,Pu:35,Mu:6}},
 23:{A:{Mn:18,phi:.9,demand:15.5},B:{n:2,Rn:12,phi:.75,demand:16}}
};
const G=STEEL_EXAM_GIVENS;
const ltbText=g=>`條件：Lb=${g.Lb} m、Lp=${g.Lp} m、Lr=${g.Lr} m、Mp=${g.Mp} tf·m、Mr=${g.Mr} tf·m、φb=0.90；Lp<Lb<Lr 時採題設線性插值 Mn=Mp-(Mp-Mr)(Lb-Lp)/(Lr-Lp)。題目：求 Mn、φbMn，並判斷不支撐長度所在區間與是否可直接採 Mp。`;

export const STEEL_EXAM_DAYS={
 2(){const g=G[2],H=hSection({H:g.H/10,bf:g.bf/10,tw:g.tw/10,tf:g.tf/10});return {
  questions:[`D02-A｜H 形斷面表回算\n\n條件：對稱焊接 H 形斷面 H${g.H}×${g.bf}×${g.tw}×${g.tf}（mm），即 H=${g.H} mm、bf=${g.bf} mm、tw=${g.tw} mm、tf=${g.tf} mm；忽略銲道與圓角。以題設幾何式回算 A、Ix、rx=sqrt(Ix/A)、Sx=Ix/(H/2)，尺寸先換成 cm，結果依原卷斷面表以 cm²、cm、cm³ 回報。題目：求 A、rx、Sx，判斷此斷面強軸彎曲應使用 Sx 或 Sy，並以一句話說明殘餘應力為何需在壓桿強度曲線中反映。`],
  fields:[F('st_c02_area','斷面積 A',H.A,'cm²'),F('st_c02_rx','強軸迴轉半徑 rx',H.rx,'cm'),F('st_c02_sx','強軸斷面模數 Sx',H.Sx,'cm³')]};},
 3(){const g=G[3];return {
  questions:[`D03-A｜ASD／LRFD 拉力桿同案例\n\n條件：Ag=${g.Ag} cm²、Fy=${g.Fy} tf/cm²（SM400）、Pu=${g.Pu} tf、Pa=${g.Pa} tf；題設 LRFD φ=0.90，ASD 容許應力 0.60Fy。題目：分別求 LRFD 設計強度與 ASD 容許強度，並判斷兩套題設檢核是否均通過。`],
  fields:[F('st_c03_lrfd_strength','LRFD 設計拉力強度 φRn',g.phi*g.Fy*g.Ag,'tf'),F('st_c03_asd_strength','ASD 容許拉力強度',g.asd*g.Fy*g.Ag,'tf')]};},
 4(){const g=G[4],An=netArea(g),Ae=g.U*An,Ag=g.b*g.t;return {
  questions:[`D04-A｜有效淨斷面與剪力遲滯\n\n條件：鋼板 b=${g.b} cm、t=${n(g.t)} cm、兩孔 dh=${g.dh} cm，交錯孔距 s=${g.s} cm、列距 g=${g.g} cm；Fy=${g.Fy} tf/cm²、Fu=${g.Fu} tf/cm²（SM400）、題設 U=0.85、φy=0.90、φu=0.75。採題設 An=t[b-2dh+s²/(4g)]、Ae=UAn。題目：求 An、Ae、兩個設計強度，並判斷控制極限狀態。`],
  fields:[F('st_c04_an','淨斷面積 An',An,'cm²'),F('st_c04_ae','有效淨斷面積 Ae',Ae,'cm²'),F('st_c04_yield_strength','毛斷面降伏設計強度',g.phiY*g.Fy*Ag,'tf'),F('st_c04_fracture_strength','淨斷面斷裂設計強度',g.phiU*g.Fu*Ae,'tf')]};},
 5(){const g=G[5],a=blockShear({...g.A,Fy:g.Fy,Fu:g.Fu,phi:g.phi}),b=blockShear({...g.B,Fy:g.Fy,Fu:g.Fu,phi:g.phi});return {
  questions:[`D05-A｜塊狀剪裂兩破壞路徑\n\n條件：路徑 A：Agv=${g.A.Agv}、Ant=${g.A.Ant}、Anv=${g.A.Anv}、Agt=${g.A.Agt} cm²；路徑 B：Agv=${g.B.Agv}、Ant=${g.B.Ant}、Anv=${g.B.Anv}、Agt=${g.B.Agt} cm²；Fy=${g.Fy} tf/cm²、Fu=${g.Fu} tf/cm²、φ=0.75。採題設 Rn=min(0.6FyAgv+FuAnt, 0.6FuAnv+FyAgt)。題目：求各路徑設計強度，並判斷控制路徑。`],
  fields:[F('st_c05_path_a_strength','A 路徑塊狀剪裂設計強度',a,'tf'),F('st_c05_path_b_strength','B 路徑塊狀剪裂設計強度',b,'tf')]};},
 6(){const g=G[6],x=compression({...g,r:g.rx}),y=compression({...g,r:g.ry});return {
  questions:[`D06-A｜雙軸壓桿屈曲\n\n條件：A=${g.A} cm²、KL=${g.KL} cm、rx=${g.rx} cm、ry=${g.ry} cm、Fy=${g.Fy} tf/cm²、E=${g.E} tf/cm²、φc=0.90。採題設 λc=(KL/r)/π×sqrt(Fy/E) 與 Fcr=0.658^(λc²)Fy。題目：分別求 x、y 軸 KL/r 及設計壓力強度，並判斷控制軸。`],
  fields:[F('st_c06_slenderness_x','x 軸細長比 KL/rx',x.ratio,'—'),F('st_c06_slenderness_y','y 軸細長比 KL/ry',y.ratio,'—'),F('st_c06_strength_x','x 軸壓力設計強度',x.strength,'tf'),F('st_c06_strength_y','y 軸壓力設計強度',y.strength,'tf')]};},
 7(){const a=G[7].A,b=G[7].B,c=compression({...a,r:a.ry});return {
  questions:[`D07-A｜壓桿細長比變化\nA=${a.A} cm²、KL=${a.KL} cm、ry=${a.ry} cm、Fy=${a.Fy} tf/cm²、E=${a.E} tf/cm²、φc=0.90。採題設 λc=(KL/ry)/π×sqrt(Fy/E)、Fcr=0.658^(λc²)Fy、φPn=φc AFcr。求 y 軸 KL/ry 與設計壓力強度；另說明其相對於 ry=3.5 cm、其他條件相同的柱，強度如何變化。本題未給外載，不能判定安全餘度。`,
   `D07-B｜拉力破壞模式快判\n\n條件：Ag=${b.Ag} cm²、An=${b.An} cm²、U=0.85、Fy=${b.Fy} tf/cm²、Fu=${b.Fu} tf/cm²、φy=0.90、φu=0.75。題目：求降伏及斷裂設計強度，並判斷控制破壞模式。`],
  fields:[F('st_w07a_slenderness_y','y 軸細長比 KL/ry',c.ratio,'—'),F('st_w07a_strength_y','y 軸壓力設計強度',c.strength,'tf'),F('st_w07b_yield_strength','毛斷面降伏設計強度',b.phiY*b.Fy*b.Ag,'tf'),F('st_w07b_fracture_strength','淨斷面斷裂設計強度',b.phiU*b.Fu*b.U*b.An,'tf')]};},
 11(){const g=G[11],r=ltbInterpolation(g);return {
  questions:[`D11-A｜梁側扭屈曲簡化插值\n\n${ltbText(g)}`],
  fields:[F('st_c07_mn','梁名義彎矩強度 Mn',r.Mn,'tf·m'),F('st_c07_design_strength','梁設計彎矩強度 φbMn',r.design,'tf·m')]};},
 14(){const g=G[11],r=ltbInterpolation(g),b=G[14].B,ax=b.Pu/b.Pc,mo=b.Mu/b.Mc;return {
  questions:[`D14-A｜梁側扭屈曲簡化插值\n\n${ltbText(g)}`,`D14-B｜梁柱軸力與彎矩互制\n\n條件：題設設計壓力強度 ${b.Pc} tf、設計彎矩強度 ${b.Mc} tf·m，需求 Pu=${b.Pu} tf、Mu=${b.Mu} tf·m；採題設互制比 Pu/φPn+Mu/φMn。題目：求軸力比、彎矩比與互制比；判斷結論寫入評分要點。`],
  fields:[F('st_c07_mn','梁名義彎矩強度 Mn',r.Mn,'tf·m'),F('st_c07_design_strength','梁設計彎矩強度 φbMn',r.design,'tf·m'),F('st_w23b_axial_ratio','梁柱軸力比',ax,'—'),F('st_w23b_moment_ratio','梁柱彎矩比',mo,'—'),F('st_w23b_interaction','梁柱題設互制比',ax+mo,'—')]};},
 23(){const a=G[23].A,b=G[23].B;return {
  questions:[`D23-A｜彎矩設計強度複測\n\n條件：題設 Mn=${a.Mn} tf·m、φb=0.90、需求 ${a.demand} tf·m。題目：求名義及設計彎矩強度；判斷結論寫入評分要點。`,`D23-B｜螺栓群題設強度\n\n條件：${b.n} 支螺栓、每支題設名義剪力 Rn=${b.Rn} tf、φ=0.75、需求 ${b.demand} tf。題目：求螺栓群名義及設計強度；判斷結論寫入評分要點。`],
  fields:[F('st_w23a_nominal_strength','名義彎矩強度 Mn',a.Mn,'tf·m'),F('st_w23a_strength','設計彎矩強度 φbMn',a.phi*a.Mn,'tf·m'),F('st_w14b_nominal_strength','螺栓群名義強度 Rn',b.n*b.Rn,'tf'),F('st_w14b_strength','螺栓群設計強度 φRn',b.phi*b.n*b.Rn,'tf')]};}
};

export function buildSteelExamCourse(source){
 if(source.topicId!=='steel-structures'||source.days?.length!==30)throw Error('鋼構原課表格式不符');
 const course=structuredClone(source);course.version=STEEL_EXAM_VERSION;
 for(const day of course.days){
  const make=STEEL_EXAM_DAYS[day.day];
  if(!make){if(day.fields.length)throw Error('未改寫的數值課次 D'+day.day);continue;}
  const {questions,fields}=make(),[head]=day.problem.split('\n\n---\n\n'+MARK);
  if(head===day.problem)throw Error('找不到核對短題段落 D'+day.day);
  if(fields.map(f=>f.id).join()!==day.fields.map(f=>f.id).join())throw Error('核對欄位與原課表不一致 D'+day.day);
  day.problem=`${head}\n\n---\n\n${MARK}\n\n${questions.join('\n\n')}\n\n${EXAM_RULE}`;
  day.fields=fields;
 }
 return course;
}
