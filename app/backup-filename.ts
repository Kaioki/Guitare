export function buildBackupFilename(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `parcours-guitare-albert-416-blocs-sauvegarde_${year}-${month}-${day}.json`;
}
