import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizePost } from '../src/types.ts';
import { isAutomotiveMarket, isGeopoliticalTopic, cleanRssOpening, cleanRssTitle, rssArticleParagraphs, automotiveContext } from '../src/lib/rss-editorial.ts';

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
