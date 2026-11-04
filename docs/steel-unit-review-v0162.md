# 鋼結構原卷單位檢視與換算界線

日期：2026-11-04。依 110～114 年結構工程技師鋼結構設計原卷，鋼構當前課程頁面採 tf、tf/cm²、tf·m，長度與斷面性質保留 mm、mm²、mm³、mm⁴。既有作答與歷史快照仍保留當時題設及單位。方法與邊界沿用 [RC 改制](rc-unit-review-v0161.md)。

## 依據與題給常見值

五年原卷的鋼構題一律以 tf 表示力、tf/cm² 表示應力與彈性模數，常見題給值為 Fy＝2.5（SM400）、2.35、3.3、3.5 tf/cm²，Fu＝4.1、4.0、4.9 tf/cm²，E＝2040（偶見 2050、2100）tf/cm²。本次工作室題設採 Fy＝2.5、Fu＝4.1、E＝2040 tf/cm²；其餘題給力與勁度改為對應的整數或一位小數（例如 Pu＝30 tf、Pc＝100 tf、GJ＝80000 tf·cm²）。原卷的斷面性質多以 cm 制給定，本次仍維持 mm 制以配合既有課表與圖解，換算規則見下。

## 精確換算

標準重力 9.80665 m/s²，依 NIST SP 811 Appendix B.9。

| 來源量 | 顯示換算 | 範例 |
|---|---|---|
| 力 | 1 tf＝9.80665 kN | 300 kN＝30.5915 tf |
| 應力、彈性模數 | 1 tf/cm²＝98.0665 MPa | 250 MPa＝2.54929 tf/cm²；200000 MPa＝2039.43 tf/cm² |
| 彎矩 | 1 tf·m＝9.80665 kN·m | 200 kN-m＝20.3943 tf·m |
| 扭轉勁度 GJ | 1 tf·cm²＝980665 N·mm² | 8×10¹⁰ N·mm²＝81577.3 tf·cm² |
| 翹曲勁度 ECw | 1 tf·cm⁴＝9.80665×10⁷ N·mm⁴ | 2×10¹⁶ N·mm⁴＝2.03943×10⁸ tf·cm⁴ |

原課表顯示副本的題給數字取六位有效數字；核對欄位與計算保留完整精度，學員作答仍以相對誤差 1% 核對。不可將 250 直接改寫成 2.5：原課表 Fy＝250 MPa 的物理值是 2.54929 tf/cm²，改寫會改變題目與核對值。工作室新題設則是直接以原卷常見值定義，與原課表無對應關係。

## 實作邊界

- `site/gravity-units.js` 抽出 RC 既有的顯示換算工廠；`site/rc-units.js` 行為不變（原 21 項 RC 單位測試全過），`site/steel-units.js` 以鋼構表產生 `steelUnit`／`steelDisplay`／`steelCanonical`／`steelText`／`steelLegacyDay`／`steelLegacyCourse`。
- 原數值解題函式繼續以 SI 核算。工作室鋼構模型以包裝層定義題給預設值（重力單位）與顯示公式，求解入口先還原 SI、出口再轉顯示。與動力科共用的 `capacity`、`interaction` 另立 `steel-capacity`、`steel-interaction`，動力與 RC 不受影響；`steel-bending` 的變數順序改為 S、Z、Fy，使逐日縮放與改參數變式作用於斷面模數而非材料值。
- 舊課表來源檔 `site/steel-curriculum.json` 保留 SI 且雜湊鎖定不變，經 `steelLegacyCourse` 產生顯示副本；題組工作室的原課文面板經 `steelLegacyDay` 顯示。此處不改來源、重複套用亦不再換算一次。
- 原版入口新草稿帶 `steelUnitSystem:'tf-cm2-v1'`；舊草稿與紀錄無此標記，顯示原 SI 題面與原值，不重新評分。工作室新題組 `contentRevision:3`、`unitSystem:'taiwan-gravity'`，與 RC 共用既有驗證；正式 Worker `/config` 已回報 `studioContentRevisions:[1,2,3]`，本次不改後端。
- 鋼構 D02 動態變式只含 mm 制幾何（rx），不需換算；辨識題庫直接以原卷單位撰寫，唯一含 SI 的量綱題改為新 ID `st-d01-diag-unit-tf`，舊 ID 不再啟用。

## 必須同步處理的範圍

| 層級 | 盤點結果及修改界線 |
|---|---|
| 舊鋼構課表 | D03～D07、D11、D14、D22、D23 題面與欄位含 kN、kN-m、MPa；30 課欄位、參考與摘要均經同一顯示轉換，並附「傳統制代入約定」。 |
| 辨識題 | 62 題中僅 D01 量綱題含 N、MPa；改寫為 tf、cm、tf/cm² 並換新 ID。 |
| 動態 D02 變式 | 36 組參數皆為 mm 制幾何，無力與應力單位；測試鎖定此狀態。 |
| 題組工作室 | 30 課、150 組、90 個暖身位置；17 個模型全部改為重力單位題設，暖身干擾單位依鋼構單位表出題。 |
| 共用模型 | `capacity`、`interaction` 保留 SI 供動力科，鋼構另立副本；其他四科題組檔重建後逐位元一致。 |

## 易錯公式（mm 幾何配 tf、tf/cm²）

1. 應力乘面積：`φPn=min(0.90Fy Ag,0.75Fu U An)/100`、`Vn=0.6Fy Aw Cv/100`、`R=0.707 w Le F/100`；mm²÷100→cm²，結果直接為 tf。
2. 應力乘斷面模數：`Mp=Fy Z/10⁵`、`My=Fy S/10⁵`；mm³÷100→cm·cm²，得 tf·cm，再÷100→tf·m。
3. Euler：`Pcr=π²E I/[100 (KL)²]`；E 用 tf/cm²、I 用 mm⁴、KL 用 mm。
4. 側扭挫屈題給式：`Mcr=(π/Lb)√(E Iy GJ)/1000`；E tf/cm²、Iy mm⁴、GJ tf·cm²、Lb mm，結果 tf·m。
5. 純扭轉挫屈：`Pcr,t=100[GJ+100π²ECw/Lt²]/r0²`；GJ tf·cm²、ECw tf·cm⁴、Lt、r0 用 mm。
6. 疲勞應力範圍：`Δσ=100 ΔF/A`；ΔF tf、A mm²，得 tf/cm²。
7. 無因次量（λc、KL/r、η、Fy/E）與以 tf 和 m 配套的式子（容量剪力、塑性機構、螺栓分攤、偏心栓群）不加係數。

## 測試與收斂準則

- `tests/steel-units.test.js`：精確常數與正反換算；文字換算六位有效數字、符號 tf（翼板厚）不被改寫、重複套用不變；原課表雜湊鎖定、顯示副本 30 課無 SI 力與應力單位、欄位物理值不變、D03／D11 題面數字；62 題辨識題與 36 組數值變式無 SI；模型預設值為原卷常見值、共用模型仍為 SI、各模型顯示公式數值核對；150 組與 90 暖身為修訂 3 且無 SI；**五科禁用單位**（RC、鋼構禁 MPa、GPa、N/mm²、kPa、kN；結構學、動力、土壤禁 kgf、tf、tf/cm²、tf·m、tf/m²）；舊 SI 草稿與紀錄還原不變、新稿標記可備份合併。
- `tests/studio-steel-units-review.test.js`：不呼叫產品端模型，依明確單位表還原 SI 後獨立重算 150 組與 30 個反算目標；逐步驟引用的重力單位公式代入可重現答案；材料題給為 2.5／4.1／2040 tf/cm²，應力欄位一律 tf/cm²。
- 既有 `tests/studio.test.js` 鋼構檢核與 `tests/studio-steel-dynamics-review.test.js` 純扭轉檢核改為依 `unitSystem` 選用係數。
- 2026-11-04 `npm test`：209 項全部通過；`npm run build` 公開掃描通過。

## 殘留與未驗證

- 原課表顯示副本的題給值為精確換算（例如 Fy＝2.54929 tf/cm²、Pu＝30.5915 tf），不是原卷式的整數題給；若要改為整數題給，須同步改寫私有題庫與核對欄位，另案處理。
- 原卷斷面性質多為 cm⁴、cm³；本次仍維持 mm 制，學員需依規則自行÷100。
- 瀏覽器實測與實體裝置、真實私人 Drive 往返由發布前檢討另行記錄；本文件不以測試檔建立即宣稱通過。
