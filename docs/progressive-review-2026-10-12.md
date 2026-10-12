# 漸進複習本機審查版 v0.14.0

已完成五科共用三階段流程，可在隔離 checkout 審查。沒有 push、PR、merge、公開部署或雲端寫入。

## 基線與隔離

- 原 repo：桌面 AI／學習／學習平台，origin 為 oxsum324/learning-lab。
- 核實時 main HEAD：`03e7eb2f10055db09071b7b24d26a75c6e1e432c`，package v0.13.1，原 checkout `git status --short` 無差異；沒有既有工作樹分支修改需要移植。
- 本輪使用本次任務目錄下獨立的 `learning-lab` clone，分支 `progressive-review`；未修改原 repo，也沒有接觸小工具的八個未推 commits。
- 讀取桌面 AI 的 AGENTS.md、repo README、package scripts 與既有測試。repo 與學習父目錄未發現額外 AGENTS.md 或 .agents/skills；memory_summary.md 只作歷史背景。瀏覽器驗證套用本機 playwright skill。
- 僅在已知桌面 AI 目錄及指定學習目錄有限查找；未操作 K、E、H。

## 實際行為

1. **候選辨識**：每課提供三個文字候選，正確候選來自該課圖解／檢核方向，另兩個為科目常見錯誤；順序依課次排列，不預先勾選。指定數值題另提供第一個關鍵量的三個候選。可展開本課題設，再選擇及核對；未選齊不能提交，答錯留在辨識，答對提交後建議補完。
2. **提示補完**：使用該課教材第一個推導步驟作為起式；圖解提示中的數值留空，要求補上數量、方向、單位與後續方程。使用原有數值、文字及圖解作答區完成。提交後建議嘗試獨立作答，但補完正確與否仍需審閱。
3. **獨立作答**：保留原有完整畫布、底圖、復原／重做、專注畫圖、數值核對與白話說明。使用者可任意切換階段，或選進階模式直接閉卷作答；模式偏好供新課沿用。

難度階段與原有計時階段各自運作。切換難度不清空當次草稿，也不降低提示程度。提交作答後建立下一份草稿，已提交原稿保持不變；不必強制通過辨識才能選進階模式。

候選辨識至少記協助 1，提示補完至少記 2，完整答案沿用 3。本次看過候選或提示再切到獨立／進階仍保留協助程度；新作答獨立列式可記為閉卷提交，但不能宣稱已掌握。沒有新增掌握分數；所有圖形、模型、推導與完整能力仍待教練審閱。

## 五科覆蓋與限制

| 科目 | 三階段／逐課候選與起式 | 指定數值核對課次 | 無固定數值核對課次 |
|---|---:|---:|---:|
| 結構學 | 30 | 8 | 22 |
| 鋼筋混凝土 | 30 | 8 | 22 |
| 鋼結構 | 30 | 9 | 21 |
| 耐震設計及結構動力 | 30 | 8 | 22 |
| 土壤力學及大地工程 | 30 | 7 | 23 |
| 合計 | 150 | 40 | 110 |

無固定數值核對課次包括觀念診斷、自選教材題、官方原卷及已有推導但沒有指定 fields 的課次。此輪不擅自建立新標準答案，也不把「作答方向辨識」當成完整題目答對。

目前使用文字候選與部分推導補完；沒有新增圖像候選或逐課可自動批改的半成品工程圖。補完的圖解方向以留空文字配合既有畫布完成。部分原教材只有作答架構，第一步也只能提供架構提示。常見誤解候選為科目共用，尚未逐題編寫高難度干擾選項。上述教材深化應在後續教師審閱後增補。

## 檔案差異

- `site/progressive-review.js`：逐課候選、推導／留空提示、三階段結果、協助紀錄與階段建議。
- `site/app.js`、`site/index.html`、`site/studio.css`：五科介面、切換、作答提交、恢復、歷史候選明細與階段標示。
- `site/core.js`：optional progressive metadata 驗證；維持 schemaVersion 1、原合併衝突與儲存競爭保護。
- `site/learning-flow.js`：辨識／輔助作答待重練、偏好與摘要；避免空白下一次獨立草稿令接續練習永遠停在同課。
- `tests/progressive-review.test.js`：150 課候選／起式、錯誤推進、提示不能降級、舊資料相容、草稿衝突與接續練習回歸。
- `tests/learning-flow.test.js`、`tests/release-tools.test.js`：偏好與新模組快取版本檢查。
- `scripts/progressive-browser.cjs`：可重跑的 Playwright CLI 瀏覽器驗證輸入；`scripts/serve-preview.mjs`：本機靜態預覽。
- package／lockfile／sync-version 與既有 runtime import 版本：更新本機審查版本至 0.14.0，避免舊快取混用。

個人學習資料不加入 repo；截圖、瀏覽器收據及測試備份均置於被忽略的 `output/playwright/`。原 storage keys 與舊版 drawings 不變。舊紀錄不改評分；新增紀錄在 progressive 與 assessment.review 保存階段、協助、候選及辨識明細，完整 JSON 保留，Markdown 摘要也顯示。

## 驗證結果

| 檢查 | 結果／範圍 |
|---|---|
| `npm test` | 72/72 通過，exit 0；包括原有 68 項及新增 4 項 |
| `npm run build` | 通過，exit 0；五科／150 課與公開內容、編碼、媒體審查 |
| `npm run build:backend` | 通過，exit 0；只打包到 output，不部署 |
| `node --check` 與 `git diff --check` | 通過；site／backend JS、scripts MJS 語法與差異空白檢查 |
| 五科三階段瀏覽器流程 | 五科 D02 代表題通過：不預選、漏答阻擋、答錯停留、答對推進、提示補完、切換保留、返回／重整恢復、獨立作答、進階模式、唯讀提示、完整答案協助 3、圖解／復原／重做／專注 |
| 視窗尺寸 | 五科各 1440×1000、768×1024、390×844、320×740、844×390，共 25 組無頁面水平溢出 |
| 舊資料 | 五科舊文字紀錄 UI 匯入、原稿逐值不變、重複匯入去重；既有 unit tests 覆蓋舊圖形與草稿 |
| 備份 | 五份實際下載 JSON 通過 validateState 與重複 merge；每科 6 筆紀錄，包含 5 筆三階段新紀錄及 1 筆舊紀錄 |
| 瀏覽器診斷 | 最終流程 pageerror／console error 為 0 |
| lint／TypeScript／額外 aggregate | repo 無此類 npm script 或 TS 配置，未宣稱有執行；使用既有 test／build／backend 組合及語法檢查 |
| 真實手機、私人雲端、公網站 | 未跑；本輪無雲端寫入與發布授權 |

150 課教材生成與資料模型由 unit tests 全覆蓋；實際瀏覽器完整作答流程為五科各 D02，沒有宣稱 150 課均完成真人或 UI 逐題驗收。測試不替代工程模型正確性審閱。

過程中保留的未通過紀錄：Edge 在 sandbox 內啟動／連線受限，改用經自動審查允許的本機程序；首個預覽 port 已占用，最後使用 4194。瀏覽器腳本先後遇唯讀提示欄位、手機選單、手機復原入口操作假設不符，以及歷史未顯示階段，均修正後通過；四份失敗收據保留在 output/playwright。新增 unit fixture 隨候選明細與草稿規則調整後重跑通過。`npm ci --offline` 因 esbuild 未快取失敗，改用原 checkout 已安裝的同版 esbuild 在隔離 clone 本機打包，不修改原依賴。

## 預覽與證據

- 本機預覽：`http://127.0.0.1:4194/?sandbox=1#today`。如伺服器停止，在 repo 執行 `node scripts/serve-preview.mjs`。
- 最終流程收據：`output/playwright/progressive-browser-receipt.txt`。
- 每科截圖：`output/playwright/<topic>-recognize-desktop.png`、`<topic>-guided-mobile.png`、`<topic>-independent-mobile.png`。
- 候選／補完元件截圖為避免遮擋，僅在拍攝時隱藏浮動計時與底部操作列；實際操作及尺寸測試保留它們。
- 備份驗證：`output/playwright/backup-audit.json`；最終命令與 HEAD 收據：`output/verification.json`。

## 發布前待決

1. 教師審閱 150 課的候選是否貼合學習目的、共用錯誤候選是否足夠有辨識力，及補完起式揭露程度；自選題和原卷不能冒充完整標準解答。
2. 決定下一輪是否補圖像候選、實際半成品工程圖與更多逐題干擾選項；目前已實作可使用的文字／推導漸進路徑。
3. 實機手機操作、既有雲端後端對新增 optional metadata 的實際保存／還原，需另行授權與驗證。
4. 若要發布，先確認使用者對本機版本的審閱結果，再取得 push／PR／merge／部署的明確授權。此輪 published=false。
