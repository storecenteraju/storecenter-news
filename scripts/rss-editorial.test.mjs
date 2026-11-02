import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePost } from '../src/types.ts';
import { isAutomotiveMarket, isGeopoliticalTopic, cleanRssOpening, cleanRssTitle, rssArticleParagraphs, automotiveContext, buildRssHeadline, isSportsTopic, cleanRssPromotions, sanitizeRssPost } from '../src/lib/rss-editorial.ts';
import { rankRssCandidates, withSupplementalRssFeeds, rssPublisherKey } from '../src/lib/rss-sources.ts';

test('remove the detached photo caption, preserving the eligibility paragraph and actual image credit', () => {
  const question = 'Quem pode receber o Bolsa Família? A principal regra para receber o benefício é ter renda mensal familiar de até R$ 218 por pessoa.';
  const original = { rssOriginalTitle: 'Bolsa Família 2026', title: 'Bolsa Família 2026', content: `Pagamentos começam em novembro.\n\nBolsa Família Luis Lima Jr/FotoArena/${question}`, imageCredit: 'Arte editorial: Store Center', sourceUrl: 'https://g1.globo.com/economia/bolsa', id: 'caption', slug: 'mesma-url' };
  const result = sanitizeRssPost(original);
  assert.equal(result.content, `Pagamentos começam em novembro.\n\n${question}`);
  assert.equal(result.imageCredit, original.imageCredit);
  assert.equal(result.sourceUrl, original.sourceUrl);
  assert.equal(result.slug, original.slug);
  assert.equal(result.id, original.id);
  assert.equal(cleanRssPromotions(`<figcaption>Outra legenda Fulano/FotoArena</figcaption>${question}`), question);
  assert.equal(cleanRssPromotions(`<div class="content-media__description">Outra legenda <span class="content-media__credit">Fulano/FotoArena</span></div>${question}`), question);
  assert.equal(cleanRssPromotions('Segundo Luis Lima Jr, fotógrafo da FotoArena, o evento ocorreu em novembro.'), 'Segundo Luis Lima Jr, fotógrafo da FotoArena, o evento ocorreu em novembro.');
  assert.deepEqual(sanitizeRssPost(result), result);
});

test('Bolsa Família keeps its payment subject, including existing bad sports headlines and SEO', () => {
  const original = { id: 'bolsa', title: 'Bolsa Família 2026: o que muda para os próximos jogos?', seoTitle: 'Bolsa Família: jogos?', rssOriginalTitle: 'Bolsa Família 2026: veja calendário de pagamentos em novembro', content: 'As contrapartidas incluem vacinação. Os valores dependem da composição familiar.', category: 'Economia', slug: 'url-antiga', image: 'capa.svg', sourceUrl: 'https://g1.globo.com/economia/bolsa', sourceNames: ['G1'], tags: ['Economia'], date: '2026-11-01T12:00:00Z' };
  const repaired = normalizePost(original);
  assert.equal(repaired.title, 'Bolsa Família 2026: calendário de pagamentos em novembro');
  assert.equal(repaired.seoTitle, repaired.title);
  assert.equal(repaired.category, 'Economia');
  for (const key of ['id', 'slug', 'image', 'sourceUrl']) assert.equal(repaired[key], original[key]);
  assert.equal(Date.parse(repaired.date), Date.parse(original.date));
  assert.deepEqual(repaired.sourceNames, original.sourceNames);
  assert.match(repaired.content, /contrapartidas/);
  assert.equal(original.title, 'Bolsa Família 2026: o que muda para os próximos jogos?');
  assert.equal(isSportsTopic('Bolsa Família: contrapartidas e proteção contra golpes'), false);
  assert.equal(isSportsTopic('Seleção de famílias e partida de motores'), false);
  assert.equal(isSportsTopic('Flamengo faz dois gols e vence a partida do campeonato'), true);
  assert.equal(buildRssHeadline('Honda CR-V: por que quase não vende no Brasil?'), 'Honda CR-V: por que quase não vende no Brasil?');
  assert.ok(buildRssHeadline('Pagamento '.repeat(30)).length <= 100);
});

test('remove G1 promotion even when attached to a factual paragraph; keep Caixa instructions and attribution', () => {
  const text = 'Baixe o app do g1 para ver notícias em tempo real e de graça Este é o segundo mês de pagamentos.\n\n(leia mais abaixo) Segundo a Caixa, use o aplicativo Caixa TEM.\n\nAgora no g1 Qual é o valor?';
  const cleaned = rssArticleParagraphs(text).join('\n\n');
  assert.equal(cleaned, 'Este é o segundo mês de pagamentos.\n\nSegundo a Caixa, use o aplicativo Caixa TEM.\n\nQual é o valor?');
  assert.equal(cleanRssPromotions('Baixe o aplicativo Caixa TEM para consultar o benefício.'), 'Baixe o aplicativo Caixa TEM para consultar o benefício.');
  assert.match(cleanRssPromotions('Segundo o g1, a Caixa informou a data.'), /Segundo o g1/);
  assert.equal(cleanRssPromotions(cleaned), cleaned);
});

test('repair the recorded Bolsa/FGTS consolidation without changing unrelated paragraphs or metadata', () => {
  const original = { rssOriginalTitle: 'Bolsa Família 2026: veja calendário', title: 'Bolsa Família 2026: o que muda para os próximos jogos?', content: 'Os beneficiários recebem pelo Caixa TEM. Saque-aniversário FGTS novembro.\n\nOutro assunto.', sourceUrls: ['https://g1.globo.com/bolsa', 'https://g1.globo.com/fgts'], id: '1', slug: 'old' };
  const repaired = sanitizeRssPost(original);
  assert.equal(repaired.content, 'Os beneficiários recebem pelo Caixa TEM.');
  assert.deepEqual(repaired.sourceUrls, original.sourceUrls);
  assert.deepEqual(sanitizeRssPost(repaired), repaired);
  assert.match(sanitizeRssPost({ ...original, sourceUrls: ['https://g1.globo.com/bolsa'] }).content, /FGTS/);
});

test('rotate publishers, not G1 sections; fall back when only one eligible publisher is available', () => {
  const candidate = (url, score) => ({ item: { link: url }, feed: { url }, compositeScore: score });
  const economy = candidate('https://g1.globo.com/economia/a', 50);
  const technology = candidate('https://g1.globo.com/tecnologia/b', 60);
  const camara = candidate('https://www.camara.leg.br/noticias/c', 20);
  const agencia = candidate('https://agenciabrasil.ebc.com.br/economia/d', 25);
  const history = [{ status: 'published', date: '2026-11-01', sourceUrl: economy.item.link }];
  assert.deepEqual(rankRssCandidates([economy, technology, camara, agencia], history).slice(0, 2), [agencia, camara]);
  assert.equal(rankRssCandidates([economy, technology], history)[0], technology);
  const updatedHistory = [{ status: 'published', date: '2026-11-02', sourceUrl: agencia.item.link }, ...history];
  assert.equal(rankRssCandidates([economy, technology, camara, agencia], updatedHistory)[0], camara);
  assert.equal(rssPublisherKey('https://www12.senado.leg.br/noticias'), 'senado.leg.br');
  assert.deepEqual(history, [{ status: 'published', date: '2026-11-01', sourceUrl: economy.item.link }]);
});

test('add official feeds once and respect disabled configured feeds', () => {
  const configured = [{ id: 'custom', url: 'https://agenciabrasil.ebc.com.br/rss/ultimasnoticias/feed.xml', status: 'inactive' }];
  const feeds = withSupplementalRssFeeds(configured);
  assert.equal(feeds.length, 2);
  assert.equal(feeds[0].status, 'inactive');
  assert.equal(configured.length, 1);
  assert.deepEqual(withSupplementalRssFeeds(feeds), feeds);
});

test('Honda sales in the US are business; diplomacy requires a real geopolitical subject', () => {
  assert.equal(isAutomotiveMarket('Por que o Honda CR-V é um sucesso nos EUA, mas quase não vende no Brasil?'), true);
  assert.equal(isGeopoliticalTopic('Honda vende SUV nos EUA e na China'), false);
  assert.equal(isGeopoliticalTopic('EUA anunciam sanções após invasão militar'), true);
  assert.equal(isAutomotiveMarket('Honda interrompe vendas por sanções durante guerra'), false);
  assert.equal(isAutomotiveMarket('Final da Copa entre Brasil e Estados Unidos'), false);
});

test('clean caption duplication and source promotion, preserving the actual question and numeric data', () => {
  assert.equal(cleanRssOpening('Honda O Honda CR-V vendeu 226 mil unidades.'), 'O Honda CR-V vendeu 226 mil unidades.');
  assert.equal(cleanRssOpening('Honda vendeu 226 mil unidades.'), 'Honda vendeu 226 mil unidades.');
  assert.equal(cleanRssTitle("Por que o Honda CR-V quase não vende no Brasil? O g1 testou o SUV 'invisível'"), 'Por que o Honda CR-V quase não vende no Brasil?');
  assert.deepEqual(rssArticleParagraphs('O que aconteceu\r\n\r\nHonda O Honda CR-V custa R$ 353.500.\n\n\nO que já foi informado\n\nSegundo a associação, foram 133 unidades.\n\nComo as informações se conectam\n\nA leitura conjunta dos resumos disponíveis ajuda o leitor.\n\nEsta matéria foi elaborada a partir do conteúdo distribuído por G1.'), ['O Honda CR-V custa R$ 353.500.', 'Segundo a associação, foram 133 unidades.']);
});

test('context uses identified model and countries; does not invent brand history or technical data', () => {
  const title = 'Honda CR-V é sucesso de vendas nos EUA, mas quase não vende no Brasil';
  const context = automotiveContext(title, 'SUV híbrido: 226 mil nos EUA e 133 no Brasil.');
  assert.match(context, /Honda CR-V/);
  assert.match(context, /Estados Unidos e do Brasil/);
  assert.doesNotMatch(context, /fundada|fundacao|potencia|motor|lider|consumo|garantia/i);
  assert.equal(automotiveContext('Honda CR-V é lançado no Brasil', 'Novo SUV híbrido'), '');
  const prose = [context, 'O Honda vendeu 226 mil unidades.'].join('\n\n');
  assert.equal(rssArticleParagraphs(prose).join('\n\n'), prose);
});

test('existing RSS display is corrected while URL, image, sources and identity are preserved', () => {
  const original = { id: 'honda-1', title: "Por que o Honda CR-V vende nos EUA e não no Brasil? O g1 testou o SUV", subtitle: 'Honda O Honda CR-V vendeu 226 mil unidades.', content: 'O que aconteceu\n\nHonda O Honda CR-V vendeu 226 mil unidades nos EUA.\n\nO que já foi informado\n\nNo Brasil, foram 133 unidades, segundo a associação.\n\nComo as informações se conectam\n\nA leitura conjunta dos resumos disponíveis ajuda o leitor.\n\nEsta matéria foi elaborada a partir do conteúdo distribuído por G1.', category: 'Geopolítica', rssOriginalTitle: 'Honda CR-V', slug: 'url-antiga-fonte-2', image: 'foto-existente.jpg', sourceUrl: 'https://g1.globo.com/noticia', status: 'published', date: '2026-11-01T12:00:00Z', tags: ['Geopolítica', 'RSS', 'Store Center'] };
  const result = normalizePost(original);
  assert.equal(result.category, 'Negócios');
  assert.deepEqual(result.tags, ['Negócios', 'RSS', 'Store Center']);
  assert.deepEqual(original.tags, ['Geopolítica', 'RSS', 'Store Center']);
  assert.equal(result.slug, original.slug);
  assert.equal(result.id, original.id);
  assert.equal(result.image, original.image);
  assert.equal(result.sourceUrl, original.sourceUrl);
  assert.doesNotMatch(result.title, /g1 testou/i);
  assert.doesNotMatch(result.content, /Honda O Honda|O que aconteceu|leitura conjunta|elaborada a partir/i);
  assert.match(result.content, /226 mil/);
  assert.match(result.content, /133 unidades, segundo a associação/);
  assert.equal(normalizePost(result).content, result.content);
  assert.equal(normalizePost({ ...original, rssOriginalTitle: undefined }).category, 'Geopolítica');
});
