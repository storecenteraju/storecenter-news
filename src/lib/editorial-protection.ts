export const editablePostFields = [
  'title', 'subtitle', 'content', 'category', 'author', 'image', 'tags',
  'status', 'publishAt', 'date', 'isTestPost', 'isUrgente', 'isDestaque',
  'seoTitle', 'seoDescription', 'keyword', 'imagePrompt'
] as const;

export function changedPostFields(original: any, form: any): Record<string, any> {
  const patch: Record<string, any> = {};
  for (const field of editablePostFields) {
    if (!Object.prototype.hasOwnProperty.call(form, field) || form[field] === undefined) continue;
    const previous = original?.[field] ?? (['isTestPost', 'isUrgente', 'isDestaque'].includes(field) ? false : field === 'tags' ? [] : '');
    if (JSON.stringify(previous) !== JSON.stringify(form[field])) patch[field] = form[field];
  }
  return patch;
}

export function prepareManualUpdate(post: any, changes: any, timestamp: string): any {
  const keys = Object.keys(changes || {});
  if (keys.some(key => !(editablePostFields as readonly string[]).includes(key))) {
    throw new Error('A edição contém campos não autorizados. Atualize o painel e tente novamente.');
  }
  const manualFields = { ...(post.manualFields || {}) };
  for (const key of keys) manualFields[key] = true;
  return { ...changes, manuallyEdited: true, manualFields, manualEditedAt: timestamp };
}

export async function persistManualUpdate(store: any, post: any, changes: any, timestamp: string): Promise<any> {
  if (!store) throw new Error('Não foi possível confirmar o salvamento permanente. A edição não foi aplicada.');
  const update = prepareManualUpdate(post, changes, timestamp);
  // Sparse merge: a title edit never sends the cached image/category back to
  // Firestore. Wait for persistence before exposing the result in the cache.
  await store.collection('posts').doc(String(post.id)).set(update, { merge: true });
  return { ...post, ...update };
}

export function manualOverrideFromPost(post: any): any {
  const fields: Record<string, any> = {};
  for (const key of editablePostFields) {
    if (post.manualFields?.[key] && Object.prototype.hasOwnProperty.call(post, key)) fields[key] = post[key];
  }
  return { id: String(post.id), fields, editedAt: post.manualEditedAt || '' };
}

export function automaticPostUpdate(current: any, proposed: any, now = Date.now()): any {
  const patch = { ...proposed };
  const dueSchedule = current?.status === 'scheduled' && proposed.status === 'published' &&
    Number.isFinite(Date.parse(current.publishAt || '')) && Date.parse(current.publishAt) <= now;
  for (const field of Object.keys(current?.manualFields || {})) {
    if (current.manualFields[field] && !(dueSchedule && ['status', 'date'].includes(field))) delete patch[field];
  }
  for (const key of ['manualFields', 'manuallyEdited', 'manualEditedAt']) delete patch[key];
  return patch;
}

export function applyManualOverrides(posts: any[], overrides: any[]): any[] {
  const patches = new Map(overrides.map(override => [String(override.id), override]));
  return posts.map(post => {
    const override = patches.get(String(post.id));
    if (!override) return post;
    if ((Date.parse(post.manualEditedAt || '') || 0) > (Date.parse(override.editedAt || '') || 0)) return post;
    return { ...post, ...prepareManualUpdate(post, override.fields, override.editedAt) };
  });
}

export function repairSelectedPosts(posts: any[], ids: string[], fields: string[], repair: (post: any) => any, allowManual = false): any[] {
  if (!ids.length || !fields.length) throw new Error('Informe explicitamente --ids e --fields. Nenhuma alteração foi feita.');
  if (fields.some(field => !(editablePostFields as readonly string[]).includes(field))) throw new Error('Campo de reparo não autorizado.');
  for (const id of ids) if (!posts.some(post => String(post.id) === id)) throw new Error(`ID não encontrado: ${id}`);
  return posts.map(post => {
    if (!ids.includes(String(post.id))) return post;
    const proposed = repair(post);
    const changes: Record<string, any> = {};
    for (const field of fields) {
      if (JSON.stringify(proposed[field]) === JSON.stringify(post[field])) continue;
      if (post.manualFields?.[field] && !allowManual) throw new Error(`Campo manual protegido: ${post.id}/${field}. Use --allow-manual apenas quando solicitado.`);
      changes[field] = proposed[field];
    }
    return Object.keys(changes).length ? { ...post, ...changes } : post;
  });
}
