# 學習工作室 / Learning Lab

每天30分鐘，循序複習結構學。公開部分只含通用教材與網頁程式。

## 試用版功能

- 30天課表、短題、觀念速查與核對答案。
- 計時、暫停、離開分頁自動暫停；重新整理後保持暫停。
- 每課草稿、保留歷次作答、數值核對、錯因與白話解釋。
- 僅目前瀏覽器儲存；JSON匯出、還原與重複紀錄合併。
- 沒有登入、Firebase、跨裝置自動同步或AI自動批改。

數值核對只是一部分，受力模型與推導仍須教練審閱。此為教學模型，不是實案工程認證。

## 本機檢查

需要Node.js 22或更新版本，無第三方執行期相依。

```sh
npm test
npm run build
```

`site/`是完整靜態網站。教材生成器接收私有教材資料夾參數，只輸出通用課表與題目，不能把學習紀錄或私有文件加入發布目錄。

## 發布

GitHub Pages由`gh-pages`分支根目錄發布；`main`保存程式與測試。只有`site/`可推送至發布分支。

```sh
git subtree push --prefix site origin gh-pages
```

## 紀錄與備份

資料位於本網站origin的localStorage；不同瀏覽器、裝置及網域不會自動共用。請定期匯出JSON。瀏覽器限制、無痕模式或清除瀏覽資料可能令紀錄消失。匯出的個人紀錄不要提交到公開repo或issue。

原始作答與提示次數保留；本版狀態為已提交／待審閱，不宣告完整能力驗收通過。教練可在使用者提供私有JSON後進行回饋。

## 來源

- [MIT Solid Mechanics](https://ocw.mit.edu/courses/1-050-solid-mechanics-fall-2004/)
- [NPTEL 力法](https://archive.nptel.ac.in/content/storage2/courses/105101085/Slides/Module-5/Lecture-2/5.2_2.html)

題目與30天安排為自編複習材料，外部來源提供理論參考。
