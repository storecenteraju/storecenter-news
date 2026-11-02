const normalize = (value: string) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

export function isGeopoliticalTopic(text: string): boolean {
  return /\b(guerra|diplomacia|sancoes|sancao|invasao|cessar.fogo|otan|embaixada|tratado internacional|conflito internacional|relacoes internacionais|tensao diplomatica|tensoes diplomaticas|disputa territorial|conflito militar|ataque militar|missil|misseis)\b/.test(normalize(text));
}

export function isAutomotiveMarket(text: string): boolean {
  const value = normalize(text);
  const vehicle = /\b(honda|toyota|byd|fiat|volkswagen|chevrolet|hyundai|renault|nissan|jeep|cr-v|suvs?|automoveis|automovel|montadora|carros?)\b/.test(value);
  const market = /\b(vendas?|vende|vendeu|emplac\w*|mercado|precos?|custa|lancamento|modelo|suvs?|hibrid\w*)\b/.test(value);
  return vehicle && market && !isGeopoliticalTopic(value);
}

export function cleanRssTitle(title: string): string {
  return String(title || '')
    .replace(/\s*\[?Fonte\s*2\]?\b[\s\S]*$/i, '')
    .replace(/\s*(?:[.\-–—|:]\s*)?(?:o\s+)?g1\s+testou\b[\s\S]*$/i, '')
    .trim();
}

const generatedTitleSuffix = /:\s*(?:por que isso importa para a economia|o que esta em jogo no mercado|o que pode mudar agora|qual pode ser o proximo passo|o que ainda precisa ser esclarecido|o que muda para usuarios e empresas|por que esse movimento importa|o que muda para os proximos jogos|o que a populacao precisa saber|como isso afeta a populacao|por que esse assunto merece atencao)\?$/i;

export function buildRssHeadline(title: string, originalTitle = title): string {
  const damaged = generatedTitleSuffix.test(normalize(title)) || /\bFonte\s*2\b/i.test(title);
  const clean = cleanRssTitle(damaged ? originalTitle : title)
    .replace(/(:\s*)(?:veja|confira|entenda|saiba)\s+/gi, '$1')
    .replace(/\s+/g, ' ').trim();
  if (clean.length <= 100) return clean;
  const clipped = clean.slice(0, 101);
  return clipped.slice(0, clipped.lastIndexOf(' ')).replace(/[\s,;:\-–—]+$/, '');
}

export function isSportsTopic(text: string): boolean {
  // Word boundaries prevent "contrapartidas" and "golpes" becoming sports.
  const value = normalize(text);
  return /\b(?:copa do mundo|fifa|futebol|campeonatos?|formula\s*1|pole position|roland garros|grand slam|tenistas?|wimbledon|us open|aberto da australia)\b/.test(value) ||
    (/\b(?:gols?|jogador(?:es)?|jogadora(?:s)?|partidas?)\b/.test(value) &&
     /\b(?:times?|equipe|campo|quadra|estadio|torcida|vence|venceu|vitoria|empate|adversario|placar)\b/.test(value));
}

export function cleanRssPromotions(text: string): string {
  return String(text || '')
    .replace(/<figcaption\b[^>]*>[\s\S]*?<\/figcaption>/gi, ' ')
    .replace(/<(div|p|span)\b[^>]*class=["'][^"']*\bcontent-media__(?:description|credit)\b[^"']*["'][^>]*>[\s\S]*?<\/\1>/gi, ' ')
    .replace(/\bBolsa Fam[ií]lia\s+Luis Lima Jr\s*\/\s*FotoArena\s*\/\s*/gi, ' ')
    .replace(/\bBaixe\s+o\s+app\s+do\s+g1\s+para\s+ver\s+not[ií]cias\s+em\s+tempo\s+real\s+e\s+de\s+gra[cç]a[.!]?/gi, ' ')
    .replace(/\b(?:Siga|Acompanhe)\s+(?:o\s+)?(?:canal\s+do\s+)?g1\s+no\s+(?:WhatsApp|Telegram)[.!]?/gi, ' ')
    .replace(/\b(?:Agora\s+no\s+g1|Clique\s+(?:aqui\s+)?para\s+(?:ler|ver|acessar)\s+(?:a\s+)?(?:mat[eé]ria|not[ií]cia)\s+(?:completa\s+)?no\s+g1)[.!]?/gi, ' ')
    .replace(/\(\s*leia\s+mais\s+abaixo\s*\)/gi, ' ')
    .replace(/[ \t]+/g, ' ').trim();
}

export function sanitizeRssPost(post: any): any {
  if (!post?.rssOriginalTitle) return { ...post };
  const p = { ...post };
  const oldTitle = String(p.title || '');
  p.title = buildRssHeadline(oldTitle, p.rssOriginalTitle);
  p.subtitle = cleanRssOpening(cleanRssPromotions(p.subtitle || ''));
  let content = String(p.content || '');
  // Repair the specific old consolidation of Bolsa Família with a separate FGTS
  // story. Require its recorded secondary URL and the exact transition text.
  if (/bolsa familia/.test(normalize(p.rssOriginalTitle)) &&
      Array.isArray(p.sourceUrls) && p.sourceUrls.slice(1).some((url: unknown) => /fgts/i.test(String(url)))) {
    content = content.replace(/\s+Saque-anivers[aá]rio FGTS novembro\.[\s\S]*$/i, '');
  }
  const paragraphs = rssArticleParagraphs(content);
  if (/O que aconteceu|Como as informações se conectam/i.test(content)) {
    const context = automotiveContext(p.title, paragraphs.join(' '));
    if (context && !paragraphs.includes(context)) paragraphs.unshift(context);
  }
  p.content = paragraphs.join('\n\n');
  const previousCategory = p.category;
  if (isAutomotiveMarket(`${p.title} ${p.subtitle}`)) p.category = 'Negócios';
  if (/\b(?:bolsa familia|bpc|inss|fgts)\b/.test(normalize(`${p.rssOriginalTitle} ${p.title}`))) p.category = 'Economia';
  if (Array.isArray(p.tags)) {
    p.tags = [...new Set(p.tags.map((tag: string) =>
      normalize(tag).trim() === normalize(previousCategory || '').trim() ? p.category : tag))];
  }
  if (p.title !== oldTitle) p.seoTitle = p.title;
  if (typeof p.seoDescription === 'string') p.seoDescription = cleanRssPromotions(p.seoDescription);
  return p;
}

export function cleanRssOpening(text: string): string {
  // A caption such as “Honda” may precede “O Honda CR-V...” in RSS HTML.
  // Only remove it when the same words immediately repeat after an article.
  return text.replace(/^([\p{L}\p{N}][\p{L}\p{N} -]{0,45}?)\s+((?:O|A|Os|As)\s+)\1(?=[\s,.!?-]|$)/iu, '$2$1').trim();
}

const fixedHeadings = /^(?:#{1,6}\s*)?(?:\d+\.\s*)?(?:O que aconteceu|O que ja foi informado|Como as informacoes se conectam|O que isso representa|A pergunta que fica|O que observar agora|Introducao|Explicacao Simplificada|Contexto Historico|Contexto confirmado|Impactos para empresas e consumidores|Dados confirmados|Proximos passos|Conclusao|FAQ automatico)\s*[:.]?$/i;
const fillerStarts = /^(?:A leitura conjunta dos resumos disponiveis|Alem do acontecimento imediato, a pauta tem efeitos|A resposta depende das proximas informacoes e decisoes ligadas ao caso|Esta materia foi elaborada a partir do conteudo distribuido|Esta materia foi produzida a partir de informacoes distribuidas|Quando essa mudanca pode chegar ao bolso — e quem tende a sentir primeiro os seus efeitos\?)/i;

export function rssArticleParagraphs(content: string): string[] {
  return cleanRssPromotions(content).replace(/\r\n?/g, '\n')
    .replace(/\[Fonte\s*\d+(?:\s*[—–-][^\]]*)?\]/gi, '')
    .replace(/<br\s*\/?\s*>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n').replace(/<p\b[^>]*>/gi, '')
    .split(/\n+/)
    .map(paragraph => paragraph.replace(/\s+/g, ' ').trim())
    .filter(paragraph => {
      const plain = normalize(paragraph.replace(/[*_]/g, ''));
      return Boolean(paragraph) && !fixedHeadings.test(plain) && !fillerStarts.test(plain);
    })
    .map(cleanRssOpening);
}

export function automotiveContext(title: string, summary: string): string {
  if (!isAutomotiveMarket(`${title} ${summary}`)) return '';
  const model = `${title} ${summary}`.match(/\b(Honda|Toyota|BYD|Fiat|Volkswagen|Chevrolet|Hyundai|Renault|Nissan|Jeep)\s+([A-Z0-9][A-Za-z0-9]*(?:-[A-Za-z0-9]+)?)/)?.[0];
  const text = normalize(`${title} ${summary}`);
  if (model && /\bbrasil\b/.test(text) && /\b(eua|estados unidos|norte-americano)\b/.test(text) && /vend|mercado/.test(text)) {
    return `O desempenho comercial do ${model} evidencia o contraste entre os mercados automotivos dos Estados Unidos e do Brasil. A comparação reúne a presença da marca, a procura pelo modelo e sua posição diante dos concorrentes.`;
  }
  return '';
}
