import {readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const root=process.argv[2];if(!root)throw Error('Provide the local curriculum folder.');
const read=name=>readFileSync(join(root,name),'utf8').replace(/^---[\s\S]*?---\s*/,'');
const plan=read('30天學習方案.md');
const days=plan.split('\n').filter(l=>/^\| D\d\d /.test(l)).map(l=>{const c=l.split('|').map(x=>x.trim());return {day:Number(c[1].slice(1,3)),read:c[2],task:c[3],check:c[4]};});
if(days.length!==30)throw Error('Expected 30 days.');
const bank=read('題庫與核對答案.md');const before=bank.split('## 核對答案')[0];
const problems={};for(const chunk of before.split(/^### /m).slice(1)){const title=chunk.split('\n')[0];const key=title.split('｜')[0].trim();problems[key]=chunk.trim().replace(/\n---\s*$/,'');}
const keys=['A','B','S','A','T','F','閉卷週測','C','A','C','E','T','A','閉卷週測','P','P','P','P','P','P','閉卷週測','J','J','I','I','K','S','閉卷週測','閉卷週測','閉卷週測'];
days.forEach((d,i)=>{d.problem=problems[keys[i]];if(!d.problem)throw Error('Missing problem '+keys[i]);});
const f=(id,label,value,unit)=>({id,label,value,unit});
const rb=(a,b,m)=>[f('ra','A向上反力',a,'kN'),f('rb','B向上反力',b,'kN'),f('moment','A外部逆時針反力矩',m,'kN·m')];
const fields={1:[f('ra','A鉛直反力',30,'kN'),f('rb','B鉛直反力',30,'kN'),f('moment','最大正彎矩',45,'kN·m'),f('x','最大彎矩距A',3,'m')],2:[f('ra','A鉛直反力',8,'kN'),f('rb','B鉛直反力',4,'kN'),f('moment','最大正彎矩',16,'kN·m')],4:[f('ra','A鉛直反力',24,'kN'),f('moment','最大正彎矩',36,'kN·m')],5:[f('ac','AC桿力（拉正壓負）',-5*Math.sqrt(13)/3,'kN'),f('ab','AB桿力（拉正壓負）',10/3,'kN')],6:[f('ra','A向上反力',10,'kN'),f('moment','A逆時針反力矩',40,'kN·m')],7:[f('ra','A鉛直反力',24,'kN'),f('moment','最大正彎矩',48,'kN·m')],8:[f('delta','端部向下撓度',4.5,'mm'),f('theta','端部順時針轉角',.00225,'rad')],9:[f('delta','跨中向下撓度',8.4375,'mm')],10:[f('delta','端部向下撓度',4.5,'mm')],11:[f('delta','跨中向下撓度',2.7,'mm')],13:[f('ei','僅EI加倍後的撓度',4.21875,'mm'),f('q','僅q加倍後的撓度',16.875,'mm')],14:[f('delta','端部向下撓度',8,'mm'),f('theta','端部順時針轉角',.0026666667,'rad')],16:[f('delta','基本系統端部向下位移',9.6,'mm'),f('flex','正柔度f',1.0666666667,'mm/kN')],17:rb(15,9,12),18:rb(16.875,7.125,19.5),19:rb(15,9,18),21:rb(15,9,9),23:[f('ra','A鉛直反力',9,'kN'),f('rb','B鉛直反力',30,'kN'),f('moment','跨內最大正彎矩',6.75,'kN·m')],24:[f('ra','RA影響線在x=3的縱距',.5,'無因次'),f('mid','跨中彎矩影響線在x=3的縱距',1.5,'m')],25:[f('ra','A向上反力',40/3,'kN'),f('moment','跨中彎矩',30,'kN·m')],26:[f('k','軸向剛度',20000,'kN/m'),f('u','B向右位移',.6,'mm')],28:[f('ra','A向上反力',16,'kN'),f('moment','最大正彎矩',16,'kN·m'),f('delta','跨中向下撓度',5/3,'mm')],29:rb(12.5,7.5,12.5)};
days.forEach(d=>d.fields=fields[d.day]??[]);
const data={version:'structural-2026-09-v1',days,reference:read('觀念速查.md'),answers:'核對答案'+bank.split('## 核對答案')[1]};
writeFileSync(new URL('../site/curriculum.json',import.meta.url),JSON.stringify(data,null,2)+'\n');
console.log('Generated 30 public lessons.');
