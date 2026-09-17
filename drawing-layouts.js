// Visual guides only: no loads, answers or required completed diagrams are supplied.
const rows=(name,labels,{beam=false,h=320}={})=>({name,height:labels.length*h,beam,zones:labels.flatMap((row,i)=>(Array.isArray(row)?row:[row]).map((label,j,cols)=>({label,x:j*1000/cols.length,y:i*h,width:1000/cols.length,height:h,baseline:beam?i*h+170:null})))});
export const LAYOUTS={
 'beam-internal':rows('梁｜受力 → V → M',['受力與載重','剪力 V','彎矩 M'],{beam:true}),
 'beam-full':rows('梁｜受力 → V → M → 變形',['受力與載重','剪力 V','彎矩 M','變形'],{beam:true}),
 'beam-displacement':rows('梁｜受力與變形',['受力與載重','變形／虛擬單位力'],{beam:true}),
 'force-method':rows('力法｜原結構、基本系統與相容',['原結構受力','基本系統／單位力','變形與相容']),
 truss:rows('桁架｜節點、桿力與位移',['桁架與支承','節點受力／桿力／位移']),
 frame:rows('構架｜受力、內力與變形',['構架與受力','軸力／剪力／彎矩','變形與機構']),
 'rc-section':rows('RC｜斷面、配筋、應變與應力',['斷面與配筋',['應變分布','應力／合力']],{h:400}),
 'rc-balance':rows('RC｜指定受力與平衡',['斷面與指定受力',['合力／力臂','P–M 平衡點']],{h:400}),
 'rc-column':rows('RC｜柱與二階效應',['柱／支承／一階彎矩','變形／二階效應／設計流程']),
 'rc-service':rows('RC｜裂縫與撓度',['構件／配筋／載重','裂縫／變形／撓度']),
 'rc-detail':rows('RC｜配筋、臨界截面與力流',['構件／配筋配置','臨界截面／力流'],{h:400}),
 'rc-prestress':rows('預力｜線形、階段與應力',['構件／鋼腱線形',['應力分布','預力階段／損失']],{h:400}),
 'steel-member':rows('鋼構｜構件與屈曲',['構件／支撐／斷面','屈曲／變形模式']),
 'steel-section':rows('鋼構｜斷面與應力',['斷面／尺寸',['應力分布','材料／強度關係']],{h:400}),
 'steel-connection':rows('鋼構｜接合與傳力',['螺栓／銲道／板件配置','接合受力／破壞路徑'],{h:400}),
 'dynamics-time':rows('動力｜振動模型與歷時',['振動模型／座標','載重／位移歷時']),
 'dynamics-modal':rows('動力｜系統、振態與組合',['系統／質量／勁度','振態／參與／組合']),
 'dynamics-spectrum':rows('耐震｜系統與反應譜',['結構／地盤輸入','反應譜／設計流程']),
 'soil-phase':rows('土壤｜三相與試驗',['三相關係／試驗模型','參數／試驗曲線']),
 'soil-stress':rows('土壤｜土層、水位與應力',[['土層／水位','總應力／孔壓／有效應力']],{h:720}),
 'soil-flow':rows('大地｜土層、水頭與滲流',['土層／水位／邊界','流網／水頭／流向']),
 'soil-consolidation':rows('土壤｜排水、沉陷與時間',['土層／載重／排水面','壓密曲線／沉陷與時間']),
 'soil-strength':rows('土壤｜試驗、應力圓與強度',['試驗／排水條件','應力圓／包絡線／應力路徑']),
 'soil-foundation':rows('大地｜基礎與傳力',['土層／水位／基礎','力傳遞／接觸壓力／沉陷']),
 'soil-stability':rows('大地｜土壓與破壞機制',['地層／水位／擋土或邊坡','土壓／受力／破壞面']),
 free:{name:'自由畫布',height:960,zones:[]},
 legacy:rows('舊圖合併｜保留原配置',['原受力圖','原剪力／彎矩圖','原變形圖'],{h:600})
};
// Explicit per-lesson choices. Mixed diagnostic/review tasks use a free canvas.
const course=(...ids)=>ids;
export const LESSON_LAYOUTS={
 'structural-analysis':course('beam-internal','beam-internal','free','beam-internal','truss','frame','beam-internal','beam-displacement','beam-full','beam-displacement','beam-displacement','truss','beam-displacement','beam-displacement','force-method','force-method','beam-full','beam-full','beam-full','free','beam-full','frame','free','free','free','free','free','beam-full','beam-full','free'),
 'reinforced-concrete':course('free','rc-section','rc-section','rc-balance','rc-column','rc-detail','rc-section','rc-detail','rc-detail','rc-detail','rc-service','rc-detail','rc-detail','rc-detail','rc-detail','rc-detail','rc-detail','rc-detail','rc-prestress','rc-prestress','rc-prestress','rc-prestress','free','rc-detail','rc-detail','rc-detail','rc-prestress','free','free','free'),
 'steel-structures':course('free','steel-section','steel-member','steel-connection','steel-connection','steel-member','steel-member','steel-member','steel-section','steel-section','steel-member','steel-member','steel-member','steel-member','steel-connection','steel-connection','steel-connection','steel-connection','steel-connection','frame','free','frame','free','steel-section','steel-connection','steel-member','frame','free','free','free'),
 'structural-dynamics':course('free','dynamics-time','dynamics-time','dynamics-time','dynamics-time','dynamics-time','dynamics-time','dynamics-spectrum','dynamics-modal','dynamics-modal','dynamics-modal','dynamics-modal','dynamics-modal','dynamics-modal','dynamics-time','dynamics-spectrum','frame','frame','dynamics-spectrum','rc-detail','frame','frame','dynamics-time','free','free','free','free','free','free','free'),
 'soil-foundations':course('free','soil-phase','soil-stress','soil-flow','soil-flow','soil-phase','free','soil-stress','soil-consolidation','soil-consolidation','soil-strength','soil-strength','soil-strength','free','soil-foundation','soil-foundation','soil-foundation','soil-foundation','soil-stability','soil-stability','soil-stability','soil-stability','soil-stability','soil-consolidation','soil-strength','soil-stability','soil-stress','soil-foundation','free','free')
};
export function lessonLayout(topic,day){return LESSON_LAYOUTS[topic]?.[day-1]??'free';}
