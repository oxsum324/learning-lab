// Reserved content only. The active graded bank must not import this module in v0.15.0.
import {S,M,E,O,lesson} from '../build.js?v=0.15.0';

export const questions=lesson('steel-structures','st',11,'梁側扭挫屈明示插值模型','鋼結構題庫 ST_C07；D11 側扭挫屈；未啟用保留題',[
 S(1,'l1-ltb-range','梁側扭挫屈','本題明示 Lp<Lb<Lr 以線性插值求 Mn。這個區間內能否不計插值而直接採 Mp？',[['依題設仍須算插值','不能略過本題不支撐長度條件。'],['任意梁均可直接採 Mp','側向支撐與局部穩定仍有限制。'],['只要材料有 Fy 就可採 Mp','材料強度不代表塑性容量可完全發揮。']],0,'此處的插值是本題模型，不能直接當所有規範的通式。'),
 M(2,'l2-ltb-endpoints','插值端點','題設 Mn=Mp−(Mp−Mr)(Lb−Lp)/(Lr−Lp)，且 Lr>Lp。哪些端點檢查正確？',[['Lb=Lp 時得到 Mr','這個端點應是 Mp。'],['Lb=Lp 時得到 Mp','插值比為零。'],['Lb=Lr 時得到 Mr','插值比為一。'],['Lb=Lr 時得到 Mp+Mr','不符合題設式的減量。']],[1,2],'端點檢查可找出插值方向或分母寫反的錯誤。'),
 O('l3-ltb-order','插值流程','按本題已知 Lb、Lp、Lr、Mp、Mr 及 φb，排列梁強度插值核對。',[['確認 Lp<Lb<Lr 且長度單位一致','先確認指定分支。'],['求 (Lb−Lp)/(Lr−Lp)','插值比應在零與一之間。'],['由題設式求 Mn 並檢查端點趨勢','與 Mp、Mr 的關係應合理。'],['乘 φb 得設計抵抗並列模型限制','分開名義與設計量。']],'不支撐長度是題設分支條件，不可直接略過。'),
 E('l3-ltb-error','插值找錯','題設 Lr>Lp、Mp>Mr，採 Mn=Mp−(Mp−Mr)(Lb−Lp)/(Lr−Lp)。第一個錯誤在哪裡？',[['先確認 Lp<Lb<Lr','符合插值範圍。'],['算得插值比介於零與一','數學範圍正確。'],['把減號改成加號，得到大於 Mp 的 Mn','違反題設公式與端點趨勢。'],['再乘 φb 作設計抵抗','乘因數不能修正前行錯式。']],2,'此題長度增加使名義強度由 Mp 朝 Mr 下降。')
],'specified-model');
