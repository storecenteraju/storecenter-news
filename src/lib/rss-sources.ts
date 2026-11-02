export const supplementalRssFeeds = [
  { id: 'feed-agencia-brasil', name: 'Agência Brasil - Últimas notícias', url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', category: 'Nacional', status: 'active', imagePolicy: 'reference_only' },
  { id: 'feed-agencia-senado', name: 'Agência Senado - Últimas notícias', url: 'https://www12.senado.leg.br/noticias/RSS', category: 'Política', status: 'active', imagePolicy: 'reference_only' }
];

export function withSupplementalRssFeeds(feeds: any[]): any[] {
  const result = [...feeds];
  for (const feed of supplementalRssFeeds) {
    // Respect an existing inactive feed too: never reactivate an editorial choice.
    if (!result.some(item => item.id === feed.id || String(item.url || '').replace(/\/$/, '') === feed.url)) {
      result.push({ ...feed });
    }
  }
  return result;
}

export function rssPublisherKey(url: unknown): string {
  try { return new URL(String(url)).hostname.toLowerCase().replace(/^www\d*\./, ''); }
  catch { return ''; }
}

export function rankRssCandidates(candidates: any[], recentPosts: any[]): any[] {
  const history = recentPosts.filter(p => p.status === 'published' || p.status === 'scheduled')
    .sort((a, b) => (Date.parse(b.date) || 0) - (Date.parse(a.date) || 0)).slice(0, 10)
    .map(p => rssPublisherKey(p.sourceUrl)).filter(Boolean);
  const latestPublisher = history[0];
  const count = (key: string) => history.filter(value => value === key).length;
  const lastSeen = (key: string) => history.includes(key) ? history.indexOf(key) : history.length;
  return [...candidates].sort((a, b) => {
    const left = rssPublisherKey(a.item?.link || a.feed?.url);
    const right = rssPublisherKey(b.item?.link || b.feed?.url);
    // All sections of G1 count as one publisher. Prefer another available
    // publisher, then balance recent use; category/relevance break the tie.
    return Number(left === latestPublisher) - Number(right === latestPublisher) ||
      count(left) - count(right) || lastSeen(right) - lastSeen(left) ||
      b.compositeScore - a.compositeScore;
  });
}
