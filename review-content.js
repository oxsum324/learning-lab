import {shape,emptyWorkspace} from './drawing-model.js?v=0.14.2';
import {lessonLayout} from './drawing-layouts.js?v=0.14.2';

// Authored exercise registry. Unlisted lessons deliberately have no recognition item.
// Diagrams are qualitative teaching schematics; dimensions are labelled, not to scale.
export const REVIEW_CONTENT={};
const add=(topic,days,texts,visual=null,quantity=null)=>{for(const day of days)(REVIEW_CONTENT[topic]??={})[day]={texts,visual,quantity,source:`${topic} D${String(day).padStart(2,'0')}`};};
const SA='structural-analysis',RC='reinforced-concrete',ST='steel-structures',DY='structural-dynamics',SO='soil-foundations';
const visual=(family,prompt,labels,task,parameters={})=>({family,prompt,labels,task,parameters});
const numeric=(field,wrong,reasons)=>({field,wrong,reasons});
const beamTexts=['簡支梁兩端彎矩為零，剪力為彎矩圖的斜率。','把簡支梁端彎矩當成固定端彎矩，兩端都畫非零值。','把剪力圖直接當成彎矩圖，兩圖畫成相同形狀。'];
for(const [day,L,q] of [[1,6,10],[4,6,8],[9,6,10],[28,4,8]])add(SA,[day],beamTexts,visual('udl','選出與題設相符的支承與滿跨均佈載重。',['A 鉸、B 滾，滿跨向下 q。','A 固定、B 自由，滿跨向下 q。','A 鉸、B 滾，只有跨中集中力。'],'已給梁、支承與題設載重；補反力方向與數值，接著完成 V／M；位移題另補變形與邊界條件。',{L,q}));
add(SA,[2],['載重較靠 A，A 反力較大；集中力處 V 跳躍而 M 連續。','梁有兩個支承，所以不論載重位置兩端反力必相等。','集中力使彎矩跳躍，但剪力保持連續。'],visual('point','哪張受力圖符合距 A 2 m 的集中力題設？',['P 距 A 2 m，A 鉸、B 滾。','P 放在跨中，A 鉸、B 滾。','P 距 A 2 m，兩端都只有滾支承。'],'補 A、B 反力；以 P 位置分段畫 V／M，保留跳躍、連續性與單位。',{L:6,P:12,a:2}),numeric('ra',[6,4],['誤把偏心載重當對稱載重，各分 P/2。','把 B 端反力誤填成 A 端反力。']));
add(SA,[3],['兩端水平面滾支承仍容許水平剛體平移，須先查穩定。','只要梁有兩個支承就必定穩定，與反力方向無關。','固定端加滾支承與左鉸右滾都只有三個未知反力。']);
add(SA,[5],['C 節點兩斜桿受壓支撐下向荷載，底桿受拉限制兩端分開。','C 節點兩斜桿都受拉，向下荷載仍能由拉力平衡。','三根桁架桿必須傳遞端彎矩，才能抵抗頂點荷載。'],visual('truss','哪張模型符合三節點理想鉸接桁架？',['C 在頂點受向下 P；三桿鉸接。','P 在底桿跨中，且沒有 C 點外力。','頂點 C 在 AB 下方，P 仍向下。'],'已給幾何、支承與外載；補支承反力及獨立 C 節點的桿力方向，再標拉壓與平衡。',{P:10}));
add(SA,[6],['B 剛接可傳遞彎矩，柱即使沒有橫向剪力也可能受彎。','把 B 剛接改畫成鉸，仍可沿用同一柱彎矩。','C 自由端的集中力不會對 A 產生外力矩。']);
for(const day of [8,10])add(SA,[day],['A 固定端位移與轉角皆零；自由端可位移、可轉動。','A 固定端只有位移為零，轉角可以任意變化。','自由端沒有支承，因此自由端位移與轉角都必為零。'],visual('cantilever','選出本題固定端、自由端與端力位置。',['A 固定、B 自由，B 受向下 P。','A 鉸、B 滾，B 受向下 P。','A 固定、B 自由，B 受向上 P。'],'補 A 反力與反力矩；D08 補曲率／邊界條件，D10 另畫向下單位力與 m 圖。',{L:3,P:10}));
add(SA,[11],['真實荷載與跨中向下單位力分開，利用 M 與 m 的乘積積分。','把單位力加到真實荷載，先以 13 kN 求新的真實彎矩。','單位力法的 m 圖取真實 M 圖的平方即可，不需虛擬系統。'],visual('point','選出本題的真實集中力位置（虛擬系統另畫）。',['P 在跨中，A 鉸、B 滾。','P 距 A 2 m，A 鉸、B 滾。','P 在跨中，兩端都是滾支承。'],'補反力與真實 M 圖；再另畫跨中向下單位力的 m 圖與分段積分。',{L:6,P:12,a:3}));
add(SA,[15],['解除 B 鉛直拘束成穩定懸臂，用相容式求 B 贅力。','解除 A 固定端全部拘束，只留 B 滾支承作基本系統。','B 贅力只需整體靜力平衡即可唯一求出，不需相容。']);
add(SA,[16],['δ₀ 是載重位移，f 是單位力柔度；二者量綱不同。','δ₀ 與 f 都是位移，數值可直接相減而不乘贅力。','計算柔度時應把真實均佈載重 q 再乘一次。']);
add(SA,[17],['先以相容求贅力，再回原結構用平衡求其餘反力。','把基本系統自由端的零反力，當作原結構 B 反力。','求得贅力後不需要再檢查原結構的整體平衡。']);
add(SA,[18],['B 指定沉陷不為零，相容式右側須包含該沉陷。','支承沉陷不改荷載，因此相容式右側仍一律為零。','沉陷量與反力同為正值，可不查方向直接相加。']);
add(SA,[19],['跨度改變需重算載重位移及柔度，不沿用 L=4 的係數。','只把總載重 qL 改掉，柔度仍沿用原跨度。','跨度變長時 EI 自動同比增加，不需題設資料。']);
add(SA,[22],['B 是連續支承而非內鉸，節點端矩互平衡不代表截面 M=0。','梁下畫了滾支承，梁身該截面就必須是內鉸且 M=0。','B 節點兩構件端矩都取同一方向，平衡式可省略一邊。']);
add(SA,[24],['影響線橫軸是移動荷載位置，剪彎圖橫軸是截面位置。','影響線與剪彎圖都只表示固定荷載下沿梁的截面內力。','反力影響線的縱距單位必為 kN，與單位移動力無關。']);
add(SA,[25],['各荷載乘其位置的影響線縱距，再疊加所求同一反應。','先加總所有荷載，再乘任選一個位置的縱距即可。','用 A 反力的影響線直接求跨中彎矩，不需換影響線。']);
add(SA,[26],['軸桿 k=EA/L，ku 的單位為力，B 的軸向位移為未知量。','軸桿剛度 k=EAL，桿越長軸向剛度越大。','把 k 的 kN/m 直接當成位移 mm，不需荷載。'],visual('axial','選出固定 A、B 端向右拉力的軸桿模型。',['A 軸向固定，B 向右 P。','A 軸向固定，B 向左 P。','A、B 都軸向固定，但把 B 位移當唯一未知。'],'補 B 的位移箭頭、A 反力與 ku=P，寫清力與長度單位。',{L:3,P:12,EA:60000}));

add(RC,[2],['壓拉合力形成力偶；題設模型以 d−a/2 為力臂，再乘 φ 得設計值。','使用 d+a/2 為壓拉力臂，因壓力塊在中性軸上方。','題設已給 φ，名義彎矩 Mn 的計算應先把 As 乘 φ。'],visual('rc','哪個正彎矩梁的壓力塊／拉力筋示意符合本題？',['上緣受壓、下層鋼筋受拉，a 是壓力塊深度。','下緣受壓、上層鋼筋受拉。','把整個有效深度 d 都當成均勻壓力塊 a。'],'已給矩形輪廓與拉力筋；補上壓力塊、C／T 方向、a 與力臂，不預填強度。',{b:300,d:500}),numeric('a',[75,103.806],['漏掉題設混凝土等效壓應力係數 0.85。','把 a/β1 得到的中性軸深度 c 誤填成 a。']));
add(RC,[3],['先以 be 求 a，若 a≤hf 壓力塊在翼板內，才可用矩形分支。','T 梁不論 a 的大小，一律只以腹板寬 bw 求壓力塊。','只看截面有翼板，就可忽略 a 與 hf 的位置比較。'],visual('tsection','選出 a≤hf 的正彎矩 T 梁壓力區。',['上翼板內有壓力塊，下部拉力筋。','只在腹板設壓力塊，忽略上翼板。','下緣受壓、上翼板鋼筋受拉。'],'已給 T 形輪廓與拉力筋；補 be、bw、hf、壓力塊範圍，判斷 a 與 hf。',{be:900,bw:300,hf:100,d:600}));
add(RC,[4],['本題鋼筋應力已指定，只驗算合力與中心力臂，不宣稱相容成立。','指定兩層筋應力等於 fy，所以本題已證明完整 P–M 曲線。','求 Pn 時將壓力筋與拉力筋同號相加，不需拉壓定義。']);
add(RC,[5],['按題設無側移模型以 δ 放大 M2，分母含 Pu/(0.75Pc)。','δ 就是 Pu/Pc，直接以它乘 M2。','無側移柱完全不會有二階效應，Mu 一律等於 M2。']);
add(RC,[6],['兩肢總面積 Av 已給，不再乘 2；φ 應乘 Vc+Vs。','Av 已是兩肢總面積，計算 Vs 時再乘 2。','設計剪力只取 φVs，完全不計題設 Vc。'],visual('stirrup','哪張剪力筋圖表示本題兩肢箍筋與沿梁間距 s？',['矩形箍有兩肢，沿梁方向標 s。','只有一肢直筋，卻標成兩肢 Av。','把截面梁深 d 標成沿梁箍筋間距 s。'],'已給梁與一個箍筋輪廓；補另一個箍筋與 s，標兩肢 Av、d、剪力方向。',{d:500,s:150}));
add(RC,[9],['伸展長度檢核須追蹤鋼筋力的錨定，不把搭接視為所有位置均可任意設置。','鋼筋有彎鉤就一定充分錨定，伸展長度與力流不需檢查。','搭接長度只由梁跨度決定，不需鋼筋應力或規範條件。']);
add(RC,[11],['開裂後有效剛度與長期效應須分別檢核，強度通過不等於撓度通過。','只要 φMn≥Mu，長期撓度與裂縫也必定通過。','服務荷載撓度一律使用未開裂毛斷面剛度，不查開裂。']);
add(RC,[19],['預力與外載按傳遞、服務階段分別疊加上下緣應力。','所有階段只用最後有效預力，不需傳遞時材料強度。','偏心預力只產生均勻軸應力，不會產生彎曲應力。']);
add(RC,[20],['先分清即時與長期損失，再按同一基準合成有效預力。','各種損失百分比若基準不同，也可直接相加而不查。','長期潛變、收縮與鬆弛不影響有效預力。']);

add(ST,[2],['面積採兩翼板加淨腹板；Ix／rx／Sx 各有不同量綱。','腹板面積用 twH，再加兩翼板，重複計入交界面積。','截面模數 Sx 與回轉半徑 rx 同為長度，可互相代替。'],visual('hsection','哪張 H 形面積分區與強軸標示符合本課幾何式？',['淨腹板高度 H−2tf；x 軸通過重心且水平。','腹板高度用 H，與兩翼板重疊計面積。','將垂直重心軸標作本圖的強軸 x。'],'已給 H 輪廓、H 與 bf；補 tw、tf、淨腹板高度與重心強軸，再列 A、Ix、rx、Sx。',{H:300,bf:150,tw:8,tf:12}),numeric('st_c02_area',[6000,4008],['腹板用 twH，再加兩翼板，重複計交界。','漏算一片翼板面積。']));
add(ST,[3],['LRFD 的 φRn 比 Pu；ASD 的容許強度比 Pa，兩邊載重層級配對。','用 LRFD 的 φRn 比服務載重 Pa，就等於完整 LRFD 檢核。','將 ASD 的容許應力再乘 LRFD φ，以得到同一法的強度。']);
add(ST,[4],['交錯孔路徑含正的 s²/(4g) 修正，Ae=UAn；另查毛面積降伏。','交錯孔距修正 s²/(4g) 應從淨面積再扣除。','有效淨面積 Ae 一律等於 Ag，剪力遲滯 U 可省略。']);
add(ST,[5],['各路徑都取題設兩式較小值，再比較 A、B 路徑；不反推未給孔位。','各路徑取兩式較大值，才不會過度低估強度。','題目只給面積，也可唯一還原每個螺栓的孔位圖。']);
add(ST,[6],['同 KL 下，較小 ry 得較大細長比與較低柱強度，需比較兩軸。','因 rx 大於 ry，x 軸細長比必較大而控制。','比較柱軸力強度只看 A，不需兩軸 r。'],visual('column','依 rx=55、ry=35，選出本題控制軸的判讀。',['λy>λx，y 軸較弱且先檢核。','λx>λy，x 軸較弱且先檢核。','λx=λy，兩軸同樣細長。'],'已給柱與軸壓方向；補控制軸、該方向挫屈形狀及兩個 KL/r，再依題設曲線算強度。',{rx:55,ry:35,KL:3600}));
add(ST,[9],['翼板與腹板寬厚比分別查，局部板件分類與整體構件細長比不同。','H 梁只查翼板，不管腹板寬厚比即可判定斷面類別。','KL/r 已查過就能取代所有板件寬厚比限制。']);
add(ST,[10],['側向充分支承仍需區分 My、Mp 與局部板件限制。','有側向支承的梁，無論斷面分類都能達到 Mp。','彈性與塑性截面模數必相等，所以 My=Mp。']);
add(ST,[11],['Lb 是壓翼緣有效側向支撐間距，不能直接用總跨距取代。','梁只要兩端有鉛直支承，壓翼緣 Lb 就等於零。','Cb 與彎矩梯度無關，可任意固定為最大值。']);
add(ST,[17],['銲道面積使用有效喉厚與有效長度，另核對母材及力流。','角銲道強度面積直接取銲腳尺寸乘外觀總長。','只要銲道足夠，母材破壞與接合傳力都可不查。']);
add(ST,[18],['偏心群中心先分直接力與力矩造成的剪力，再向量合成找最不利點。','偏心力矩產生的螺栓剪力全部與直接力同向，純量相加即可。','只要群中螺栓數相同，各螺栓合力也一定相同。']);

add(DY,[2],['x=u−ug 時 mx¨+cx˙+kx=−mug¨，右側是慣性輸入而非位移方向。','x=u−ug 時右側應為 +mug¨，因地盤加速度為正。','把彈簧力寫 k(u+ug)，仍稱它為相對變形 x=u−ug。'],visual('base','哪張模型與相對座標 x=u−ug 的基底激振題設一致？',['彈簧與阻尼都接同一移動基底；x=u−ug。','彈簧接移動基底，但阻尼接固定地面。','同一移動基底，卻將 x 定義為 u+ug。'],'已給質量、彈簧／阻尼輪廓與基底；補 k、c、u、ug、x 的正方向，寫完整相對座標運動方程。',{m:1000,k:400000,c:2000}),numeric('dy_c02_omega',[400,3.1831],['漏開根號，將 k/m 當作圓頻率。','把 f=ω/(2π) 的 Hz 值誤當 rad/s。']));
add(DY,[3],['u0>0、v0=0 的無阻尼自由振動由餘弦起步，T/4 時位移過零。','v0=0，所以位移必從零值的正弦曲線起步。','在 T/4 位移過零，速度與動能也必為零。'],visual('free','哪條曲線符合 u(0)=+0.040 m、v(0)=0？',['從正位移峰值水平起步的餘弦。','從零位移向上起步的正弦。','從負位移峰值水平起步的負餘弦。'],'已給座標軸及初始位置點；補整個週期曲線、T/4、速度方向與能量說明。',{u0:0.04}));
add(DY,[4],['相鄰同向峰值比取 ln(x1/x2)，以一個完整衰減週期解阻尼。','20 與 14 是相鄰同向峰值，應視為半週期而不用改公式。','阻尼比 ζ 的單位與位移相同，應以 mm 表示。'],visual('decay','哪張峰值示意符合相鄰同向峰值 20→14 mm？',['兩個正峰值相隔一週期，第二峰較低。','第二個正峰比第一峰更高。','把正峰與負峰的絕對值當成相鄰同向峰。'],'已給時間軸及兩峰高度點；補衰減包絡、同向峰間隔與 δ／ζ 推導。',{x1:20,x2:14}));
add(DY,[5],['r=ω/ωn，穩態幅值與暫態不同；有阻尼峰值不必恰在 ωn。','將 r 寫成 ωn/ω，仍可直接套題設動態放大式。','題設穩態解就是全歷時解，不需初始條件或暫態。']);
add(DY,[6],['無阻尼階躍且零初值時，u=P0/k[1−cos(ωnt)]，最大為 2P0/k。','持續階躍力下，無阻尼反應也必單調收斂到 P0/k。','P0 施加後馬上移到靜態位移，慣性完全不影響反應。'],visual('step','哪條反應示意符合無阻尼持續階躍、零初值？',['從零起步，在 0 與 2P0/k 間振動。','從零起步，單調漸近 P0/k。','從零起步，位移隨時間無限線性增加。'],'已給座標軸與靜態位移基線；補 u(t) 曲線、峰值及初始條件。',{}));
add(DY,[9],['剪力樓每層水平位移為自由度；層間彈簧使剛度矩陣含耦合項。','質量矩陣的對角項直接填樓層重量，不需一致單位。','有兩個樓層，剛度矩陣的非對角項一律為零。']);
add(DY,[10],['振態尺度可正規化改變；自然頻率由特徵值決定而不隨尺度改變。','振態幅值乘 2，該振態的自然頻率也乘 2。','模態向量中最大分量就是自然頻率，不需特徵值問題。']);
add(DY,[12],['參與係數需質量加權及輸入方向；不能只比較振態最大分量。','哪個振態最大分量較大，該振態有效質量就一定最大。','振態正規化不同，會使整體物理反應任意改變。']);
add(DY,[13],['接近頻率或相關振態需考慮相關性；SRSS 與 CQC 的適用條件不同。','所有振態最大值必在同一時刻同號，直接代數相加即可。','CQC 和 SRSS 對任何頻率間距與阻尼都必給相同結果。']);

add(SO,[2],['e=(Va+Vw)/Vs，w=Ww/Ws；飽和度是水佔孔隙體積的比例。','孔隙比 e=Va/Vs，孔隙中已有的水不算孔隙。','含水量 w=Vw/Vs，因質量與體積比例一定相同。'],visual('phase','哪個三相圖正確標出孔隙體積 Vv？',['Vv 同時包含空氣 Va 與水 Vw。','Vv 只包含空氣 Va，不包含水 Vw。','Vv 包含固體 Vs 及水 Vw，不包含空氣 Va。'],'已給三相容器及 Vs=1 的正規化；補 Vv、Vw、Va 與 Ws／Ww、單位，再求 S；正規化不是題目指定實際體積。',{Gs:2.65,e:0.5,w:0.1}),numeric('so_c02_dry_unit_weight',[19.064,25.9965],['把含水的濕單位重誤填成乾單位重。','漏除以 1+e，忽略孔隙體積。']));
add(SO,[3],['總應力用各層總單位重；靜水孔壓由水位下水深計，再扣一次。','孔壓由地表量到 4 m，忽略地下水位在 2 m。','總應力先用浮單位重，最後再扣孔壓一次。'],visual('stress','哪張靜水孔壓圖符合水位深 2 m、計算點深 4 m？',['水位以上 u=0，水位下線性增加。','孔壓從地表開始線性增加。','所有深度孔壓皆為零。'],'已給土層與水位；補計算點的 σ、u、σ′ 及孔壓深度圖，不重複扣水壓。',{upper:2,depth:4,gamma:18,gammaSat:20}));
add(SO,[4],['Darcy 流向依總水頭高低，不靠壓力水頭單獨判定方向。','水只能由高壓力水頭流向低壓力水頭，不管高程。','水力坡降 i=Δh×L，因水頭差與流路越長流量越大。']);
add(SO,[5],['流網單位寬流量含 Nf/Nd；砂湧比較 ic 與出口坡降，門檻需題設。','流網流量以 Nd/Nf 相乘，等勢線越多流量必越大。','FS 大於 1 就必滿足所有規範要求，不需容許門檻。']);
add(SO,[6],['先把濕單位重除以 1+w，再以 γd,max 求壓實度。','把濕單位重直接除 γd,max，得到同一壓實度。','壓實度 RC 與砂土相對密度 Dr 是同一個定義。']);
add(SO,[9],['先比較現況有效應力與先期壓密壓力，再分再壓密／正常壓密段。','只要加載，所有土都一律用同一條 Cc 直線。','OCR 用總應力除先期壓密壓力，不需有效應力。']);
add(SO,[10],['相同 cv 與壓密度，時間與排水路徑平方成正比；雙面 Hd=H/2。','雙面排水 Hd=H，改單面時間不變。','單面排水距離加倍，所以相同壓密度時間只加倍。'],visual('drain','選出雙面排水黏土層的最長排水路徑。',['上下皆排水，中心至排水面為 H/2。','上下皆排水，最長路徑標為 H。','只有上方排水，卻標為雙面排水。'],'本圖只練本課的均質層雙面排水子模型；已給層界，補兩側排水方向及 Hd，再比較改為單面時的時間。',{}));
add(SO,[11],['Mohr 圓的橫軸端點為同一應力基準的 σ3、σ1，不能混用總／有效。','把有效 σ3 與總 σ1 放進同一個圓，仍能得到有效強度。','Mohr 圓中心就是偏差應力 σ1−σ3，不需除 2。']);
add(SO,[12],['CU 若量孔壓，可分總／有效應力；有效主應力均扣同一孔壓。','CU 不排水，所以孔壓必為零，不需量測。','有效最大主應力扣孔壓，但有效最小主應力不用扣。']);
add(SO,[14],['雙面改單面使 Hd 加倍；同 cv、同壓密度時時間比為 4。','雙面改單面只少一個排水面，因此時間比一律為 2。','CU 的兩個有效主應力要扣不同孔壓，才會保持軸差。']);
add(SO,[15],['支承強度與服務沉陷分開檢核，總／淨壓力要使用同一基準。','承載力有足夠安全係數，即可忽略服務沉陷限制。','淨支承力與總支承力可以任意比較，不需扣覆土。']);
add(SO,[19],['主動、被動需不同方向的牆體位移，靜止狀態不能任意套主動。','擋土牆只要有土，沒有位移也必達主動土壓。','牆向土推入與離土移出都會形成相同被動狀態。']);

// Repeated models remain available as scaffolds; recognition is skipped on these review days.
for(const day of [4,9,10,28])REVIEW_CONTENT[SA][day].skipRecognition=true;

const item=(type,x1,y1,x2=x1,y2=y1,text='')=>({...shape(type,x1,y1),x2,y2,text});
const line=(x,y,x2,y2)=>item('line',x,y,x2,y2);
const text=(x,y,t)=>item('text',x,y,x,y,t);
const arrow=(x,y,x2,y2)=>item('arrow',x,y,x2,y2);
const rect=(x,y,x2,y2)=>item('rect',x,y,x2,y2);
const pen=points=>({...item('pen',...points[0]),points});

export function diagramDrawing(spec,variant=0,partial=false){
 const p=spec.parameters,s=[],push=(...x)=>s.push(...x),t=(x,y,v)=>push(text(x,y,v));
 if(['udl','point','cantilever'].includes(spec.family)){
  push(line(160,220,820,220));t(120,285,'A');t(840,285,'B');t(340,355,`L=${p.L} m`);
  if(spec.family==='cantilever')push(item(variant===1?'pin':'fixed',160,220),...(variant===1?[item('roller',820,225)]:[]));else push(item(variant===1&&spec.family==='udl'?'fixed':variant===2&&spec.family==='point'?'roller':'pin',160,225),...(variant===1&&spec.family==='udl'?[]:[item('roller',820,225)]));
  if(spec.family==='udl'&&variant!==2){push(item('udl',160,105,820,105));t(360,70,`q=${p.q} kN/m`);}else{
   const x=spec.family==='cantilever'?820:spec.family==='udl'?490:variant===1?(p.a===3?380:490):160+660*p.a/p.L;
   push(arrow(x,90,x,210));t(Math.min(x+25,760),100,`P=${p.P??p.q*p.L} kN`);if(spec.family==='point')t(260,310,`a=${variant===1?(p.a===3?2:p.L/2):p.a} m`);
   if(spec.family==='cantilever'&&variant===2)s[s.length-2]=arrow(x,210,x,90);
  }
  if(partial)t(180,410,'補：反力方向／數值，V、M 或位移');
 }else if(spec.family==='truss'){
  const cy=variant===2?320:90;push(line(160,270,820,270),line(160,270,490,cy),line(820,270,490,cy),item('pin',160,275),item('roller',820,275));push(arrow(490,variant===1?130:20,490,variant===1?260:cy-10));t(420,65,'C / P=10 kN');t(110,265,'A');t(840,265,'B');t(300,350,'AB=4 m；C(2,3) m');if(partial)t(180,410,'補：節點力與拉壓；不要添加桿端矩');
 }else if(spec.family==='axial'){
  push(line(160,220,700,220),item('fixed',160,220));if(variant===2)push(item('fixed',700,220));push(variant===1?arrow(880,220,720,220):arrow(720,220,880,220));t(320,140,`EA=${p.EA} kN`);t(360,290,`L=${p.L} m`);t(740,185,`P=${p.P} kN`);if(partial)t(180,410,'補：u、反力方向、ku=P');
 }else if(['rc','tsection'].includes(spec.family)){
  if(spec.family==='rc')push(rect(310,60,680,330));else push(pen([[220,60],[780,60],[780,130],[610,130],[610,330],[390,330],[390,130],[220,130],[220,60]]));
  const y=variant===1?100:295;push(item('circle',390,y-12,414,y+12),item('circle',490,y-12,514,y+12),item('circle',590,y-12,614,y+12));t(140,80,`b=${p.b??p.be} mm`);t(730,270,`d=${p.d}`);
  if(!partial){const bottom=spec.family==='tsection'&&variant===2||spec.family==='rc'&&variant===1;push(rect(spec.family==='tsection'&&variant===1?390:310,bottom?270:65,spec.family==='tsection'&&variant===1?610:680,spec.family==='rc'&&variant===2?290:bottom?325:115));t(730,bottom?325:120,variant===2&&spec.family==='rc'?'a=d':'壓力區 a');t(380,380,bottom?'下壓／上拉':'上壓／下拉');}else t(150,410,'補：壓力塊 a、C/T 與力臂');
  if(spec.family==='tsection')t(300,30,`be=${p.be}；bw=${p.bw}；hf=${p.hf} mm`);
 }else if(spec.family==='stirrup'){
  push(rect(120,100,560,260),line(150,245,530,245),rect(650,95,850,290));if(!partial&&variant!==1)push(rect(690,135,810,255));else push(line(690,135,690,255));
  push(rect(220,105,230,255));if(!partial)push(rect(400,105,410,255));if(!partial){push(variant===2?arrow(890,135,890,255):arrow(230,300,400,300));t(variant===2?905:270,variant===2?205:330,'s');}else t(240,330,'補沿梁間距 s');t(680,365,'截面：兩肢 Av');if(partial)t(120,410,'補：第二箍、s 與剪力方向');
 }else if(spec.family==='hsection'){
  push(pen([[310,70],[690,70],[690,110],[530,110],[530,290],[690,290],[690,330],[310,330],[310,290],[470,290],[470,110],[310,110],[310,70]]));t(120,225,`H=${p.H}`);t(350,35,`bf=${p.bf} mm`);
  if(!partial){const web=rect(470,variant===1?70:110,530,variant===1?330:290);web.color=variant===1?'#b64b32':'#285ca8';push(web,variant===2?line(500,40,500,365):line(220,200,780,200));t(variant===2?520:780,variant===2?55:210,'x');t(550,240,variant===1?'腹板 H':'腹板 H−2tf');t(530,385,`tw=${p.tw}；tf=${p.tf} mm`);}else t(120,410,'補：tw、tf、淨腹板與重心強軸 x');
 }else if(spec.family==='column'){
  push(line(430,90,430,340),line(570,90,570,340),arrow(500,30,500,85),item('pin',500,345));t(180,80,`KL=${p.KL} mm`);t(620,140,`rx=${p.rx} mm`);t(620,190,`ry=${p.ry} mm`);if(!partial){push(line(710,290,920,290),line(810,210,810,380));t(925,295,'x');t(820,205,'y');t(705,430,'斷面側移方向');if(variant!==1)push(arrow(760,270,890,270));if(variant!==0)push(arrow(840,365,840,235));t(180,410,['λy>λx：繞 y','λx>λy：繞 x','λx=λy'][variant]);}else t(180,410,'補：挫屈形狀與控制軸，不預畫撓曲線');
 }else if(spec.family==='base'){
  push(rect(360,70,650,150),line(200,330,820,330),pen([[410,150],[410,180],[380,195],[440,215],[380,235],[440,255],[410,275],[410,330]]),line(600,150,600,220),rect(575,220,625,270),variant===1&&!partial?line(600,270,880,410):line(600,270,600,330));t(450,120,'m=1000 kg');
  if(!partial){t(250,240,'k');t(650,240,'c');t(230,395,variant===2?'x=u+ug':'x=u−ug');push(arrow(660,100,790,100),arrow(200,360,340,360));t(800,105,'u');t(350,365,'ug');if(variant===1){push(line(790,410,960,410));t(730,445,'阻尼固定地面');}}else t(160,410,'補：k、c、u、ug、x 正方向與方程');
 }else if(['free','decay','step'].includes(spec.family)){
  push(line(150,220,900,220),line(160,65,160,390));t(915,230,'t');t(90,60,'u');
  if(spec.family==='free'){t(180,50,'u0=0.040 m；v0=0');if(partial)push(item('circle',151,111,169,129));else push(pen(Array.from({length:61},(_,i)=>[160+i*11,220-100*(variant===1?Math.sin(i*Math.PI/30):Math.cos(i*Math.PI/30)*(variant===2?-1:1))])));}
  if(spec.family==='decay'){push(item('circle',291,111,309,129),item('circle',641,variant===1?81:variant===2?311:141,659,variant===1?99:variant===2?329:159));t(220,90,'20 mm');t(660,120,variant===1?'28 mm':variant===2?'−14 mm':'14 mm');if(!partial)push(pen([[200,220],[250,170],[300,120],[350,170],[400,220],[475,290],[550,220],[600,variant===1?150:variant===2?255:185],[650,variant===1?80:variant===2?320:150],[700,variant===1?150:variant===2?255:185],[750,220],[825,270],[900,220]]));if(partial)t(200,410,'補：同向峰值週期與衰減包絡');}
  if(spec.family==='step'){push(line(160,170,890,170));t(730,150,'P0/k');if(!partial)push(pen(Array.from({length:61},(_,i)=>[160+i*11,variant===0?220-50*(1-Math.cos(i*Math.PI/15)):variant===1?220-50*(1-Math.exp(-i/10)):220-i*2])));else t(160,410,'補：無阻尼曲線、初始條件、最大位移');}
 }else if(spec.family==='phase'){
  push(rect(290,60,600,380),line(290,155,600,155),line(290,260,600,260));t(320,115,'空氣 Va');t(320,220,'水 Vw');t(320,325,partial?'固體 Vs=1':'固體 Vs');
  if(!partial){const top=variant===2?155:60,bottom=variant===1?155:variant===2?380:260;push(line(650,top,650,bottom),line(630,top,675,top),line(630,bottom,675,bottom));t(700,(top+bottom)/2,'Vv');}else t(150,435,'補：Vv、Vw、Va；質量與體積分開');
 }else if(spec.family==='stress'){
  push(rect(160,70,450,390),line(160,225,450,225));t(180,140,'乾砂 γ=18');t(180,305,'飽和 γsat=20');t(100,220,'2 m / 水位');t(110,410,'4 m / 點');push(line(640,70,640,390),line(620,390,900,390));t(680,55,'u →');if(!partial){const start=variant===1?70:225;push(variant===2?line(640,70,640,390):line(640,start,840,390));}else t(540,440,'補：u 深度圖、σ 與 σ′');
 }else if(spec.family==='drain'){
  push(rect(180,90,800,350));t(110,250,'H');t(330,65,'可排水上界');t(320,390,variant===2?'不透水下界':'可排水下界');if(!partial){push(arrow(380,220,380,100),...(variant===2?[]:[arrow(620,220,620,340)]));t(470,210,variant===1?'Hd=H':'Hd=H/2');}else t(240,450,'補：兩側排水箭頭、Hd 與時間比');
 }
 const out=emptyWorkspace('free');out.sheets.workspace=s;return out;
}

export function lessonScaffold(topic,day,content){
 if(!content?.visual)return null;
 const data=diagramDrawing(content.visual,0,true),out=emptyWorkspace(lessonLayout(topic,day));
 // Keep teaching geometry in the first zone. Lower sheets remain available for completion.
 out.sheets.workspace=data.sheets.workspace.map(s=>({...s,y1:s.y1*.65+25,y2:s.y2*.65+25,points:s.points.map(([x,y])=>[x,y*.65+25])}));
 return {id:`${topic}:${day}:diagram-v1`,drawing:out,task:content.visual.task};
}
