import React from 'react';
import { Newspaper, Clock, Eye, TrendingUp, Tag, ArrowRight, User, HelpCircle, AlertCircle, Sparkles } from 'lucide-react';
import { Post, CategoryType, AdUnit, getEditorialScore, isPostUrgente, normalizePost, getCategoryFallbackImage, getPostTimestamp } from '../types';
import AdSenseSlot from './AdSenseSlot';
import EditorialImage from './EditorialImage';

interface PortalHomeProps {
  posts: Post[];
  ads: AdUnit[];
  selectedCategory: CategoryType | 'Home';
  searchQuery: string;
  onPostClick: (post: Post) => void;
  siteSettings: any;
  onCategorySelect?: (cat: CategoryType | 'Home') => void;
  onAdminClick?: () => void;
  onSearchChange?: (val: string) => void;
}

export default function PortalHome({
  posts,
  ads,
  selectedCategory,
  searchQuery,
  onPostClick,
  siteSettings,
  onCategorySelect,
  onAdminClick,
  onSearchChange
}: PortalHomeProps) {
  
  // Local sliding window array to keep track of the last 3 rendered card images to prevent visual repeating in sequence
  const last3Images: string[] = [];

  const getCategoryFallback = (category?: string, seed?: string): string => {
    return getCategoryFallbackImage(category, seed);
  };

  const getDeduplicatedImage = (post: Post) => {
    const rawImage = String(post.image || '').trim();
    
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
      chosenUrl = getCategoryFallbackImage(post.category, post.id || post.slug, new Set(last3Images));
    }

    // Keep sliding window of last 3 images
    last3Images.push(chosenUrl);
    if (last3Images.length > 3) {
      last3Images.shift();
    }

    return chosenUrl;
  };

  // 1. Filter posts that are marked published, are not test posts, and are not scheduled/published in the future
  const publishedPosts = posts
    .map(normalizePost)
    .filter(p => {
      if (p.status !== 'published' || p.isTestPost) return false;
      const nowTime = new Date().getTime();
      const ts = getPostTimestamp(p);
      if (ts > nowTime) return false; // Filter out future posts
      return true;
    })
    .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a));

  // 2. Filter by Search Query
  const searchQueryMatched = publishedPosts.filter(p => {
    if (!searchQuery) return true;
    const txt = (p.title + ' ' + p.subtitle + ' ' + (p.content || '') + ' ' + p.category).toLowerCase();
    return txt.includes(searchQuery.toLowerCase());
  });

  // 3. Filter by Category
  const finalFilteredPosts = searchQueryMatched.filter(p => {
    if (selectedCategory === 'Home') return true;
    return p.category === selectedCategory;
  });

  // Determine top Ad configurations
  const getAdBySlot = (slot: 'top' | 'middle' | 'bottom' | 'sidebar' | 'footer' | 'floating') => {
    return ads.find(a => a.slot === slot && a.enabled);
  };

  const adTop = getAdBySlot('top');
  const adSidebar = getAdBySlot('sidebar');
  const adFooter = getAdBySlot('footer');

  // Calculate top 5 most high-scoring editorial of last 7 days (Destaques da Semana)
  const last7DaysPosts = publishedPosts.filter(p => {
    if (!p.date) return false;
    const postTime = new Date(p.date).getTime();
    const nowTime = new Date().getTime();
    return (nowTime - postTime) <= 7 * 24 * 60 * 60 * 1000;
  });
  const top5DestaquesDaSemana = [...last7DaysPosts]
    .sort((a, b) => getEditorialScore(b) - getEditorialScore(a))
    .slice(0, 5);
  const top5DestaquesDaSemanaIds = new Set(top5DestaquesDaSemana.map(p => p.id));

  // Top 10 most viewed posts of the portal (🔥 MAIS LIDAS DA SEMANA)
  const top10PopularPosts = [...publishedPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);

  // Home Page layout: strict chronological order
  // Newest post is the hero. Next posts stay in date order.
  const featurePost = selectedCategory === 'Home' ? finalFilteredPosts[0] : finalFilteredPosts[0];
  const secondaryPosts = selectedCategory === 'Home' ? finalFilteredPosts.slice(1, 7) : finalFilteredPosts.slice(1, 7);
  const remainingPosts = selectedCategory === 'Home' ? finalFilteredPosts.slice(7) : finalFilteredPosts.slice(7);

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

  return (
    <div className="bg-slate-50 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-4 md:py-10">
        
        {/* TOP AD BANNER CONTAINER - SUPERIOR DESTAQUE */}
        {adTop && (
          <div className="mb-4 md:mb-8 max-w-7xl mx-auto flex justify-center w-full overflow-hidden">
            <AdSenseSlot code={adTop.code} minHeight="90px" />
          </div>
        )}

        {/* CATEGORY HEADER BANNER (IF FILTER APPLIED) */}
        {selectedCategory !== 'Home' && (
          <div className="bg-white border border-slate-200 p-6 rounded-lg mb-6 md:mb-8 shadow-sm">
            <div className="flex items-center gap-1 text-xs text-slate-400 uppercase tracking-widest mb-1">
              <span>Home</span>
              <span>&rsaquo;</span>
              <span className="text-blue-600 font-bold">{selectedCategory}</span>
            </div>
            <h1 className="text-3xl font-extrabold font-display tracking-tight text-slate-950 uppercase border-b-2 border-primary pb-2 flex items-center justify-between">
              {selectedCategory}
              <span className="text-xs font-normal text-slate-400 uppercase lowercase">
                {finalFilteredPosts.length} {finalFilteredPosts.length === 1 ? 'notícia encontrada' : 'notícias encontradas'}
              </span>
            </h1>
            <p className="text-xs text-slate-500 mt-2 font-medium leading-relaxed">
              Cobertura jornalística especializada do portal Store Center focada na cobertura do setor de <span className="lowercase font-bold text-slate-900">{selectedCategory}</span>.
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {finalFilteredPosts.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-sm max-w-2xl mx-auto my-6 md:my-12">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <span className="font-bold text-slate-800 text-lg block mb-1">Nenhuma notícia disponível</span>
            <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
              Nenhuma notícia disponível no momento.
            </p>
          </div>
        )}

        {finalFilteredPosts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 md:gap-8">
            
            {/* COLUMN 1-3: NEWS STREAM GRID */}
            <div className="lg:col-span-3 space-y-6 md:space-y-12">
              
              {/* FEATURED NEWS BLOCK (HERO SPOTLIGHT) */}
              {selectedCategory === 'Home' && featurePost && (
                <section 
                  onClick={() => onPostClick(featurePost)}
                  className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row cursor-pointer"
                >
                  <EditorialImage
                    src={getDeduplicatedImage(featurePost)}
                    fallbackSrc={getCategoryFallback(featurePost.category, featurePost.id || featurePost.slug)}
                    alt={featurePost.title}
                    className="md:w-3/5 aspect-video md:h-auto"
                    foregroundClassName="p-2 transition-transform duration-500"
                  >
                    <span className="absolute z-20 top-4 left-4 bg-blue-600 text-white text-[10px] font-extrabold font-display px-3 py-1.5 uppercase tracking-widest rounded shadow-sm">
                      {featurePost.category}
                    </span>
                  </EditorialImage>
                  
                  <div className="md:w-2/5 p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      {/* Selos acima do título da matéria */}
                      <div className="flex flex-wrap gap-2 mb-3.5">
                        {isPostUrgente(featurePost) && (
                          <span className="bg-red-650 border border-red-700 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded inline-flex items-center gap-1.5 select-none shadow-sm animate-pulse" title="Notícias quentes das últimas horas">
                            🚨 URGENTE <span className="text-[9.5px] font-medium lowercase font-sans opacity-90">(notícias quentes das últimas horas)</span>
                          </span>
                        )}
                        {(featurePost.views || 0) >= 500 && (
                          <span className="bg-red-750 border border-red-805 text-white text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded inline-flex items-center gap-1.5 select-none shadow-sm" title="Mais de 500 visualizações">
                            🔥 MAIS LIDA <span className="text-[9.5px] font-medium lowercase font-sans opacity-95">(500+ visualizações)</span>
                          </span>
                        )}
                        {top5DestaquesDaSemanaIds.has(featurePost.id) && (
                          <span className="bg-amber-500 border border-amber-600 text-slate-900 text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded inline-flex items-center gap-1.5 select-none shadow-sm" title="Seleção editorial">
                            ⭐ DESTAQUE DA SEMANA <span className="text-[9.5px] font-semibold lowercase font-sans opacity-90">(seleção editorial)</span>
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl md:text-2xl font-black font-display text-slate-900 leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                        {featurePost.title}
                      </h2>
                      
                      <p className="text-slate-600 text-xs leading-relaxed mb-6 font-medium line-clamp-4">
                        {featurePost.subtitle}
                      </p>

                      {/* Autor e data separados e colocados embaixo */}
                      <div className="flex flex-wrap items-center gap-2.5 text-[10px] font-extrabold text-slate-400 uppercase tracking-widest pt-3 border-t border-slate-100 select-none">
                        <span className="flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-blue-500" /> {featurePost.author}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> {formatPublishDate(featurePost.date)}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4 mt-4">
                      <span className="text-[10px] font-bold text-primary hover:text-blue-700 uppercase tracking-wider flex items-center gap-1.5">
                        Ler Matéria Completa <ArrowRight className="w-3 h-3 transition-transform group-hover:translate-x-1" />
                      </span>
                      {(featurePost.views || 0) >= 150 && (
                        <span className="flex items-center gap-1 text-[10px] font-semibold text-slate-400">
                          <Eye className="w-3.5 h-3.5" /> {(featurePost.views || 0)} lidas
                        </span>
                      )}
                    </div>
                  </div>
                </section>
              )}

              {/* IN-FEED ADSENSE SPONSOR CORNER (MEIO DO PORTAL) */}
              {getAdBySlot('middle') && (
                <div className="my-4 md:my-8 w-full flex justify-center overflow-hidden">
                  <AdSenseSlot code={getAdBySlot('middle')?.code} minHeight="100px" />
                </div>
              )}

              {/* RECENT FEED GRID (2 COLUMNS) */}
              <section className="space-y-6">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <h3 className="text-base font-extrabold font-display text-slate-950 border-l-4 border-blue-600 pl-3 uppercase tracking-tight">
                    {selectedCategory === 'Home' ? 'Cobetura Recente' : `Coletânea em ${selectedCategory}`}
                  </h3>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atualizações em tempo real</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* If filter category, present even the first post as detailed card index */}
                  {(selectedCategory !== 'Home' ? finalFilteredPosts : secondaryPosts).map((post) => (
                    <div 
                      key={post.id}
                      onClick={() => onPostClick(post)}
                      className="group bg-white border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer h-full"
                    >
                      <div>
                        <EditorialImage
                          src={getDeduplicatedImage(post)}
                          fallbackSrc={getCategoryFallback(post.category, post.id || post.slug)}
                          alt={post.title}
                          className="aspect-video"
                          foregroundClassName="group-hover:scale-105 transition-transform duration-500"
                        >
                          {(selectedCategory === 'Home' || !selectedCategory) && (
                            <span className="absolute top-3 left-3 bg-slate-950 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded">
                              {post.category}
                            </span>
                          )}
                        </EditorialImage>

                        <div className="p-5 flex flex-col">
                          {/* Selos acima do título da matéria */}
                          <div className="flex flex-wrap gap-1 mb-2.5">
                            {isPostUrgente(post) && (
                              <span className="bg-red-650 text-white text-[8.5px] font-black uppercase tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 select-none shadow-sm animate-pulse" title="Notícias quentes das últimas horas">
                                🚨 URGENTE <span className="text-[7.5px] font-normal lowercase font-sans opacity-90 hidden sm:inline-block">(notícias quentes das últimas horas)</span>
                              </span>
                            )}
                            {(post.views || 0) >= 500 && (
                              <span className="bg-red-750 text-white text-[8.5px] font-black uppercase tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 select-none shadow-sm" title="Mais de 500 visualizações">
                                🔥 MAIS LIDA <span className="text-[7.5px] font-normal lowercase font-sans opacity-95 hidden sm:inline-block">(500+ visualizações)</span>
                              </span>
                            )}
                            {top5DestaquesDaSemanaIds.has(post.id) && (
                              <span className="bg-amber-500 text-slate-900 text-[8.5px] font-black uppercase tracking-wider px-2 py-1 rounded inline-flex items-center gap-1 select-none shadow-sm" title="Seleção editorial">
                                ⭐ DESTAQUE DA SEMANA <span className="text-[7.5px] font-medium lowercase font-sans opacity-90 hidden sm:inline-block">(seleção editorial)</span>
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-black font-display text-slate-900 leading-snug hover:text-blue-600 transition-colors line-clamp-2 md:line-clamp-3 mb-2">
                            {post.title}
                          </h4>

                          <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2 mb-3">
                            {post.subtitle}
                          </p>

                          {/* Metadata de autor e data separada dos selos */}
                          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest pt-2.5 border-t border-slate-100/60 select-none">
                            <span>{post.author}</span>
                            <span>&bull;</span>
                            <span>{formatPublishDate(post.date)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-3 flex items-center justify-between mt-auto">
                        <span className="text-[10px] font-bold text-blue-600 group-hover:text-blue-700 uppercase tracking-wider flex items-center gap-1.5 min-w-[12px]">
                          Página de Leitura &rsaquo;
                        </span>
                        {(post.views || 0) >= 150 && (
                          <span className="flex items-center gap-1 text-[9px] font-semibold text-slate-400">
                            <Eye className="w-3 h-3" /> {(post.views || 0)} lidas
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* CATEGORICAL SECTIONS (IF HOMEPAGE AND MULTIPLE EXISTS) */}
              {selectedCategory === 'Home' && remainingPosts.length > 0 && (
                <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
                  <h3 className="text-sm font-black font-display text-slate-950 uppercase tracking-tight border-b border-slate-100 pb-3 mb-4">
                    Mais Notícias Publicadas
                  </h3>
                  <div className="divide-y divide-slate-100">
                    {remainingPosts.map((post) => (
                      <div 
                        key={post.id}
                        onClick={() => onPostClick(post)}
                        className="py-4 flex gap-4 cursor-pointer hover:bg-slate-50 transition-colors rounded p-2"
                      >
                        <img 
                          src={getDeduplicatedImage(post)} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          onError={(e) => { e.currentTarget.src = getCategoryFallback(post.category, post.id || post.slug); }}
                          className="w-16 h-16 object-cover rounded flex-shrink-0"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-1 mb-1">
                            <span className="text-[9px] font-bold text-blue-600 tracking-wider uppercase mr-1">{post.category}</span>
                            {isPostUrgente(post) && (
                              <span className="text-[8px] font-black text-red-600 uppercase flex items-center gap-0.5" title="🚨 URGENTE (notícias quentes das últimas horas)">
                                🚨 URGENTE <span className="text-[7px] font-normal lowercase font-sans opacity-80">(quentes)</span>
                              </span>
                            )}
                            {(post.views || 0) >= 500 && (
                              <span className="text-[8px] font-black text-red-700 uppercase flex items-center gap-0.5" title="🔥 MAIS LIDA (500+ visualizações)">
                                🔥 MAIS LIDA <span className="text-[7px] font-normal lowercase font-sans opacity-80">(500+ views)</span>
                              </span>
                            )}
                            {top5DestaquesDaSemanaIds.has(post.id) && (
                              <span className="text-[8px] font-black text-amber-600 uppercase flex items-center gap-0.5" title="⭐ DESTAQUE DA SEMANA (seleção editorial)">
                                ⭐ DESTAQUE <span className="text-[7px] font-normal lowercase font-sans opacity-80">(editorial)</span>
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-black font-display text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 leading-snug">{post.title}</h4>
                          <p className="text-slate-500 text-[10px] line-clamp-2 mt-0.5 leading-relaxed">{post.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>

            {/* COLUMN 4: RIGHT EDITORIAL SIDEBAR */}
            <div className="lg:col-span-1 space-y-6 md:space-y-8">
              
              {/* SEARCH CARD IN SIDEBAR (Desktop / Sidebar search) */}
              {onSearchChange && (
                <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-3 animate-in fade-in duration-200">
                  <h3 className="text-xs font-black font-display text-slate-950 uppercase tracking-widest border-l-4 border-blue-600 pl-3">
                    Pesquisar Notícias
                  </h3>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Buscar no portal..."
                      value={searchQuery}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="bg-slate-50 hover:bg-slate-100 focus:bg-white text-xs px-9 py-2.5 rounded-lg border border-slate-200 focus:border-blue-500 focus:outline-none placeholder-slate-400 w-full transition-all text-slate-900"
                    />
                    <svg className="absolute left-3 top-3.5 text-slate-400 w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              )}

              {/* AS MAIS LIDAS INDEX (Sempre Visível no Desktop/Mobile abaixo da Busca) */}
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <h3 className="text-xs font-black font-display text-slate-950 border-l-4 border-red-600 pl-3 uppercase tracking-widest flex items-center gap-1.5">
                  🔥 MAIS LIDAS DA SEMANA
                </h3>
                <div className="divide-y divide-slate-100">
                  {top10PopularPosts.map((pop, idx) => (
                    <div 
                      key={pop.id}
                      onClick={() => onPostClick(pop)}
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
                    </div>
                  ))}
                </div>
              </div>

              {/* ADSENSE SIDEBAR BANNER CARD */}
              {adSidebar && (
                <div className="w-full bg-white border border-slate-200 p-4 rounded-xl flex justify-center items-center overflow-hidden">
                  <AdSenseSlot code={adSidebar.code} minHeight="250px" />
                </div>
              )}

              {/* INSTITUTIONAL SIDE DESK */}
              <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-slate-400 text-[11px] leading-relaxed space-y-2.5">
                <strong className="text-slate-200 block mb-1 uppercase tracking-wide">Sobre o Store Center</strong>
                <p>O Store Center é um portal de notícias com conteúdo e informação. Nosso objetivo é oferecer informações de qualidade sobre economia, negócios, tecnologia, política, investimentos e temas de interesse nacional, sempre com foco na clareza, agilidade e confiabilidade das informações.</p>
                <p>Voltado para empreendedores, investidores, profissionais de tecnologia, estudantes e leitores em geral, o Store Center News busca tornar o acesso ao conhecimento mais simples, moderno e acessível, combinando inovação tecnológica com conteúdo de valor para seus leitores.</p>
              </div>

            </div>

          </div>
        )}

        {/* BOTTOM ADSENSE BANNER CONTAINER - RODAPÉ DESTAQUE */}
        {adFooter && (
          <div className="mt-6 md:mt-12 max-w-7xl mx-auto flex justify-center w-full overflow-hidden">
            <AdSenseSlot code={adFooter.code} minHeight="90px" />
          </div>
        )}

      </main>

      {/* PORTAL FOOTER */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-10 md:mt-20 py-8 md:py-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              {/* LOGO DE ALTA FIDELIDADE ATUALIZADO V2 - FORCE REBUILD */}
              <svg viewBox="0 0 120 100" className="w-8 h-8 shrink-0" data-logo-version="2.0.1" xmlns="http://www.w3.org/2000/svg">
                <defs>
                  <filter id="shadowFooter" x="-10%" y="-10%" width="130%" height="130%">
                    <feDropShadow dx="1.5" dy="2" stdDeviation="2" floodColor="#001a4d" floodOpacity="0.32" />
                  </filter>
                  <filter id="glowFooter" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0055ff" floodOpacity="0.4" />
                  </filter>
                  <linearGradient id="bubbleGradFooter" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb" />
                    <stop offset="40%" stopColor="#1d4ed8" />
                    <stop offset="100%" stopColor="#1e3a8a" />
                  </linearGradient>
                  <linearGradient id="paperGradFooter" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#f8fafc" />
                  </linearGradient>
                </defs>
                
                <g filter="url(#shadowFooter)">
                  <rect x="36" y="8" width="68" height="76" rx="10" fill="url(#paperGradFooter)" stroke="#1e40af" strokeWidth="4" strokeLinejoin="round" />
                  <rect x="42" y="14" width="56" height="64" rx="6" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.3" />
                  <rect x="48" y="20" width="22" height="22" rx="4" fill="#1d4ed8" />
                  <path d="M 48 36 L 56 28 L 62 34 L 66 30 L 70 36 Z" fill="#3b82f6" opacity="0.8" />
                  <rect x="76" y="21" width="16" height="3" rx="1.5" fill="#1e3a8a" opacity="0.85" />
                  <rect x="76" y="28" width="16" height="3" rx="1.5" fill="#1e3a8a" opacity="0.85" />
                  <rect x="76" y="35" width="16" height="3" rx="1.5" fill="#1e3a8a" opacity="0.85" />
                  <rect x="76" y="42" width="12" height="3" rx="1.5" fill="#1e3a8a" opacity="0.5" />
                  <rect x="48" y="50" width="44" height="3" rx="1.5" fill="#1e3a8a" opacity="0.8" />
                  <rect x="48" y="57" width="44" height="3" rx="1.5" fill="#1e3a8a" opacity="0.8" />
                  <rect x="48" y="64" width="44" height="3" rx="1.5" fill="#1e3a8a" opacity="0.8" />
                  <rect x="48" y="71" width="30" height="3" rx="1.5" fill="#1e3a8a" opacity="0.6" />
                </g>
                
                <g filter="url(#glowFooter)">
                  <path d="M 12 40 h 68 a 10 10 0 0 1 10 10 v 22 a 10 10 0 0 1 -10 10 H 66 l -12 12 v -12 H 22 a 10 10 0 0 1 -10 -10 v -22 a 10 10 0 0 1 10 -10 z" fill="url(#bubbleGradFooter)" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
                  <path d="M 14 42 h 64 a 8 8 0 0 1 8 8 v 3" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
                  <text x="46" y="66" fontFamily="sans-serif" fontWeight="900" fontStyle="italic" fontSize="19.5" fill="#ffffff" textAnchor="middle" letterSpacing="-0.5">NEWS</text>
                </g>
              </svg>
              <span className="text-base font-extrabold font-display text-white tracking-widest uppercase">STORECENTER</span>
            </div>
            <p className="leading-relaxed">{siteSettings?.siteDescription || 'Líder regional em jornalismo independente e cobertura setorial especializada.'}</p>
          </div>

          <div>
            <h4 className="text-white font-bold font-display uppercase text-xs tracking-wider mb-4 border-l-2 border-emerald-500 pl-2">Links Editoriais</h4>
            <div className="grid grid-cols-2 gap-2">
              <span onClick={() => { onCategorySelect?.('Economia'); }} className="hover:text-white transition-colors cursor-pointer">Economia</span>
              <span onClick={() => { onCategorySelect?.('Tecnologia'); }} className="hover:text-white transition-colors cursor-pointer">Tecnologia</span>
              <span onClick={() => { onCategorySelect?.('Política'); }} className="hover:text-white transition-colors cursor-pointer">Política</span>
              <span onClick={() => { onCategorySelect?.('Negócios'); }} className="hover:text-white transition-colors cursor-pointer">Negócios</span>
              <span onClick={() => { onCategorySelect?.('Geopolítica'); }} className="hover:text-white transition-colors cursor-pointer">Geopolítica</span>
              <span onClick={() => { onCategorySelect?.('Nacional'); }} className="hover:text-white transition-colors cursor-pointer">Nacional</span>
            </div>
          </div>

          <div>
            <h4 className="text-white font-bold font-display uppercase text-xs tracking-wider mb-4 border-l-2 border-emerald-500 pl-2">Contato Comercial</h4>
            <p className="leading-relaxed mb-2">Suporte comercial, pautas corporativas e informações de hospedagem:</p>
            <strong className="text-white block hover:underline cursor-pointer">{siteSettings?.contactEmail || 'redacao@storecenter.com.br'}</strong>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 mt-8 pt-8 border-t border-slate-800 text-center text-[11px] text-slate-500 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>{siteSettings?.footerText || '© 2026 Store Center Portal de News. Todos os direitos reservados. Design refinado e carregamento ultra-rápido.'}</p>
          <button 
            onClick={onAdminClick}
            className="text-slate-900 hover:text-slate-800 cursor-pointer select-text font-semibold uppercase tracking-wider text-[10px] transition-colors"
          >
            Painel Admin
          </button>
        </div>
      </footer>
    </div>
  );
}

