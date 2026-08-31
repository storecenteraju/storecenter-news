import React, { useEffect, useState } from 'react';
import { ArrowLeft, Clock, Eye, User, Share2, MessageCircle, Facebook, Instagram, Tag, ChevronRight, Bookmark } from 'lucide-react';
import { Post, AdUnit, isPostUrgente, normalizePost, getCategoryFallbackImage, getPostTimestamp } from '../types';
import { G1AudioPlayer } from './G1AudioPlayer';
import AdSenseSlot from './AdSenseSlot';
import AdCashSlot from './AdCashSlot';
import EditorialImage from './EditorialImage';

interface PostDetailsProps {
  post: Post;
  posts: Post[];
  ads: AdUnit[];
  onBack: () => void;
  onPostClick: (post: Post) => void;
}

async function copyTextToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textArea = document.createElement('textarea');
  textArea.value = text;
  textArea.setAttribute('readonly', '');
  textArea.style.position = 'fixed';
  textArea.style.opacity = '0';
  document.body.appendChild(textArea);
  textArea.select();
  const copied = document.execCommand('copy');
  textArea.remove();
  if (!copied) throw new Error('Não foi possível copiar o link');
}

export default function PostDetails({
  post,
  posts,
  ads,
  onBack,
  onPostClick
}: PostDetailsProps) {
  const [shareLabel, setShareLabel] = useState('Compartilhar');

  // Increment views on mount
  useEffect(() => {
    fetch(`/api/posts/${post.id}/view`, { method: "POST" })
      .catch(err => console.error("Erro incrementando visualização:", err));
  }, [post.id]);

  const handleShare = async () => {
    const shareData = {
      title: post.seoTitle || post.title,
      text: post.subtitle,
      url: window.location.href
    };

    try {
      await copyTextToClipboard(shareData.url);
      setShareLabel('Link copiado!');
      window.setTimeout(() => setShareLabel('Compartilhar'), 2200);
      return;
    } catch {
      // On mobile browsers where clipboard is blocked, try the native share sheet.
      if (navigator.share) {
        try {
          await navigator.share(shareData);
          return;
        } catch (error) {
          if (error instanceof DOMException && error.name === 'AbortError') return;
        }
      }

      setShareLabel('Copie o link na barra de endereço');
      window.setTimeout(() => setShareLabel('Compartilhar'), 3000);
    }
  };

  const handleArticleLink = (event: React.MouseEvent<HTMLAnchorElement>, linkedPost: Post) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onPostClick(linkedPost);
  };

  const handleWhatsAppShare = () => {
    const message = `${post.title}\n${window.location.href}`;
    const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.assign(whatsappUrl);
      return;
    }
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  const handleFacebookShare = () => {
    const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`;
    window.open(facebookUrl, '_blank', 'noopener,noreferrer,width=700,height=600');
  };

  const handleInstagramShare = async () => {
    const shareData = {
      title: post.seoTitle || post.title,
      text: post.subtitle,
      url: window.location.href
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await copyTextToClipboard(shareData.url);
      setShareLabel('Link copiado para o Instagram!');
      window.setTimeout(() => setShareLabel('Compartilhar'), 3000);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setShareLabel('Copie o link para o Instagram');
      window.setTimeout(() => setShareLabel('Compartilhar'), 3000);
    }
  };

  // Local sliding window array to keep track of the last 3 rendered card images to prevent visual repeating in sequence
  const last3Images: string[] = [];

  const getCategoryFallback = (category?: string, seed?: string): string => {
    return getCategoryFallbackImage(category, seed);
  };

  const getDeduplicatedImage = (pItem: Post) => {
    const rawImage = String(pItem.image || '').trim();
    
    const isPlaceholderUrl = 
      !rawImage || 
      rawImage === 'null' || 
      rawImage === 'undefined' ||
      rawImage.includes('placeholder') || 
      rawImage.includes('test');

    let chosenUrl = '';

    if (!isPlaceholderUrl) {
      // Must NOT use fallback if the post has a valid own image!
      chosenUrl = rawImage;
    } else {
      chosenUrl = getCategoryFallbackImage(pItem.category, pItem.id || pItem.slug, new Set(last3Images));
    }

    // Keep sliding window of last 3 images
    last3Images.push(chosenUrl);
    if (last3Images.length > 3) {
      last3Images.shift();
    }

    return chosenUrl;
  };

  // Determine top Ad configurations
  const getAdBySlot = (slot: 'top' | 'middle' | 'bottom' | 'sidebar' | 'footer' | 'floating') => {
    return ads.find(a => a.slot === slot && a.enabled);
  };

  const adTop = getAdBySlot('top');
  const adMiddle = getAdBySlot('middle');
  const adBottom = getAdBySlot('bottom');
  const adSidebar = getAdBySlot('sidebar');
  const adFooter = getAdBySlot('footer');

  // "Destaque da semana" is an explicit editorial choice.
  const normalizedArticles = posts.map(normalizePost);
  const top5DestaquesDaSemana = normalizedArticles
    .filter(p => p.isDestaque === true && !p.isTestPost)
    .slice(0, 5);
  const isDestaqueDaSemana = top5DestaquesDaSemana.some(p => p.id === post.id);
  const isMaisLida = (post.views || 0) >= 500;

  // Filter published posts for popular list (excluding drafts, tests, and future published posts)
  const publishedPosts = normalizedArticles.filter(p => {
    if (p.status !== 'published' || p.isTestPost) return false;
    const nowTime = new Date().getTime();
    const ts = getPostTimestamp(p);
    if (ts > nowTime) return false; // Filter out future posts
    return true;
  });
  const top10PopularPosts = [...publishedPosts]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

  // Filter related posts (same category, excluding current, and skipping future published posts)
  const relatedPosts = normalizedArticles
    .filter(p => {
      if (p.category !== post.category || p.id === post.id || p.status !== 'published' || p.isTestPost) {
        return false;
      }
      const nowTime = new Date().getTime();
      const ts = getPostTimestamp(p);
      if (ts > nowTime) return false; // Filter out future related posts
      return true;
    })
    .slice(0, 3);

  const formatPublishDate = (dateStr?: string) => {
    if (!dateStr || dateStr.startsWith('1970-01-01')) {
      return 'Sem data';
    }
    let d = new Date();
    const parsed = new Date(dateStr);
    if (!isNaN(parsed.getTime())) {
      d = parsed;
    }
    const pad = (n: number) => String(n).padStart(2, '0');
    const day = pad(d.getDate());
    const month = pad(d.getMonth() + 1);
    const year = d.getFullYear();
    const hor = pad(d.getHours());
    const min = pad(d.getMinutes());
    return `${day}/${month}/${year} ${hor}:${min}`;
  };

  // Split content logically to inject "Ad Meio Artigo" between paragraph 2 and 3
  const paragraphs = (post.content || '').split('\n\n');
  const part1 = paragraphs.slice(0, 2).join('\n\n');
  const part2 = paragraphs.slice(2).join('\n\n');
  const sectionHeadings = new Set(["O que aconteceu", "O que já foi informado", "A pergunta que fica", "O que observar agora"]);
  const renderArticleParagraphs = (text: string) => text.split('\n\n').map((paragraph, index) => (
    sectionHeadings.has(paragraph.trim())
      ? <h2 key={index} className="text-lg font-black text-slate-950 mt-8 mb-2">{paragraph}</h2>
      : <p key={index} className="whitespace-pre-wrap">{paragraph}</p>
  ));

  const safeSourceUrl = /^https?:\/\//i.test(String(post.sourceUrl || '')) ? String(post.sourceUrl) : '';
  let sourceLabel = String(post.sourceName || '').trim();
  if (!sourceLabel && safeSourceUrl) {
    try {
      sourceLabel = new URL(safeSourceUrl).hostname.replace(/^www\./, '');
    } catch {
      sourceLabel = 'publicação original';
    }
  }

  return (
    <div className="bg-slate-50 min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4">
        
        {/* BREADCRUMBS BAR */}
        <div className="flex items-center justify-between text-xs text-slate-500 mb-6 bg-white border border-slate-200 py-3.5 px-4 rounded-xl shadow-sm">
          <div className="flex items-center gap-2 overflow-hidden text-ellipsis">
            <button 
              onClick={onBack}
              className="hover:text-blue-600 hover:underline cursor-pointer flex items-center gap-1 font-bold shrink-0 uppercase"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Voltar
            </button>
            <span className="text-slate-300 font-normal shrink-0">&bull;</span>
            <span className="text-blue-600 font-extrabold uppercase shrink-0 select-none tracking-wide">{post.category}</span>
            <span className="text-slate-300 font-normal shrink-0">&bull;</span>
            <span className="text-slate-400 font-medium truncate max-w-[200px] md:max-w-md select-none">{post.title}</span>
          </div>
        </div>

        {/* TOP AD BANNER CONTAINER - SUPERIOR DESTAQUE NO ARTIGO */}
        {adTop && (
          <div className="mb-4 md:mb-6 max-w-7xl mx-auto flex justify-center w-full overflow-hidden">
            <AdSenseSlot code={adTop.code} minHeight="90px" />
          </div>
        )}

        <div className="mb-6 rounded-xl bg-blue-600 px-6 py-5 text-center shadow-sm">
          <h1 className="text-2xl md:text-3xl font-black uppercase tracking-wide text-white">
            {post.category}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* ARTICLE MAIN AREA */}
          <div className="lg:col-span-3">
            <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-sm leading-relaxed">
              
               {/* PRIMARY HEADER INFOGRAPH */}
              <header className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  {/* Selos acima do título da matéria */}
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded shadow-sm inline-block mr-1">
                      {post.category}
                    </span>
                    {isPostUrgente(post) && (
                      <span className="bg-red-650 border border-red-700 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded inline-flex items-center gap-1.5 select-none shadow-sm animate-pulse" title="Notícias quentes das últimas horas">
                        🚨 URGENTE <span className="text-[9.5px] font-medium lowercase font-sans opacity-95">(notícias quentes das últimas horas)</span>
                      </span>
                    )}
                    {isMaisLida && (
                      <span className="bg-red-750 border border-red-805 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded inline-flex items-center gap-1.5 select-none shadow-sm" title="Mais de 500 visualizações">
                        🔥 MAIS LIDA <span className="text-[9.5px] font-medium lowercase font-sans opacity-95">(500+ visualizações)</span>
                      </span>
                    )}
                    {isDestaqueDaSemana && (
                      <span className="bg-amber-500 border border-amber-600 text-slate-900 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded inline-flex items-center gap-1.5 select-none shadow-sm" title="Seleção editorial">
                        ⭐ DESTAQUE DA SEMANA <span className="text-[9.5px] font-semibold lowercase font-sans opacity-90">(seleção editorial)</span>
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors" title="Favoritar">
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleShare}
                      className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors"
                      title={shareLabel}
                      aria-label={shareLabel}
                    >
                      <Share2 className="w-4 h-4" />
                      {shareLabel !== 'Compartilhar' && (
                        <span className="ml-1 text-[9px] font-bold uppercase tracking-wide">{shareLabel}</span>
                      )}
                    </button>
                    <button
                      onClick={handleWhatsAppShare}
                      className="text-emerald-600 hover:text-emerald-700 p-1.5 rounded-full hover:bg-emerald-50 transition-colors"
                      title="Compartilhar no WhatsApp"
                      aria-label="Compartilhar no WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleFacebookShare}
                      className="text-blue-700 hover:text-blue-800 p-1.5 rounded-full hover:bg-blue-50 transition-colors"
                      title="Compartilhar no Facebook"
                      aria-label="Compartilhar no Facebook"
                    >
                      <Facebook className="w-4 h-4" />
                    </button>
                    <button
                      onClick={handleInstagramShare}
                      className="text-pink-600 hover:text-pink-700 p-1.5 rounded-full hover:bg-pink-50 transition-colors"
                      title="Compartilhar no Instagram"
                      aria-label="Compartilhar no Instagram"
                    >
                      <Instagram className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <h1 className="text-2xl md:text-4xl font-black font-display text-slate-950 tracking-tight leading-tight">
                  {post.title}
                </h1>

                <p className="text-slate-600 text-sm md:text-base leading-relaxed border-l-2 border-emerald-500 pl-4 py-1 italic font-medium">
                  {post.subtitle}
                </p>

                <div className="border-t border-b border-slate-100 py-4 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-700 border border-slate-300 select-none uppercase">
                      {post.author[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">Por {post.author}</p>
                      <p className="text-[10px] text-slate-400">Redação Store Center</p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:items-end text-right gap-1 font-medium">
                    <p className="uppercase text-[10px] tracking-wider text-slate-400">Conteúdo editorial</p>
                    <p className="text-slate-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatPublishDate(post.date)}</p>
                  </div>
                </div>
              </header>

              {/* G1 STYLE TTS AUDIO PLAYER */}
              <div className="mb-8">
                <G1AudioPlayer post={post} />
              </div>

              {/* OUTWARD BANNER IMAGE */}
              <figure className="mb-8">
                <EditorialImage
                  src={getDeduplicatedImage(post)}
                  fallbackSrc={getCategoryFallback(post.category, post.id || post.slug)}
                  alt={post.title}
                  className="aspect-video rounded-xl max-h-[460px] border border-slate-100 shadow-inner"
                />
                {post.imageCredit && (
                  <figcaption className="mt-2 text-[10px] leading-relaxed text-slate-500">
                    {post.imageCredit}{post.imageLicense ? ` • ${post.imageLicense}` : ''}
                  </figcaption>
                )}
              </figure>

              {/* ARTICLE PARAGRAPH BLOCK 1 */}
              <div className="prose prose-slate max-w-none text-slate-800 text-[15px] space-y-6 leading-relaxed">
                {renderArticleParagraphs(part1)}
              </div>

              {/* MIDDLE AD BLOCK (IF ACTIVE) */}
              {adMiddle && (
                <div className="my-6 md:my-10 w-full flex justify-center overflow-hidden">
                  <AdSenseSlot code={adMiddle.code} minHeight="90px" />
                </div>
              )}

              {/* ARTICLE PARAGRAPH BLOCK 2 */}
              <div className="prose prose-slate max-w-none text-slate-800 text-[15px] space-y-6 leading-relaxed mt-6">
                {renderArticleParagraphs(part2)}
              </div>

              {safeSourceUrl && (
                <aside className="mt-8 rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-sm text-slate-700">
                  <p className="font-bold text-slate-900">Transparência editorial</p>
                  <p className="mt-1 leading-relaxed">
                    Esta matéria foi produzida a partir de informações distribuídas por{' '}
                    <a
                      href={safeSourceUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="font-bold text-blue-700 underline hover:text-blue-900"
                    >
                      {sourceLabel || 'a fonte original'}
                    </a>.
                  </p>
                </aside>
              )}

              {/* EXPLICIT METRICS */}
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 mt-10 pt-6">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tags da Notícia:</span>
                {post.tags.map(tg => (
                  <span 
                    key={tg}
                    className="flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1.5 uppercase rounded-full hover:bg-slate-200 transition-colors select-none"
                  >
                    <Tag className="w-2.5 h-2.5" /> #{tg}
                  </span>
                ))}
              </div>

              {/* BOTTOM AD BLOCK (IF ACTIVE) */}
              {adBottom && (
                <div className="mt-6 mb-2 md:mt-10 w-full flex justify-center overflow-hidden">
                  <AdSenseSlot code={adBottom.code} minHeight="90px" />
                </div>
              )}

              {/* ACTION BACK BUTTON AT THE END OF THE CORE ARTICLE */}
              <div className="mt-12 pt-6 border-t border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4 select-none">
                <div className="text-left w-full sm:w-auto">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-0.5">Fim da Matéria</span>
                  <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm">Você terminou de ler o artigo. Use o botão ao lado para retornar ao portal de notícias principais.</p>
                </div>
                <button
                  onClick={onBack}
                  className="w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 select-none cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" /> Voltar para Notícias
                </button>
              </div>

            </article>

            {/* RELATED SAME-CATEGORY POSTS BLOCKS */}
            {relatedPosts.length > 0 && (
              <div className="mt-12 space-y-6">
                <div className="border-b border-slate-200 pb-2">
                  <h3 className="text-base font-black font-display text-slate-900 border-l-4 border-blue-600 pl-3 uppercase tracking-tight">
                    Notícias Relacionadas em {post.category}
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {relatedPosts.map(rel => (
                    <a
                      key={rel.id}
                      href={`/noticia/${encodeURIComponent(rel.slug)}`}
                      onClick={(event) => handleArticleLink(event, rel)}
                      className="group bg-white border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer h-full"
                    >
                      <EditorialImage
                        src={getDeduplicatedImage(rel)}
                        fallbackSrc={getCategoryFallback(rel.category, rel.id || rel.slug)}
                        alt={rel.title}
                        className="h-32"
                        foregroundClassName="group-hover:scale-105 transition-transform duration-500"
                      />
                      
                      <div className="p-4 flex-grow flex flex-col justify-between">
                        <div>
                          {/* Selos acima do título da matéria */}
                          <div className="flex flex-wrap gap-1 mb-2">
                            {isPostUrgente(rel) && (
                              <span className="bg-red-650 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none flex items-center gap-0.5 select-none animate-pulse" title="Notícias quentes das últimas horas">
                                🚨 URGENTE <span className="text-[7.5px] font-normal lowercase font-sans opacity-90 hidden sm:inline-block">(notícias quentes)</span>
                              </span>
                            )}
                            {(rel.views || 0) >= 500 && (
                              <span className="bg-red-750 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none flex items-center gap-0.5 select-none shadow-sm" title="Mais de 500 visualizações">
                                🔥 MAIS LIDA <span className="text-[7.5px] font-normal lowercase font-sans opacity-95 hidden sm:inline-block">(500+ views)</span>
                              </span>
                            )}
                            {top5DestaquesDaSemana.some(p => p.id === rel.id) && (
                              <span className="bg-amber-500 text-slate-900 text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded leading-none flex items-center gap-0.5 select-none shadow-sm" title="Seleção editorial">
                                ⭐ DESTAQUE <span className="text-[7.5px] font-semibold lowercase font-sans opacity-90 hidden sm:inline-block">(editorial)</span>
                              </span>
                            )}
                          </div>
                          
                          <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-blue-600 group-hover:underline transition-all line-clamp-2 mb-2">
                            {rel.title}
                          </h4>
                        </div>
                        <span className="text-[9px] text-slate-400 mt-2 block select-none">
                          {formatPublishDate(rel.date)}
                        </span>
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* ACTION BACK BUTTON AT THE VERY END OF ARTICLES LIST (FOOTER ACCESSIBILITY) */}
            <div className="mt-10 mb-2 p-6 bg-slate-50 border border-slate-200/60 rounded-2xl flex flex-col md:flex-row items-center justify-between gap-4 select-none">
              <div className="text-center md:text-left">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-widest block mb-1">Gostou deste conteúdo?</span>
                <p className="text-xs text-slate-500 leading-normal max-w-md">Continue lendo outras notícias em tempo real sobre agro, economia, política e esportes no nosso feed principal.</p>
              </div>
              <button
                onClick={onBack}
                className="w-full md:w-auto shrink-0 flex items-center justify-center gap-2 px-8 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider rounded-xl transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 select-none cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Voltar para Notícias
              </button>
            </div>

          </div>

          {/* COLUMN 4: RIGHT-SIDEBAR FOR ADS & STATS */}
          <div className="lg:col-span-1 space-y-8">
            
            {/* BACK ACTION CARD BUTTON */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-3">
              <strong className="text-slate-900 block font-display text-sm tracking-tight border-b border-slate-100 pb-2">Leitor Store Center</strong>
              <p className="text-[11px] text-slate-500 leading-normal">
                Você está lendo um artigo exclusivo gerado para o portal de notícias. Retorne ao feed principal clicando no botão abaixo.
              </p>
              <button 
                onClick={onBack}
                className="w-full py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[11px] uppercase tracking-wider transition-colors cursor-pointer block text-center"
              >
                Voltar para Notícias
              </button>
            </div>

            {/* ADSENSE SIDEBAR BANNER CARD */}
            {adSidebar && (
              <div className="w-full bg-white border border-slate-200 p-4 rounded-xl flex justify-center items-center overflow-hidden">
                <AdSenseSlot code={adSidebar.code} minHeight="250px" />
              </div>
            )}

            {/* ESPAÇO ADICIONAL RESERVADO AO AUTO-TAG DO ADCASH */}
            <AdCashSlot />

            {/* CLICKS COUNTER FOR CURRENT READING METRIC */}
            {(post.views || 0) >= 150 && (
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-slate-300 space-y-1.5 text-xs">
                <div className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" /> Painel de Analytics Ativo
                </div>
                <p className="text-[10px] text-slate-300">Esta matéria já ultrapassou 150 leituras e está entre os conteúdos mais acessados do portal.</p>
                <p className="text-[10px] text-slate-500 font-mono">
                  ({(post.views || 0) + 1} visualizações computadas)
                </p>
              </div>
            )}

            {/* AS MAIS LIDAS INDEX */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
              <h3 className="text-sm font-black font-display text-slate-950 border-l-4 border-red-600 pl-3 uppercase tracking-tight flex items-center gap-1.5">
                🔥 MAIS LIDAS DA SEMANA
              </h3>
              <div className="divide-y divide-slate-100">
                {top10PopularPosts.map((pop, idx) => (
                  <a
                    key={pop.id}
                    href={`/noticia/${encodeURIComponent(pop.slug)}`}
                    onClick={(event) => handleArticleLink(event, pop)}
                    className="py-3 flex gap-3 cursor-pointer select-none group"
                  >
                    <div className="text-xl font-black font-display text-slate-300 font-bold w-6 flex-shrink-0 text-right group-hover:text-blue-500 transition-colors">
                      {idx + 1 < 10 ? `0${idx + 1}` : idx + 1}
                    </div>
                    <div>
                      <span className="text-[9px] font-bold text-blue-600 uppercase tracking-widest mb-0.5 block">
                        {pop.category}
                      </span>
                      <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-blue-600 group-hover:underline transition-all line-clamp-2">
                        {pop.title}
                      </h4>
                    </div>
                  </a>
                ))}
              </div>
            </div>

          </div>

        </div>

        {/* BOTTOM ADSENSE BANNER CONTAINER - RODAPÉ DESTAQUE NO ARTIGO */}
        {adFooter && (
          <div className="mt-6 md:mt-12 max-w-7xl mx-auto flex justify-center w-full overflow-hidden">
            <AdSenseSlot code={adFooter.code} minHeight="90px" />
          </div>
        )}

      </div>
    </div>
  );
}

