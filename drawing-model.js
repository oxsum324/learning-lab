import {LAYOUTS} from './drawing-layouts.js?v=0.11.0';
export const SHEETS={force:'受力圖',internal:'剪力／彎矩圖',deformed:'變形圖'};
export const TYPES=['line','arrow','udl','moment','pin','roller','fixed','text','pen','curve','rect','circle'];
export const COLORS=['#173c36','#22746a','#b64b32','#285ca8'];
export const emptyDrawing=()=>({version:1,sheets:{force:[],internal:[],deformed:[]}});
export const emptyWorkspace=(layout='free')=>({version:2,layout,height:LAYOUTS[layout].height,sheets:{workspace:[]}});
export function validDrawing(d){
 if(d===undefined)return true; // Preserve older text-only records without migration.
 if(!d||!d.sheets)return false;
 const modern=d.version===2,keys=modern?['workspace']:Object.keys(SHEETS),maxY=modern?d.height:520;
 if(!modern&&d.version!==1)return false;
 if(modern&&(!Object.hasOwn(LAYOUTS,d.layout)||!Number.isFinite(maxY)||maxY<LAYOUTS[d.layout].height||maxY>2400))return false;
 if(Object.keys(d.sheets).length!==keys.length)return false;
 const finite=(n,max)=>Number.isFinite(n)&&n>=0&&n<=max;
 return keys.every(key=>Array.isArray(d.sheets[key])&&d.sheets[key].length<=(modern?480:120)&&d.sheets[key].every(s=>s&&TYPES.includes(s.type)&&COLORS.includes(s.color)&&[0,90,180,270].includes(s.turn??0)&&finite(s.x1,1000)&&finite(s.x2,1000)&&finite(s.y1,maxY)&&finite(s.y2,maxY)&&typeof s.text==='string'&&s.text.length<=120&&Number.isFinite(s.bend)&&Math.abs(s.bend)<=200&&[1,-1].includes(s.direction)&&Array.isArray(s.points)&&s.points.length<=300&&s.points.every(p=>Array.isArray(p)&&p.length===2&&finite(p[0],1000)&&finite(p[1],maxY))&&(s.type!=='pen'||s.points.length>=1)));
}
export function toWorkspace(d,layout='free'){
 if(!validDrawing(d))throw Error('Invalid drawing');
 if(!d||!hasDrawing(d)&&d.version===1)return emptyWorkspace(layout);
 if(d.version===2)return structuredClone(d);
 const out=emptyWorkspace('legacy');
 Object.keys(SHEETS).forEach((key,i)=>{const dy=i*600+60;for(const s of d.sheets[key])out.sheets.workspace.push({...structuredClone(s),y1:s.y1+dy,y2:s.y2+dy,points:s.points.map(([x,y])=>[x,y+dy])});});
 return out;
}
export function changeLayout(d,layout){
 if(!Object.hasOwn(LAYOUTS,layout))throw Error('Unknown layout');
 const out=toWorkspace(d);out.layout=layout;out.height=hasDrawing(out)?Math.max(out.height,LAYOUTS[layout].height):LAYOUTS[layout].height;return out;
}
export function hasDrawing(d){return !!d&&Object.values(d.sheets).some(s=>s.length>0);}
export function shape(type,x=200,y=200){return {type,color:COLORS[0],x1:x,y1:y,x2:Math.min(x+160,1000),y2:y,text:type==='text'?'標註':'',bend:75,direction:1,points:type==='pen'?[[x,y]]:[]};}
export function moveShape(s,dx,dy,maxY=520){
 const xs=[s.x1,s.x2,...s.points.map(p=>p[0])],ys=[s.y1,s.y2,...s.points.map(p=>p[1])];
 dx=Math.max(-Math.min(...xs),Math.min(1000-Math.max(...xs),dx));dy=Math.max(-Math.min(...ys),Math.min(maxY-Math.max(...ys),dy));
 return {...structuredClone(s),x1:s.x1+dx,x2:s.x2+dx,y1:s.y1+dy,y2:s.y2+dy,points:s.points.map(([x,y])=>[x+dx,y+dy])};
}
export function makeTemplate(name){const s=(type,x1,y1,x2=x1,y2=y1)=>({...shape(type,x1,y1),x2,y2});
 if(name==='simple')return [s('line',180,240,820,240),s('pin',180,245),s('roller',820,245)];
 if(name==='cantilever')return [s('line',180,240,820,240),s('fixed',180,240)];
 if(name==='propped')return [s('line',180,240,820,240),s('fixed',180,240),s('roller',820,245)];
 if(name==='axes')return [s('line',100,140,900,140),{...s('text',65,135),text:'V'},s('line',100,330,900,330),{...s('text',65,325),text:'M'}];
 if(name==='section')return [s('rect',300,100,700,400)];
 if(name==='hsection'){const points=[[280,80],[720,80],[720,140],[535,140],[535,380],[720,380],[720,440],[280,440],[280,380],[465,380],[465,140],[280,140],[280,80]];return [{...s('pen',280,80,280,80),points}];}
 if(name==='layers')return [s('line',100,100,900,100),s('line',100,250,900,250),s('line',100,400,900,400)];
 if(name==='plot')return [s('line',140,400,900,400),s('line',140,400,140,80)];
 return [];
}
