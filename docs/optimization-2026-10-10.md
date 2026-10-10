# 學習工作室 v0.12.0｜平台優化與驗證

日期：2026-10-10

## 已完成的方案

| 面向 | 具體調整 | 使用方式 |
|---|---|---|
| 學習入口 | 首頁集中顯示目前科目、已提交課次、累計時間、草稿及待重練課次 | 按「開始練習」接續最近有內容的草稿；沒有草稿時進入下一課 |
| 課程內容 | 五科150課標示本頁數值題、起點診斷、自備題源、官方原卷或圖解推導 | 先確認題源與驗收方式，避免把提示當成完整詳解 |
| 學習方法 | 每科增加閉卷回想問題，依每日目標安排閱讀、作答、核對與記錄 | 展開「本課任務與練習節奏」，再用自己的話解釋控制機制 |
| 30天路線 | 四階段課程卡、搜尋、未提交／草稿／待重練篩選 | 從弱項入口找到課次，再閉卷重練 |
| 圖解作答 | 保留同頁連續圖紙、桌機左右對照、小螢幕上下相鄰及全畫面專注 | 常用工具保持可見，其餘按需展開；數值與推導、參考與核對有快捷入口 |
| 教材文案 | RC D01 改成同一張畫布依梁、柱、預力題型分區；同步修正教材生成來源 | 以圖名、正負號、單位及各階段受力辨識不同區域 |
| 作答歷史 | 可依課次／待重練篩選，原稿與長圖按需開啟，刪除有確認視窗 | 保留歷次原稿；較新的作答可更新該課待重練狀態 |
| 回饋輸出 | 新增 Markdown 教練回顧摘要 | 摘要包含用時、提示、錯因、原填數值及推導；完整圖形及草稿另附 JSON |
| 個人偏好 | 30／45／60分鐘、大字閱讀、減少動態、記住各科課次 | 設定儲存在目前瀏覽器，各科共用時間與閱讀偏好 |
| 儲存狀態 | 區分本機儲存與私人雲端；加入重新檢查雲端設定 | 尚未啟用時引導匯出 JSON；不顯示已備份 |
| 視覺設計 | 深藍與灰綠色系、卡片層級、獨立側欄、生成式結構學習插畫 | 首頁呈現情境；手機隱藏大型插畫，保留練習入口 |

「待重練」依各課**最近一次**作答的提示等級、已看答案、數值未全符合、錯因或訂正內容整理。「已提交」只代表留下作答，不代表模型、推導或完整能力已驗收。無自動核對數值的課次不會被當成數值錯誤。

一般課的時間分配可隨30／45／60分鐘調整。週測及歷屆題保留原本30分鐘的基準限時，加長部分用於訂正；題目另有規定時以題文為準。既有規範版本、考試年度及工程數值核對條件沿用原教材。

## 圖片製作

- 模式：內建 `imagegen`，文字生成圖片。工具未提供指定「Image 2.5」型號的選項。
- 網站素材：[study-atelier-v1.jpg](../site/assets/study-atelier-v1.jpg)，1536 × 1024，226,922 bytes。
- 從生成 PNG 另存壓縮 JPEG，保留構圖；已檢視圖面。它是情境插畫，不作為受力模型、配筋詳圖或施工圖。
- 以檔案雜湊、JPEG 檔頭及檔尾、350 KB 大小上限列入公開素材檢查；替換圖片或增加未核可圖片會令檢查失敗。

生成提示：

> Use case: stylized-concept. Asset type: decorative hero illustration for a professional Traditional Chinese structural-engineering study workspace. Create a refined editorial isometric architectural still-life on a uniform warm ivory #f5f3ed background: a small dark navy steel portal frame and elegant triangulated truss bridge, one warm concrete section with subtle exposed reinforcement, layered earth strata beneath, and a few very subtle teal wave arcs suggesting dynamics. One coherent miniature composition, not a collage of disconnected icons. Warm morning light, soft sculptural shadows, tactile matte clay and paper-cut materials, fine precise geometry, architectural model photography mixed with clean 3D editorial illustration. Palette restrained navy #192e43, deep teal #287a73, warm sandstone and a small amber accent #ca965b. Landscape 3:2 image, object group centered with generous breathing room so it can crop slightly on all sides. No people, no text, no labels, no numbers, no formulas, no arrows, no interface, no watermark, no decorative floating cubes. This is an atmospheric non-technical illustration, not an engineering solution or construction detail.

## 驗證紀錄

| 項目 | 結果 |
|---|---|
| 自動檢查 | 56／56通過；包括五科150課、舊圖紙與新圖紙還原、跨科隔離、數值核對、草稿、備份衝突及私人雲端後端規則 |
| 公開內容檢查 | 通過；五科150課及1張核可圖片，個人紀錄不進發布目錄 |
| 後端打包 | 通過；本輪未變更正式後端設定 |
| 瀏覽器版面 | 五科 × 六種視窗 × 六個頁面，共180個組合，無文件水平溢出或頁面切換錯誤 |
| 專注作答 | 五科 × 六種視窗，共30次開啟／Escape返回通過 |
| 主要操作 | 16項通過：偏好重載、畫圖與提交、進度、弱項篩選、搜尋空結果、原圖延後顯示、取消／確認刪除、JSON與Markdown匯出、還原、重複匯入去重、接續草稿，以及儲存衝突阻止切課 |
| 雲端介面 | 4項模擬通過：未設定、重新檢查、服務錯誤、設定完成但仍待使用者授權；未使用真實 Google 授權或寫入 Drive |
| 腳本錯誤 | 版面矩陣未發生頁面 JavaScript 錯誤 |

視窗：1440×1000、1024×768、768×1024、390×844、320×740、844×390。這是桌機 Chromium 的瀏覽器尺寸驗證；實體手機、平板與手寫筆仍需現機體驗。

本機驗證明細及截圖保存在被忽略的 `output/`。過程中曾有一項測試斷言誤用字串、一次還原檢查早於非同步完成，以及瀏覽器測試工具不提供檔案寫入介面的問題；已修正測試或改用外部保存結果，最終結果如上，未掩蓋為首次全數通過。

## 雲端及後續範圍

2026-10-10 實查正式服務仍回覆 `ready: false`，因此目前學習紀錄保存於瀏覽器，請使用完整 JSON 備份。Google 登入設定及私人 Drive 實際備份尚未啟用，定期 AI 回饋也尚未排程。

下一階段宜依實際錯題補上「已完整驗算的逐題詳解」，逐題標明假設、單位、規範版本、推導與獨立驗算；再完成私人雲端授權與跨裝置還原驗證，最後設定經使用者同意的定期學習回饋。新版的弱項篩選與摘要匯出可作為這些工作的入口。
