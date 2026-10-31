export const APP_ID = 'parcours-guitare-albert';
const record = (v: unknown): v is Record<string, any> => !!v && typeof v === 'object' && !Array.isArray(v);
const unit = (s: unknown) => typeof s === 'string' && /^S([1-9]\d*)$/.test(s) && Number(s.slice(1)) <= 416;
export function isGuitarBackup(v: unknown): boolean {
  if (!record(v) || v.appId !== APP_ID || v.version !== 5 || !record(v.sessions) || !record(v.unitProgress) || !record(v.reviews)) return false;
  if (!Object.entries(v.sessions).every(([key, s]) => record(s) && s.id === key && unit(s.unitId) && typeof s.custom === 'boolean' && typeof s.completed === 'boolean' && Number.isFinite(s.duration) && s.duration >= 0 && s.duration <= 1440 && ['id','template','date','title','what','why','how','bpm','accompaniment','notes','successes','obstacle','next','updatedAt'].every(f => typeof s[f] === 'string') && Number.isInteger(s.difficulty) && s.difficulty>=1 && s.difficulty<=5 && Number.isInteger(s.confidence) && s.confidence>=1 && s.confidence<=5 && (s.custom ? key.startsWith('custom-') : key === `${s.unitId}-${s.template}` && /^[ABCDE]$/.test(s.template)) && (s.date === '' || /^\d{4}-\d{2}-\d{2}$/.test(s.date)))) return false;
  if (!Object.entries(v.unitProgress).every(([key, p]) => unit(key) && record(p) && ['not_started','in_progress','mastered','paused'].includes(p.status) && typeof p.updatedAt === 'string' && (p.note === undefined || typeof p.note === 'string'))) return false;
  return Object.entries(v.reviews).every(([key, r]) => /^\d{4}-(0[1-9]|1[0-2])$/.test(key) && record(r) && record(r.ratings) && Object.entries(r.ratings).every(([k,x]) => /^[0-7]$/.test(k) && ['stable','progress','rework',''].includes(x as string)) && typeof r.notes === 'string' && typeof r.updatedAt === 'string');
}
