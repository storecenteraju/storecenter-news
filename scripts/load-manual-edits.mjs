import fs from 'node:fs';
import path from 'node:path';

export async function loadManualEditsForBuild(root, fetcher = fetch) {
  const snapshot = path.join(root, 'manual-overrides.json');
  const saved = fs.existsSync(snapshot) ? JSON.parse(fs.readFileSync(snapshot, 'utf8')) : [];
  if (process.env.MANUAL_EDITS_SYNC === 'off') return saved;
  const endpoint = process.env.MANUAL_EDITS_ENDPOINT || 'https://www.storecenter.com.br/api/manual-edits';
  const response = await fetcher(endpoint, { cache: 'no-store', signal: AbortSignal.timeout(25_000) });
  // First deployment only: the previous server does not implement this route.
  if (response.status === 404) {
    console.log('[MANUAL] Primeira implantação da proteção: usando o registro local das capas manuais.');
    return saved;
  }
  if (!response.ok) throw new Error(`Não foi possível conferir as edições manuais (HTTP ${response.status}). Publicação interrompida para preservar o conteúdo.`);
  const data = await response.json();
  if (data.version !== 1 || !Array.isArray(data.overrides)) throw new Error('Resposta inválida ao conferir edições manuais. Publicação interrompida.');
  const merged = new Map(saved.map(override => [String(override.id), override]));
  for (const override of data.overrides) {
    const previous = merged.get(String(override.id));
    merged.set(String(override.id), { ...override, fields: { ...(previous?.fields || {}), ...override.fields } });
  }
  return Array.from(merged.values());
}
