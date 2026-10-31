export const CORE_BLOCKS = 312;
export const SPECIALIZATION_BLOCKS = 104;
export const TOTAL_BLOCKS = CORE_BLOCKS + SPECIALIZATION_BLOCKS;
export function trackProgress(units: readonly { id: string; number: number }[], progress: Record<string, {status?: string}>, track: 'core' | 'specialization') {
  const selected = units.filter(u => track === 'core' ? u.number <= CORE_BLOCKS : u.number > CORE_BLOCKS);
  const mastered = selected.filter(u => progress[u.id]?.status === 'mastered').length;
  return { total: selected.length, mastered, percent: selected.length ? Math.round(mastered / selected.length * 1000) / 10 : 0 };
}
