import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

test('RSS dry run alternates publishers, does not merge FGTS, cleans promotion and never saves', async () => {
  const originalCwd = process.cwd();
  const originalFetch = globalThis.fetch;
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'storecenter-rss-test-'));
  const previousEnv = Object.fromEntries(['STATIC_PUBLISH_MODE', 'VERCEL', 'GEMINI_API_KEY', 'RSS_ENABLE_AI_IMAGE_GENERATION', 'RSS_DEFAULT_IMAGE_POLICY'].map(key => [key, process.env[key]]));
  const feeds = [
    { id: 'g1', name: 'G1', url: 'https://g1.globo.com/dynamo/economia/rss2.xml', category: 'Economia', status: 'active', imagePolicy: 'reference_only' },
    { id: 'camara', name: 'Agência Câmara', url: 'https://www.camara.leg.br/noticias/rss/dinamico/POLITICA', category: 'Política', status: 'active', imagePolicy: 'reference_only' }
  ];
  const database = JSON.stringify({ feeds, posts: [{ id: 'old', status: 'published', date: '2026-10-31T12:00:00Z', category: 'Economia', sourceUrl: 'https://g1.globo.com/economia/old' }], settings: {}, ads: [], deletedPostItems: [] });
  const xml = (title, link, text) => `<rss><channel><item><title><![CDATA[${title}]]></title><link>${link}</link><description><![CDATA[${text}]]></description></item></channel></rss>`;
  const requested = [];
  try {
    fs.writeFileSync(path.join(temporary, 'db.json'), database);
    process.chdir(temporary);
    Object.assign(process.env, { STATIC_PUBLISH_MODE: 'true', VERCEL: '1', RSS_ENABLE_AI_IMAGE_GENERATION: 'false', RSS_DEFAULT_IMAGE_POLICY: 'reference_only' });
    delete process.env.GEMINI_API_KEY;
    console.log('[TESTE SIMULADO] As respostas e falhas de feeds abaixo são fabricadas. Nenhuma notícia será salva.');
    globalThis.fetch = async input => {
      const url = String(input); requested.push(url);
      if (url.includes('g1.globo.com/dynamo')) return new Response(xml('Saque-aniversário FGTS novembro', 'https://g1.globo.com/economia/fgts', 'O calendário do FGTS informa as datas para consultar os pagamentos e os valores disponíveis.'));
      if (url.includes('camara.leg.br/noticias/rss')) return new Response(xml('Bolsa Família 2026: veja calendário de pagamentos em novembro', 'https://www.camara.leg.br/noticias/bolsa-familia', 'Baixe o app do g1 para ver notícias em tempo real e de graça A Caixa inicia os pagamentos em novembro. As contrapartidas do Bolsa Família incluem vacinação e frequência escolar.'));
      if (url.includes('agenciabrasil.ebc.com.br/rss')) return new Response('<rss><channel></channel></rss>');
      if (url.includes('senado.leg.br/noticias/RSS')) return new Response('Unavailable', { status: 503 });
      throw new Error(`Unexpected outbound request: ${url}`);
    };
    const { runRssCronOnce } = await import('../api/server.ts');
    const result = await runRssCronOnce({ dryRun: true, maxPosts: 1 });
    assert.equal(result.success, true);
    assert.equal(result.totalImported, 0);
    assert.equal(result.previewPost.title, 'Bolsa Família 2026: calendário de pagamentos em novembro');
    assert.equal(result.previewPost.category, 'Economia');
    assert.match(result.previewPost.content, /contrapartidas/);
    assert.doesNotMatch(result.previewPost.content, /FGTS|Baixe o app|tempo real/);
    assert.deepEqual(result.previewPost.sourceNames, ['Agência Câmara']);
    assert.equal(result.feedDiagnostics.length, 4);
    assert.equal(result.feedDiagnostics.find(f => f.feed.includes('Senado')).status, 'error');
    assert.equal(result.feedDiagnostics.find(f => f.feed.includes('Brasil')).status, 'empty');
    assert.equal(requested.length, 4);
    assert.equal(fs.readFileSync(path.join(temporary, 'db.json'), 'utf8'), database);
  } finally {
    globalThis.fetch = originalFetch;
    process.chdir(originalCwd);
    for (const [key, value] of Object.entries(previousEnv)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    try {
      fs.rmSync(temporary, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
    } catch (cleanupError) {
      if (process.platform !== 'win32' || !['EPERM', 'EBUSY'].includes(cleanupError.code)) throw cleanupError;
      console.warn(`[TESTE] O Windows manteve a pasta temporária em uso: ${temporary}`);
    }
  }
});
