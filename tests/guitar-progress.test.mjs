import assert from 'node:assert/strict';
import test from 'node:test';
import { trackProgress } from '../app/progress.ts';
import { isGuitarBackup, APP_ID } from '../app/backup-validation.ts';
import { weeks, phases, repertoire } from '../app/plan-data.ts';
import { buildBackupFilename } from '../app/backup-filename.ts';
test('416 ordered blocks contain technical and repertoire instructions with the 312/104 boundary',()=>{
 assert.deepEqual(weeks.map(w=>w.number),Array.from({length:416},(_,i)=>i+1));
 assert.equal(phases.length,32); assert.equal(repertoire.length,57);
 assert.ok(weeks.every(w=>w.work&&w.repertoire&&w.ear&&w.validation));
 assert.equal(weeks[311].moduleNumber,24);assert.equal(weeks[312].moduleNumber,25);
});
test('mastery percentages use only the appropriate blocks and remain independent',()=>{
 const p={S1:{status:'mastered'},S313:{status:'in_progress'},S416:{status:'mastered'}};
 assert.deepEqual(trackProgress(weeks,p,'core'),{total:312,mastered:1,percent:0.3});
 assert.deepEqual(trackProgress(weeks,p,'specialization'),{total:104,mastered:1,percent:1});
 const all=Object.fromEntries(weeks.filter(w=>w.number<=312).map(w=>[w.id,{status:'mastered'}]));
 assert.equal(trackProgress(weeks,all,'core').percent,100);assert.equal(trackProgress(weeks,all,'specialization').percent,0);
 assert.equal(trackProgress(weeks,{},'core').percent,0);
});
test('a guitar backup roundtrips and piano backups or broken sessions are rejected',()=>{
 const session={id:'custom-check',unitId:'S313',template:'+',custom:true,date:'2026-10-31',title:'Reprise',what:'Cellule',why:'Consolider',how:'Lentement',duration:30,bpm:'50',accompaniment:'Acoustique',notes:'Note personnelle',successes:'Son',obstacle:'Raccord',next:'Reprendre',difficulty:3,confidence:2,completed:true,updatedAt:'2026-10-31'};
 const backup={appId:APP_ID,version:5,sessions:{'custom-check':session},unitProgress:{S1:{status:'mastered',updatedAt:''}},reviews:{'2026-10':{ratings:{0:'stable'},notes:'Bilan',updatedAt:''}}};
 assert.ok(isGuitarBackup(JSON.parse(JSON.stringify(backup))));
 assert.equal(isGuitarBackup({...backup,appId:'piano'}),false);
 assert.equal(isGuitarBackup({...backup,sessions:{'custom-check':{...session,duration:-1}}}),false);
 assert.equal(isGuitarBackup({...backup,sessions:{'custom-check':{...session,unitId:'S417'}}}),false);
 assert.equal(isGuitarBackup(null),false);assert.equal(isGuitarBackup({version:5,sessions:{},unitProgress:{},reviews:{}}),false);
 assert.match(buildBackupFilename(new Date(2026,9,31)),/^parcours-guitare-albert-416-blocs-sauvegarde_2026-10-31\.json$/);
});
