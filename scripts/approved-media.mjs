import {createHash} from 'node:crypto';

// Media is approved individually after a visual review, not excluded by extension.
export function validateMedia(path,bytes,manifest){
 const entry=manifest[path];
 const limit=path.startsWith('site/assets/phase-')?120000:350000;
 if(!entry||entry.type!=='image/jpeg'||!entry.purpose?.trim()||bytes.length>limit||bytes.length<4||bytes[0]!==0xff||bytes[1]!==0xd8||bytes[2]!==0xff||bytes.at(-2)!==0xff||bytes.at(-1)!==0xd9)throw Error('Unapproved or invalid public media: '+path);
 if(createHash('sha256').update(bytes).digest('hex')!==entry.sha256)throw Error('Public media changed; visual review required: '+path);
}
