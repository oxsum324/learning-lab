import {createHash} from 'node:crypto';
// Git checkouts may convert CRLF on Windows; no other byte differences are normalized.
export const curriculumHash=raw=>createHash('sha256').update(raw.toString('utf8').replaceAll('\r\n','\n')).digest('hex');
