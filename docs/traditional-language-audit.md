# 繁體文字檢查與台灣用字編輯規則

## 本次修正

- `dy-d05-l2-resonance`：`實际` → `實際`。
- `sa-d05-l2-geometry`：`污染` → `汙染`。
- `so-d02-l2-match`：`水占有` → `水佔有`。

三處均為文字訂正，保留既有題目 ID、答案、計算及作答紀錄。字元檢查補上原小字表未涵蓋的「际」，不進行全站自動簡轉繁。

## 字表來源與授權

固定採用官方 [OpenCC ver.1.1.9](https://github.com/BYVoid/OpenCC/tree/ver.1.1.9) 的三份字表。原始檔、Apache-2.0 授權與 AUTHORS 保留於 `tests/fixtures/opencc/`；`manifest.json` 記錄每份原檔的官方下載網址與完整 SHA-256。該目錄內 `.gitattributes` 保持上游原始位元組，避免 Windows 換行轉換使雜湊失效。

| 官方字表 | SHA-256 |
|---|---|
| [STCharacters.txt](https://raw.githubusercontent.com/BYVoid/OpenCC/ver.1.1.9/data/dictionary/STCharacters.txt) | `ed1d268e0ad028511dcf5b0089faed0a980ad332449ec11d481ceefde6879f41` |
| [TSCharacters.txt](https://raw.githubusercontent.com/BYVoid/OpenCC/ver.1.1.9/data/dictionary/TSCharacters.txt) | `6b5a0a799bea2bb22c001f635eaa3fc2904310f0c08addbff275477a80ecf09a` |
| [TWVariants.txt](https://raw.githubusercontent.com/BYVoid/OpenCC/ver.1.1.9/data/dictionary/TWVariants.txt) | `30e6f8395edbfdd74e293fd8b9c62105d787c849fbb208d2a7832eac696734d7` |

`traditional-scan.json` 是本專案衍生的測試資料，並非 OpenCC 原檔；由下列命令重建。一般測試完全離線，不在 CI 中下載浮動版本。

```text
node scripts/generate-traditional-fixture.mjs
node scripts/check-traditional.mjs
node --test tests/traditional-content.test.js
```

每次測試會校驗上游來源雜湊，並比對重建結果。升級上游版本須一併審查來源、雜湊、字表差異、共用字規則及回歸案例。

## 如何避免共用字誤報

STCharacters 的來源字不等於「簡體專用字」。例如「干」可對應幹、乾、干；「后」可表示皇后，「里」可表示里程，「系」可表示系統；全域取代會改錯合法繁體語句。

由 3,980 筆 STCharacters 逐筆分類，符合下列任一項者保留，不作單字禁止：

1. 來源字本身仍列為簡轉繁候選：例如台、托、准、干、后、里、系、占。
2. 來源字同時是 TSCharacters 的繁體來源鍵，屬可能的繁體異體。
3. 來源字是 TWVariants 的台灣輸出字：例如「峰」「群」。只看 STCharacters 會把它們誤認為必須改成峯、羣。
4. 明列保留台、托、准；目前這三字也符合第 1 項，重複條件用於記錄專案編輯政策。

結果：3,796 個字元進入提醒清單，184 個共用字條目保留候選與原因。規則由上游資料推導，沒有依題目 ID、檔名或整段文字豁免；也沒有為了讓測試通過而忽略某科或某課。

「污染→汙染」「水占有→水佔有」「占有的比例→佔有的比例」另外用明確詞組規則檢查。這是教材的台灣用字選擇，不把合法的「占卜」或所有「污」字都當簡體錯誤。

## 掃描範圍

- 遞迴讀取 `site/` 內所有 JavaScript、JSON、HTML、SVG、CSS，包括尚未開放的題目檔案。
- JavaScript 使用僅開發相依套件 Acorn 8.15.0 的 AST，擷取一般字串與模板字串的文字；Unicode 跳脫字元解碼後仍受檢查。註解與正規表示式 literal 不當作顯示文字。
- HTML 包含正文、alt、title、aria-label、placeholder 等所有屬性，並處理數字字元實體、內嵌 script 與 style。CSS 包含產生的 content 文字及十六進位字元。
- 額外掃描執行後的 `QUESTION_BANK`、`GUIDES`、`REVIEW_CONTENT`，避免只檢查原始模板而漏掉組裝輸出。
- 五科數值模板逐一輸出全部有限參數組：36／24／36／16／27，合計 139 組，掃描模型結果及完整題幹、選項、解析與來源。
- 原始字典與測試錯字案例不在 `site/`，不把用來偵測錯字的機器字表再當成教材報錯。

## 本次驗證與限制

專用測試 6／6 通過，涵蓋來源雜湊、可重建字表、三處真實錯字、共用字、峰／群、AST、HTML/CSS/JSON 及完整公開文字輸出。首次試掃尚未採 TWVariants 時，峰／群產生 160 筆誤報；補入官方台灣變體目標後歸零，保留此過程於本機稽核輸出。

第一次公開檔案檢查也辨識出掃描器內使用了實字 U+FFFD 作解碼失敗標記；已改為程式跳脫表示，不調整公開檔案檢查規則。

這不是完美、可直接取代人工的「全簡體專用字表」。共用字的詞義、少見異體、人名地名、專業術語與句意仍須人工審閱；例如「干」出現在錯誤語境時，不一定會被單字檢查發現。圖片內嵌文字、外部連結頁面、執行時載入的使用者原稿不做 OCR 或改寫。掃描通過只表示本版字表和明示詞組規則未命中，不等於全面台灣用語審校完成。
