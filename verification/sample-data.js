import {emptyState,validateState} from '../core.js?v=0.15.0';
import {createPractice,selectQuestion,recordResponse,recordNumericInitial} from '../graded-practice.js?v=0.15.0';
import {numericQuestion} from '../graded-numeric.js?v=0.15.0';
import {newReview} from '../review-state.js?v=0.15.0';
import {emptyDrawing,emptyWorkspace,shape,TYPES,COLORS} from '../drawing-model.js?v=0.15.0';
import {lessonLayout} from '../drawing-layouts.js?v=0.15.0';
export const VERIFY_TOPICS=['structural-analysis','reinforced-concrete','steel-structures','structural-dynamics','soil-foundations'];
export const validRun=run=>/^[A-Za-z0-9-]{6,36}$/.test(run);
const now='2026-10-14T00:00:00.000Z';
export function verificationDrawing(topic){
 const d=emptyWorkspace(topic==='structural-analysis'?'beam-full':lessonLayout(topic,2));
 d.sheets.workspace=TYPES.map((type,i)=>({...shape(type,100+(i%4)*200,100+Math.floor(i/4)*170),color:COLORS[i%4],turn:(i%4)*90,direction:i%2?-1:1,bend:i%2?-65:75,text:type==='text'?'驗證標註：力、彎矩與變形':'',...(type==='pen'?{points:[[100,500],[150,520],[200,480]]}:{})}));
 return d;
}
export function verificationStates(topic,run){
 if(!VERIFY_TOPICS.includes(topic)||!validRun(run))throw Error('驗證批次或科目無效。');
 const base={activeMs:12345,reasoning:'雲端驗證用模擬推導；不計入正式學習。\n保留原式、單位與正負號。',explanation:'白話解釋：先確認模型，再列平衡。',mistake:'測試錯因與訂正；原始答案不得覆寫。',hint:2,errorType:'單位',values:{check:'-17.25'},startedAt:now,updatedAt:now};
 const old=emptyDrawing();Object.keys(old.sheets).forEach((key,i)=>old.sheets[key]=[{...shape(i===2?'curve':'arrow',120,140),text:'舊圖'+i}]);
 const legacy={...base,id:run+'-legacy',day:1,submittedAt:now,curriculumVersion:'verification-v1',assessment:{text:'模擬紀錄，不代表能力'},progressive:newReview(),drawing:old};
 const p=createPractice('A',{topic,day:2,sessionId:run+'-practice',now});
 const options=['a','b','c','d'].map(id=>({id,text:'驗證選項 '+id,reason:'僅核對資料保存'}));
 const question={id:'verification-multi',version:1,topic,day:2,level:2,type:'multi',skill:'資料驗證',model:'隔離測試',prompt:'模擬多選：檢查首答與訂正分開保存。',assistance:1,source:{kind:'specified-model',label:'隔離驗證資料',locator:'非學習題目'},explanation:'這是資料保全測試。',options,answer:['a','c']};
 selectQuestion([question],p,{level:2,now});recordResponse(p,['a','b'],{now,activeMs:1000});
 selectQuestion([{...question,id:'verification-order',level:3,type:'order',answer:['a','b','c','d']}],p,{level:3,now});recordResponse(p,['b','a','d','c'],{now,activeMs:2000});
 selectQuestion([numericQuestion(topic,run)],p,{level:3,now});recordNumericInitial(p,'-17.25',{now});recordResponse(p,'a',{now,activeMs:3000});
 const record={...base,id:run+'-modern',day:2,submittedAt:now,curriculumVersion:'verification-v2',assessment:{text:'驗證數值原答、提示與圖形；不計分'},progressive:p,drawing:verificationDrawing(topic)};
 const draftPractice=createPractice('C',{topic,day:2,sessionId:run+'-draft',now});
 selectQuestion([numericQuestion(topic,run+'-draft')],draftPractice,{level:3,now});draftPractice.current.numericDraft='12.34';
 const draft={...base,reasoning:'尚未提交的驗證草稿',progressive:draftPractice,drawing:verificationDrawing(topic)};
 const first=emptyState(topic);first.records=[legacy];first.drafts['2']={...base,progressive:newReview(),drawing:old};
 const second=emptyState(topic);second.records=[legacy,record];second.drafts['2']=draft;
 const third=structuredClone(second);third.records.push({...structuredClone(record),id:run+'-return',reasoning:'第二環境回存；前兩筆維持原稿。'});
 return [first,second,third].map(state=>validateState(state,topic));
}
export const equalData=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
export async function stateDigest(state){return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(state)))),x=>x.toString(16).padStart(2,'0')).join('');}
