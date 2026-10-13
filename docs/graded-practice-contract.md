# v0.15.0 整合規格與分工契約

狀態：本機實作；不推送、不發布、不部署、不寫入私人雲端。基準 847b911。

## 採納決策

- 新起點 A／B／C 依科保存；舊使用者與略過設定者預設 C。C 保留閉卷流程。
- 保留 D01 原任務，另附每科 10 題診斷；短診斷與偏好雲端同步列後續。
- L1～L5 可自行跳層，協助按內容記最高值，提示後重建不算未提示作答。
- 週測先交卷再補強，既有時長不動。一般 A／B 支援開課立即練習。
- 優先未見題，避免連續同題；題池耗盡可結束或主動重練；同一卡點兩次錯誤或五分鐘即提供離開與補完選項。
- 五科 D02 試作與測試通過後，才開始 D01／D03～D07 擴充。首批每科 62 題，共 310 題：D01 10，D02～D06 各 8，D07 12（L1 3／L2 5／L3 4）。
- 題源分原理、已核對規範、明示題設模型、待核實；後者不得算正式合格題。30% 歷屆比例是原派工第二輪的要求，本版先清楚列來源，不臆造歷屆題號。
- 原始學習／錯題筆記不動；只可向盲算紀錄增加本次工程複核證據，不新增學員能力紀錄。

## 題庫契約

每科 `site/graded-content/<topic>.js` export `questions` 陣列；試作先只含 D02 八題。彙整 `site/graded-bank.js` export `QUESTION_BANK` 陣列以及 `getQuestions(topic,day,level)`（level 省略代表全課）。

每題共用欄位：

```js
{
 id: 'sa-d02-l1-model', version: 1, topic: 'structural-analysis', day: 2,
 level: 1, type: 'single', skill: '受力模型', model: '偏心集中力簡支梁',
 prompt: '具體題幹', assistance: 1,
 source: {kind:'principle',label:'教材原理',locator:'本課題庫 B 題'},
 explanation: '正解與條件說明',
 options:[{id:'a',text:'選項',reason:'此選項的理由'},...], answer:'a'
}
```

`source.kind`：principle／verified-code／specified-model／pending。答案形式：

- single、error：options 與 answer 字串；error 的 options 是推導各行。
- boolean：options（true／false 兩項）、reasonOptions、answer:{choice:'true',reason:'r1'}。
- multi：4～6 options，answer 為 2～4 個 id 陣列，不全部都正確。
- match、fill：fields:[{id,label,options:[{id,text,reason}]}]；answer:{fieldId:optionId}。
- order：options 是步驟，answer 為順序陣列；可加 precedences:[[先,後],...]，有此欄位時按必要先後關係而非唯一陣列核對。

每課八題建議 L1 single、boolean、single；L2 multi、match、multi；L3 order、error 或 fill。七類需在五科 D02 合計中覆蓋。診斷單選／複選混合，`diagnostic:true`，level=1或2。

`numeric:true` 題需先保存學員數值或不知道狀態才可顯示選項。參數模板由主整合者提供 `site/graded-numeric.js`，API `numericQuestion(topic, seed)` 回傳符合上述格式的額外 L3 single 題與 `numericMeta:{parameters,unit,correct,tolerance,fieldLabel}`；不計入最低八題，與原課計算欄位分開。

## 引擎 API（引擎角色負責）

`site/graded-practice.js`：

- `createPractice(startLevel='C', context={topic,day,sessionId,now})` 回傳保有 legacy keys 的 version:2 metadata。
- `selectQuestion(bank, practice, {level,now,allowRepeat=false})` 回傳題目快照，保存於 practice.current；題池耗盡回傳 null。`bank` 是本課陣列。
- `gradeQuestion(question, answer)` 回傳 `{complete,correct,feedback:[string]}`，接受必要先後關係。
- `recordResponse(practice,answer,{now,activeMs})` 保存 current 快照、原答、結果於 practice.attempts，不能覆寫已核對原答；訂正是下一個 attempt。
- `revealSupport(practice,level,kind,{now})` 協助只升不降，保存事件；`setPracticeLevel(practice,level)` 設 level1～5，對應 stage recognize/guided/independent。
- `practiceOutcome(practice)` 回傳 `{kind,assistance,text}`；不能宣告 mastery。
- `canRetry(practice,{activeMs})` 回傳 boolean；對同一卡點連錯兩次或五分鐘耗用的限制。
- `validPractice(p)` 驗證版本2及 typed answer／題目快照／長度上限，review-state.validReview 接受舊版或新版。

legacy keys：mode、stage、assistance、selections:{}、checked、starterSeen；新版另有 startLevel、level、sessionId、attempts:[]、events:[]、current:null、numericSubmission 等。確切額外欄位由引擎角色回報給介面角色。

資料上限：每次最多 60 個已核對子題／120 個協助事件；題面快照須有長度與列數上限。外層 schemaVersion 仍為1，舊作答不回寫。

## 檔案責任

- 題庫角色：graded-content/*、graded-bank.js、題庫來源／覆蓋文件，先五科 D02；收到主整合者試作通過通知才擴充。
- 引擎角色：graded-practice.js、review-state.js、backend/worker.js、cloud-history.js、引擎／後端測試。
- 介面角色：app.js、index.html、style.css、graded-ui.js、learning-flow.js；依需要擴充同頁操作，不改題庫與引擎。
- 主整合者：參數題、題庫品質測試、瀏覽器腳本、版本、整合報告與最終檢查。

共用分支 graded-practice；其他角色不要切分支、提交、推送或跑會同步全站版本的 npm test。各自可執行 node --test 指定檔案。瀏覽器重測由主整合者串行執行。


## 最終整合補充

- numericDraft 為未提交數值字串（最多 100 字），numericInitial 為不可覆寫的首次提交；快照一併保存。
- parked 僅保存 L1～L3 未核對題，數值變式可不在一般題庫中，但須符合同科／同課及題面驗證。
- levelSpentMs 保存各層實際累計，跳層不清零；numeric 入口先更新當前活動時間。
- 同日協助計入舊格式 hint、answerViewed、progressive.assistance；只讀原稿，不回寫或重評。
- 無法讀取本機原格式時，另提供原始字串下載；不將空白新 state 冒充原始資料備份。
- 最終題庫改由兩位作者分科擴充：RC／鋼構一組，結構學／動力／土壤一組；獨立審查者先封存初答，再揭示各科答案。
