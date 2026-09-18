# 私人雲端歷史（v0.11.0）

## 使用方式

1. 打開「備份與還原」→「連接 Google」。由使用者自行完成 Google 授權，不提供密碼給維護者。
2. 後端在 Google Drive 根目錄建立「Learning Lab 私人學習歷史」，不放在任何既有共享資料夾內。
3. 第一次連接不傳送既有作答。按「備份目前紀錄」保存該科作答、圖解、當時草稿、時間及錯因。
4. 本頁授權有效期間，每次提交作答會自動新增一份版本。未提交的草稿仍需手動備份。
5. 換裝置後連接同一帳戶，再「查看這一科的雲端歷史」。「合併作答」只加入歷史作答，保留目前草稿。欲還原當時草稿，先下載完整版本，再以原有 JSON 匯入功能合併。
6. 重新整理、切換科目或授權到期後重新連線。不在背景保存 refresh token，也不宣稱無人值守同步。

本機刪除不追溯刪除雲端版本。Drive 空間用量隨版本累積；使用者可在私人資料夾自行管理。沒有定期 AI 回饋或新的計費服務訂閱。

## 部署架構

GitHub Pages 前端 → HTTPS / Bearer token → Cloudflare Worker → Google Drive 私人 JSON 版本。

- Cloudflare 不另建作答資料庫。帳戶限制使用 Worker `ALLOWED_EMAIL` secret；請勿寫入公開儲存庫。
- `GOOGLE_CLIENT_ID` 為公開 OAuth 用戶端識別碼，`ALLOWED_ORIGINS` 僅允許正式網站 origin；正式站不加入 localhost。
- OAuth Web client JavaScript origin 為 `https://oxsum324.github.io`，不能包含 `/learning-lab/` 路徑。
- 啟用 Google Drive API；OAuth 授權範圍為 `openid email https://www.googleapis.com/auth/drive.file`。不使用可讀整個 Drive 的 `drive` 權限。
- Google 專案測試模式需加入實際使用者為測試帳戶。此服務即使 Google 專案允許更多帳戶，後端仍僅允許 `ALLOWED_EMAIL`。
- `backend/wrangler.jsonc` 不含私人帳戶資料。部署時填入用戶端 ID、以 secret 設定帳戶，再更新 `site/cloud-history.js` 的公開服務網址。
- 打包指令：`npm run build:backend`；輸出 `output/history-worker.mjs`。將此檔作為 ES module Worker 的 main module，停用應用程式 observability，避免收集授權及內容。

## 保護與限制

- 每次請求由 Google 驗證 token 的 audience、期限、email、verified flag、scope；不記錄 token。
- `drive.file` 權限只涵蓋本應用建立／獲授權的檔案。appProperties 再以應用、帳戶、科目分類；檔案須由本人擁有、置於所屬資料夾。
- 每次讀寫檢查資料夾；讀取及寫入完成時另查檔案權限。只接受唯一 owner 權限；任何分享、權限資訊缺漏一律停止。此檢查不會撤銷使用者自行做出的分享，亦無法阻止在檢查後立即改權限的競態。
- 每份最多 4 MiB，串流讀取也施加上限。由既有模型驗證五科、30 天、作答與圖形，不接受其他主題或壞資料。
- 每份內容有 SHA-256。重試相同內容可去重，且讀回內容確認；下載時雜湊不符拒絕載入。雜湊是意外修改檢查，並非防擁有者竄改的簽章。
- 並行裝置可能同時建立資料夾或相同快照；會查詢同帳戶所有對應私人資料夾，版本都可讀取，不以覆寫消除並行歷史。
- 各科獨立保存；沒有跨裝置自動覆寫草稿。合併重複作答不增加份數，遇相同 ID 不同內容即停止。
- 網路失敗、未授權、Google 儲存空間或 API 限制都不刪除本機紀錄。失敗後須重連／重試，不能把畫面本機保存狀態當作雲端收據。
- 登出只中斷本頁；撤銷 Google 授權請使用 Google 帳戶「第三方連線」。

## 驗證

`npm test` 涵蓋權限拒絕、私人資料夾、科目／帳戶隔離、不可變版本、重試、變更偵測、大小限制、佇列取消、合併衝突，以及原有本機作答與圖解測試。

真實 Google 授權／Drive 讀寫須另以正式網站實測，不能用模擬測試宣稱完成。

## 官方文件

- [Google token model](https://developers.google.com/identity/oauth2/web/guides/use-token-model)
- [OAuth 用戶端設定](https://developers.google.com/identity/oauth2/web/guides/get-google-api-clientid)
- [Drive 範圍](https://developers.google.com/workspace/drive/api/guides/api-specific-auth)
- [Drive multipart 上傳](https://developers.google.com/workspace/drive/api/guides/manage-uploads)
- [Cloudflare Worker metadata](https://developers.cloudflare.com/workers/configuration/multipart-upload-metadata/)
