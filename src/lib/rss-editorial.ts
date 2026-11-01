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
    .replace(/\s*(?:[.\-–—|:]\s*)?(?:o\s+)?g1\s+testou\b[\s\S]*$/i, '')
    .trim();
}

export function cleanRssOpening(text: string): string {
  // A caption such as “Honda” may precede “O Honda CR-V...” in RSS HTML.
  // Only remove it when the same words immediately repeat after an article.
  return text.replace(/^([\p{L}\p{N}][\p{L}\p{N} -]{0,45}?)\s+((?:O|A|Os|As)\s+)\1(?=[\s,.!?-]|$)/iu, '$2$1').trim();
}

const fixedHeadings = /^(?:#{1,6}\s*)?(?:\d+\.\s*)?(?:O que aconteceu|O que ja foi informado|Como as informacoes se conectam|O que isso representa|A pergunta que fica|O que observar agora|Introducao|Explicacao Simplificada|Contexto Historico|Contexto confirmado|Impactos para empresas e consumidores|Dados confirmados|Proximos passos|Conclusao|FAQ automatico)\s*[:.]?$/i;
const fillerStarts = /^(?:A leitura conjunta dos resumos disponiveis|Alem do acontecimento imediato, a pauta tem efeitos|A resposta depende das proximas informacoes e decisoes ligadas ao caso|Esta materia foi elaborada a partir do conteudo distribuido|Esta materia foi produzida a partir de informacoes distribuidas|Quando essa mudanca pode chegar ao bolso — e quem tende a sentir primeiro os seus efeitos\?)/i;

export function rssArticleParagraphs(content: string): string[] {
  return String(content || '').replace(/\r\n?/g, '\n')
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
