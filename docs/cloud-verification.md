# 私人雲端往返驗證 v2

入口為 verification/?run=批次編號&device=iphone-safari&v=20261020-2。批次為 6～36 個英數或連字號。手機沿用 20261014-phone02 的原始兩版；電腦測試須選 desktop，不能代替手機實機結果。

## 使用者流程與完成判定

1. 連接既有 Google 帳戶；此時只標記登入，並保存「尚未測試」的收據。
2. 執行「開始雲端還原並回存」，核對五科兩版與第三版、原稿、草稿、圖形、衝突及隔離。
3. 逐科下載第二版，在 sandbox=1 功能測試空間匯入並檢視，再匯出交回驗證頁核對。五科都必須通過。
4. 自動保存收據並讀回核對。五科全數通過且目前收據已雲存，才顯示本裝置操作完成，仍待電腦回讀驗收。

分頁中斷後，驗證進度留在此瀏覽器的私人測試暫存；登入憑證不保存。重連會讀回先前核對的來源資料並接續，running 動作標記 interrupted。後一次匯入核對失敗會撤銷該科的完成狀態，失敗及重試事件保留。

## 收據儲存與介面

- 固定 space=verification；收據沿用私人「Learning Lab 私人雲端驗證」資料夾，但 kind=receipt 且沒有 topic，與學習快照分流。正式學習空間拒絕收據介面。
- GET /config 回報 receiptVersions:[2]，新版頁面在能力不足時停止。
- POST /verification-receipts?space=verification&run=批次：驗證 v2 收據格式與 256 KiB 上限。每個檢查點新增快照，相同內容重試以 SHA-256 去重。保存後驗證私人權限、內容雜湊及讀回格式。
- GET 相同路徑列出該批次收據，可用 cursor 分頁。回傳檔案 ID、時間、工作階段、裝置與兩項科目數量。
- GET /verification-receipts/檔案ID?space=verification&run=批次：驗證所屬帳戶、資料夾、批次、kind、私人權限與雜湊後讀回。
- 收據不可覆寫或刪除；共享、搬離資料夾、改動內容或跨批次讀取都會拒絕。
- 不新增 Google OAuth 權限、不建立第三方資料庫。收據只含裝置／瀏覽器識別、時間、檔案 ID、雜湊及結果；未知欄位、作答正文與憑證字樣會拒絕。

本機進度只供接續，不能當成已雲存。上傳失敗時明確顯示尚未保存，提供重試及本機另存。雲存失敗不會自動標記全數完成。

## 教練回讀

先在私人驗證資料夾尋找名稱以 cloud-verification-批次 開頭的收據，選 device=iphone-safari 的工作階段。不要將較新的 desktop 收據當成手機結果。

用 receipt-model.js 的 validateReceipt 與 receiptProgress 檢查結構及階段，逐一核對五科 B-restore-return 與 platform-export-match，再從電腦執行「電腦回讀第三版」，核對第三版 ID／內容及三代歷史、正式資料不變。收據是裝置端回報，仍需這一步獨立回讀，不能只相信布林通過值。

## 實機邊界

本機假 Google／假 Drive 整合測試只驗證流程及中斷處理，正式站雲存讀回只驗證真實後端；兩者都不能代替 iPhone／Safari 實機選檔、圖形呈現及觸控證據。舊 v1 收據保留原樣，新服務只接受嚴格的 v2 格式。
