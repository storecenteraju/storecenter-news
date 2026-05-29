import React from 'react';
import { Newspaper, Clock, Eye, TrendingUp, Tag, ArrowRight, User, HelpCircle, AlertCircle } from 'lucide-react';
import { Post, CategoryType, AdUnit } from '../types';

interface PortalHomeProps {
  posts: Post[];
  ads: AdUnit[];
  selectedCategory: CategoryType | 'Home';
  searchQuery: string;
  onPostClick: (post: Post) => void;
  siteSettings: any;
  onCategorySelect?: (cat: CategoryType | 'Home') => void;
  onAdminClick?: () => void;
}

export default function PortalHome({
  posts,
  ads,
  selectedCategory,
  searchQuery,
  onPostClick,
  siteSettings,
  onCategorySelect,
  onAdminClick
}: PortalHomeProps) {
  
  // A local block set to guarantee that under no circumstances can two articles show the same photo on screen at the same time
  const displayedImagesOnRender = new Set<string>();

  const getDeduplicatedImage = (post: Post) => {
    const rawImage = post.image || '';
    if (!rawImage) {
      return `https://images.unsplash.com/featured/1280x720/?${encodeURIComponent(post.category || 'news')}&sig=${post.id}`;
    }

    let baseUrl = rawImage;
    try {
      if (rawImage.startsWith('http')) {
        const urlObj = new URL(rawImage);
        urlObj.searchParams.delete('sig');
        urlObj.searchParams.delete('random');
        baseUrl = urlObj.origin + urlObj.pathname;
      }
    } catch (e) {
      // Ignore conversion fallbacks
    }

    if (displayedImagesOnRender.has(baseUrl)) {
      const keyword = post.keyword || post.category || 'news';
      return `https://images.unsplash.com/featured/1280x720/?${encodeURIComponent(post.category)},${encodeURIComponent(keyword)}&sig=${post.id}-${Math.floor(Math.random() * 100)}`;
    }

    displayedImagesOnRender.add(baseUrl);
    return rawImage;
  };

  // 1. Filter posts that are marked published
  const publishedPosts = posts.filter(p => p.status === 'published' || p.status === 'scheduled');

  // 2. Filter by Search Query
  const searchQueryMatched = publishedPosts.filter(p => {
    if (!searchQuery) return true;
    const txt = (p.title + ' ' + p.subtitle + ' ' + p.content + ' ' + p.category).toLowerCase();
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

  // Calculate top 10 most viewed of last 7 days (Top 10 Destaques)
  const last7DaysPosts = publishedPosts.filter(p => {
    if (!p.date) return false;
    const postTime = new Date(p.date).getTime();
    const nowTime = new Date().getTime();
    return (nowTime - postTime) <= 7 * 24 * 60 * 60 * 1000;
  });
  const top10Last7Days = [...last7DaysPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  const top10Last7DaysIds = new Set(top10Last7Days.map(p => p.id));

  // Top 10 most viewed posts of the portal (🔥 MAIS LIDAS DA SEMANA)
  const top10PopularPosts = [...publishedPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);

  // Home Page layout splits the newest post into a hero spotlight with category diversity hoisting (Rule #6)
  let displayedDestaques: Post[] = [];
  let displayedRemaining: Post[] = [];

  if (selectedCategory === 'Home' && finalFilteredPosts.length > 0) {
    const heroPost = finalFilteredPosts[0];
    const requiredCategories = ['Economia', 'Política', 'Tecnologia', 'Negócios', 'Geopolítica'];
    
    const selectedIds = new Set<string>([heroPost.id]);
    const selectedCats = new Set<string>([heroPost.category]);
    
    // 1. Find the newest post for any missing required category
    const hoistedPosts: Post[] = [];
    for (const reqCat of requiredCategories) {
      if (selectedCats.has(reqCat)) continue;
      
      const found = finalFilteredPosts.slice(1).find(p => p.category === reqCat);
      if (found) {
        hoistedPosts.push(found);
        selectedIds.add(found.id);
        selectedCats.add(reqCat);
      }
    }
    
    // We want up to 7 highlights in total (1 hero + 6 secondary)
    const highlights: Post[] = [heroPost];
    
    // Add hoisted posts next
    for (const hp of hoistedPosts) {
      if (highlights.length < 7) {
        highlights.push(hp);
      }
    }
    
    // Fill remaining slots of the 7 highlights with standard chronological posts
    for (const p of finalFilteredPosts.slice(1)) {
      if (highlights.length >= 7) break;
      if (!selectedIds.has(p.id)) {
        highlights.push(p);
        selectedIds.add(p.id);
      }
    }
    
    displayedDestaques = highlights;
    displayedRemaining = finalFilteredPosts.filter(p => !selectedIds.has(p.id));
  } else {
    displayedDestaques = finalFilteredPosts;
    displayedRemaining = [];
  }

  const featurePost = selectedCategory === 'Home' ? displayedDestaques[0] : finalFilteredPosts[0];
  const secondaryPosts = selectedCategory === 'Home' ? displayedDestaques.slice(1) : finalFilteredPosts.slice(1, 7);
  const remainingPosts = selectedCategory === 'Home' ? displayedRemaining : finalFilteredPosts.slice(7);

  const formatPublishDate = (dateStr?: string) => {
    let d = new Date();
    if (dateStr) {
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        d = parsed;
      }
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
      <main className="max-w-7xl mx-auto px-4 py-6 md:py-10">
        
        {/* TOP AD BANNER CONTAINER - SUPERIOR DESTAQUE */}
        <div className="mb-8 md:mb-10 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center space-y-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-ping"></span> Publicidade Google AdSense (Topo do Portal)
            </span>
          </div>
          {adTop ? (
            <div 
              className="flex justify-center items-center overflow-x-auto p-4 bg-slate-50/50 border border-slate-100 rounded-xl"
              dangerouslySetInnerHTML={{ __html: adTop.code }}
            />
          ) : (
            <div className="border border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50 flex flex-col items-center justify-center min-h-[90px]">
              <span className="text-xs font-bold text-slate-600">Espaço de Divulgação Superior de Alto Impacto (728x90)</span>
              <span className="text-[10.5px] text-slate-400 mt-1 font-medium">Anúncio do patrocinador carregar-se-á dinamicamente</span>
            </div>
          )}
        </div>

        {/* CATEGORY HEADER BANNER (IF FILTER APPLIED) */}
        {selectedCategory !== 'Home' && (
          <div className="bg-white border border-slate-200 p-6 rounded-lg mb-8 shadow-sm">
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
              Cobertura jornalística especializada do portal Store Center focada nas principais movimentações locais e fluxos globais do setor de <span className="lowercase font-bold text-slate-900">{selectedCategory}</span>.
            </p>
          </div>
        )}

        {/* EMPTY STATE */}
        {finalFilteredPosts.length === 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-16 text-center shadow-sm max-w-2xl mx-auto my-12">
            <AlertCircle className="w-12 h-12 text-slate-300 mx-auto mb-4" />
            <span className="font-bold text-slate-800 text-lg block mb-1">Corta de Pautas</span>
            <p className="text-xs text-slate-500 mb-6 max-w-sm mx-auto">
              Nenhuma notícia para "{searchQuery || selectedCategory}" foi redigida ou publicada ainda. Acesse o Painel Admin para criar ou reescrever uma via IA!
            </p>
          </div>
        )}

        {finalFilteredPosts.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            
            {/* COLUMN 1-3: NEWS STREAM GRID */}
            <div className="lg:col-span-3 space-y-12">
              
              {/* FEATURED NEWS BLOCK (HERO SPOTLIGHT) */}
              {selectedCategory === 'Home' && featurePost && (
                <section 
                  onClick={() => onPostClick(featurePost)}
                  className="group bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row cursor-pointer"
                >
                  <div className="md:w-3/5 h-64 md:h-[420px] relative overflow-hidden">
                    <img 
                      src={getDeduplicatedImage(featurePost)} 
                      alt={featurePost.title} 
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <span className="absolute top-4 left-4 bg-blue-600 text-white text-[10px] font-extrabold font-display px-3 py-1.5 uppercase tracking-widest rounded shadow-sm">
                      {featurePost.category}
                    </span>
                  </div>
                  
                  <div className="md:w-2/5 p-6 md:p-8 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        <span className="flex items-center gap-1"><User className="w-3 h-3 text-blue-500" /> {featurePost.author}</span>
                        <span>&bull;</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatPublishDate(featurePost.date)}</span>
                      </div>
                      
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {(featurePost.views || 0) >= 500 && (
                          <span className="bg-red-600 text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded leading-none">
                            🔥 MAIS LIDA
                          </span>
                        )}
                        {top10Last7DaysIds.has(featurePost.id) && (
                          <span className="bg-amber-500 text-white text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded leading-none">
                            ⭐ DESTAQUE DA SEMANA
                          </span>
                        )}
                      </div>

                      <h2 className="text-xl md:text-2xl font-black font-display text-slate-900 leading-tight mb-4 group-hover:text-blue-600 transition-colors">
                        {featurePost.title}
                      </h2>
                      
                      <p className="text-slate-600 text-xs leading-relaxed mb-6 font-medium line-clamp-4">
                        {featurePost.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center justify-between border-t border-slate-100 pt-4">
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
              <div className="my-8 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase flex items-center gap-1.5">
                    📰 Anúncio Patrocinado Google AdSense (In-Feed Central)
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-500">FORMATO FLUIDO</span>
                </div>
                {getAdBySlot('middle') ? (
                  <div 
                    className="flex justify-center items-center overflow-x-auto p-4 bg-slate-50/50 border border-slate-100 rounded-xl"
                    dangerouslySetInnerHTML={{ __html: getAdBySlot('middle')?.code || '' }}
                  />
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50 flex flex-col items-center justify-center min-h-[110px]">
                    <span className="text-xs font-bold text-slate-650">Espaço de Divulgação e Publicidade Responsiva</span>
                    <span className="text-[10px] text-slate-400 mt-1 max-w-lg font-medium leading-relaxed">
                      Este bloco adapta-se de forma dinâmica para banners de imagem, blocos de links ou anúncios fluídos com base nas configurações vigentes.
                    </span>
                  </div>
                )}
              </div>

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
                        <div className="h-48 relative overflow-hidden bg-slate-100">
                          <img 
                            src={getDeduplicatedImage(post)} 
                            alt={post.title} 
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />
                          {selectedCategory === 'Home' && (
                            <span className="absolute top-3 left-3 bg-slate-950 text-white text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded">
                              {post.category}
                            </span>
                          )}
                        </div>

                        <div className="p-5">
                          <div className="flex items-center gap-2 text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">
                            <span>{post.author}</span>
                            <span>&bull;</span>
                            <span>{formatPublishDate(post.date)}</span>
                          </div>

                          <div className="flex flex-wrap gap-1.5 mb-2">
                            {(post.views || 0) >= 500 && (
                              <span className="bg-red-600 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                🔥 MAIS LIDA
                              </span>
                            )}
                            {top10Last7DaysIds.has(post.id) && (
                              <span className="bg-amber-500 text-white text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded">
                                ⭐ DESTAQUE DA SEMANA
                              </span>
                            )}
                          </div>

                          <h4 className="text-sm font-black font-display text-slate-900 leading-snug hover:text-blue-600 transition-colors line-clamp-2 md:line-clamp-3 mb-2">
                            {post.title}
                          </h4>

                          <p className="text-slate-600 text-[11px] leading-relaxed line-clamp-2">
                            {post.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="px-5 pb-5 pt-3 border-t border-slate-100/60 flex items-center justify-between mt-auto">
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
                          className="w-16 h-16 object-cover rounded flex-shrink-0"
                        />
                        <div>
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            <span className="text-[9px] font-bold text-blue-600 tracking-wider uppercase">{post.category}</span>
                            {(post.views || 0) >= 500 && (
                              <span className="text-[8.5px] font-black text-red-600 uppercase flex items-center gap-0.5">
                                🔥 MAIS LIDA
                              </span>
                            )}
                            {top10Last7DaysIds.has(post.id) && (
                              <span className="text-[8.5px] font-black text-amber-600 uppercase flex items-center gap-0.5">
                                ⭐ DESTAQUE DA SEMANA
                              </span>
                            )}
                          </div>
                          <h4 className="text-xs font-bold font-display text-slate-900 hover:text-blue-600 transition-colors line-clamp-1 leading-snug">{post.title}</h4>
                          <p className="text-slate-500 text-[10px] line-clamp-2 mt-0.5 leading-relaxed">{post.subtitle}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

            </div>

            {/* COLUMN 4: RIGHT EDITORIAL SIDEBAR */}
            <div className="lg:col-span-1 space-y-8">
              
              {/* ADSENSE SIDEBAR BANNER CARD */}
              <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm text-center space-y-3">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                    🎯 Banner Lateral
                  </span>
                </div>
                {adSidebar ? (
                  <div 
                    className="flex justify-center items-center overflow-x-auto p-4 bg-slate-50/50 border border-slate-200/50 rounded-xl min-h-[250px] md:min-h-[600px]"
                    dangerouslySetInnerHTML={{ __html: adSidebar.code }}
                  />
                ) : (
                  <div className="p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs">
                    Configure anúncios AdSense na aba lateral do Painel Administrativo.
                  </div>
                )}
              </div>

              {/* AS MAIS LIDAS INDEX */}
              <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm space-y-4">
                <h3 className="text-sm font-black font-display text-slate-950 border-l-4 border-red-600 pl-3 uppercase tracking-tight flex items-center gap-1.5">
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
        <div className="mt-12 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center space-y-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Publicidade Google AdSense (Rodapé do Portal)
            </span>
          </div>
          {adFooter ? (
            <div 
              className="flex justify-center items-center overflow-x-auto p-4 bg-slate-50/50 border border-slate-100 rounded-xl"
              dangerouslySetInnerHTML={{ __html: adFooter.code }}
            />
          ) : (
            <div className="border border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50 flex flex-col items-center justify-center min-h-[90px]">
              <span className="text-xs font-bold text-slate-600">Espaço de Divulgação Inferior de Rodapé (728x90)</span>
              <span className="text-[10.5px] text-slate-400 mt-1 font-medium">Banners de anúncios de rodapé do patrocinador carregar-se-ão dinamicamente</span>
            </div>
          )}
        </div>

      </main>

      {/* PORTAL FOOTER */}
      <footer className="bg-slate-900 text-slate-400 border-t border-slate-800 mt-20 py-12">
        <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-3 gap-8 text-xs">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <svg viewBox="0 0 100 100" className="w-8 h-8 text-white shrink-0" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
                <path d="M23 25 C23 25 12 25 12 27 L12 73 C12 81 14 82 23 82" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M23 25 L23 82" strokeWidth="6.5" strokeLinecap="round" />
                <rect x="22" y="15" width="62" height="67" rx="6" ry="6" fill="#0f172a" strokeWidth="6.5" strokeLinejoin="round" />
                <rect x="31" y="24" width="20" height="23" rx="1" fill="currentColor" stroke="none" />
                <line x1="58" y1="27" x2="75" y2="27" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="58" y1="35" x2="75" y2="35" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="58" y1="43" x2="75" y2="43" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
                <line x1="31" y1="56" x2="75" y2="56" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="31" y1="65" x2="75" y2="65" strokeWidth="4.5" strokeLinecap="round" />
                <line x1="31" y1="74" x2="75" y2="74" strokeWidth="4.5" strokeLinecap="round" />
              </svg>
              <span className="text-base font-extrabold font-display text-white tracking-widest uppercase">STORECENTER</span>
            </div>
            <p className="leading-relaxed">{siteSettings?.siteDescription || 'Portal de notícias rápidas e automatizadas via inteligência artificial.'}</p>
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
