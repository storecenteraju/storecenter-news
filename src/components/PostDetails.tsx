import React, { useEffect } from 'react';
import { ArrowLeft, Clock, Eye, User, Share2, Tag, ChevronRight, Bookmark } from 'lucide-react';
import { Post, AdUnit } from '../types';

interface PostDetailsProps {
  post: Post;
  posts: Post[];
  ads: AdUnit[];
  onBack: () => void;
  onPostClick: (post: Post) => void;
}

export default function PostDetails({
  post,
  posts,
  ads,
  onBack,
  onPostClick
}: PostDetailsProps) {

  // Increment views on mount
  useEffect(() => {
    fetch(`/api/posts/${post.id}/view`, { method: "POST" })
      .catch(err => console.error("Erro incrementando visualização:", err));
  }, [post.id]);

  // Determine top Ad configurations
  const getAdBySlot = (slot: 'top' | 'middle' | 'bottom' | 'sidebar' | 'footer' | 'floating') => {
    return ads.find(a => a.slot === slot && a.enabled);
  };

  const adTop = getAdBySlot('top');
  const adMiddle = getAdBySlot('middle');
  const adBottom = getAdBySlot('bottom');
  const adSidebar = getAdBySlot('sidebar');
  const adFooter = getAdBySlot('footer');

  // Calculate most viewed of the last 7 days (Top 10)
  const last7DaysPosts = posts.filter(p => {
    if (!p.date) return false;
    const postTime = new Date(p.date).getTime();
    const nowTime = new Date().getTime();
    return (nowTime - postTime) <= 7 * 24 * 60 * 60 * 1000;
  });
  const top10Last7Days = [...last7DaysPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);
  const isDestaqueDaSemana = top10Last7Days.some(p => p.id === post.id);
  const isMaisLida = (post.views || 0) >= 500;

  // Filter related posts (same category, excluding current)
  const relatedPosts = posts
    .filter(p => p.category === post.category && p.id !== post.id && (p.status === 'published' || p.status === 'scheduled'))
    .slice(0, 3);

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

  // Split content logically to inject "Ad Meio Artigo" between paragraph 2 and 3
  const paragraphs = post.content.split('\n\n');
  const part1 = paragraphs.slice(0, 2).join('\n\n');
  const part2 = paragraphs.slice(2).join('\n\n');

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
        <div className="mb-6 md:mb-8 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center space-y-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-blue-600 rounded-full animate-ping"></span> Publicidade Google AdSense (Topo do Artigo)
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

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* ARTICLE MAIN AREA */}
          <div className="lg:col-span-3">
            <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-sm leading-relaxed">
              
              {/* PRIMARY HEADER INFOGRAPH */}
              <header className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded shadow-sm inline-block">
                      {post.category}
                    </span>
                    {isMaisLida && (
                      <span className="bg-red-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1.5 rounded shadow-sm flex items-center gap-1">
                        🔥 MAIS LIDA
                      </span>
                    )}
                    {isDestaqueDaSemana && (
                      <span className="bg-amber-500 text-white text-[10px] font-extrabold uppercase tracking-widest px-2.5 py-1.5 rounded shadow-sm flex items-center gap-1">
                        ⭐ DESTAQUE DA SEMANA
                      </span>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors" title="Favoritar">
                      <Bookmark className="w-4 h-4" />
                    </button>
                    <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors" title="Compartilhar">
                      <Share2 className="w-4 h-4" />
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
                    <p className="uppercase text-[10px] tracking-wider text-slate-400">Publicação oficial</p>
                    <p className="text-slate-600 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {formatPublishDate(post.date)}</p>
                  </div>
                </div>
              </header>

              {/* OUTWARD BANNER IMAGE */}
              <div className="rounded-xl overflow-hidden mb-8 max-h-[460px] border border-slate-100 bg-slate-50 shadow-inner">
                <img 
                  src={post.image} 
                  alt={post.title} 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>

              {/* ARTICLE PARAGRAPH BLOCK 1 */}
              <div className="prose prose-slate max-w-none text-slate-800 text-[15px] space-y-6 leading-relaxed">
                {part1.split('\n\n').map((p, i) => (
                  <p key={i} className="whitespace-pre-wrap">{p}</p>
                ))}
              </div>

              {/* MIDDLE AD BLOCK (IF ACTIVE) */}
              <div className="my-10 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center space-y-3">
                <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    📢 Anúncio Google AdSense (Meio do Artigo)
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-500">FORMATO RETANGULAR</span>
                </div>
                {adMiddle ? (
                  <div 
                    className="flex justify-center items-center overflow-x-auto p-4 bg-slate-50 border border-slate-100 rounded-xl"
                    dangerouslySetInnerHTML={{ __html: adMiddle.code }}
                  />
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50 flex flex-col items-center justify-center min-h-[90px]">
                    <span className="text-xs font-bold text-slate-600">Espaço Reservado - AdSense Meio do Artigo (In-Article)</span>
                    <span className="text-[10px] text-slate-400 mt-1">Anúncio do meio do artigo carregar-se-á dinamicamente</span>
                  </div>
                )}
              </div>

              {/* ARTICLE PARAGRAPH BLOCK 2 */}
              <div className="prose prose-slate max-w-none text-slate-800 text-[15px] space-y-6 leading-relaxed mt-6">
                {part2.split('\n\n').map((p, i) => (
                  <p key={i} className="whitespace-pre-wrap">{p}</p>
                ))}
              </div>

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
              <div className="mt-10 mb-2 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center space-y-3">
                <div className="flex items-center justify-between border-b border-slate-150 pb-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                    📢 Anúncio Google AdSense (Final do Artigo)
                  </span>
                  <span className="text-[9px] font-mono font-bold text-slate-500">RECOMENDAÇÕES / NATIVO</span>
                </div>
                {adBottom ? (
                  <div 
                    className="flex justify-center items-center overflow-x-auto p-4 bg-slate-50 border border-slate-100 rounded-xl"
                    dangerouslySetInnerHTML={{ __html: adBottom.code }}
                  />
                ) : (
                  <div className="border border-dashed border-slate-200 rounded-xl p-8 bg-slate-50/50 flex flex-col items-center justify-center min-h-[90px]">
                    <span className="text-xs font-bold text-slate-600">Espaço Reservado - AdSense Final do Artigo (Matched Content)</span>
                    <span className="text-[10px] text-slate-400 mt-1">Anúncios nativos de rodapé carregar-se-ão dinamicamente</span>
                  </div>
                )}
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
                    <div 
                      key={rel.id}
                      onClick={() => onPostClick(rel)}
                      className="group bg-white border border-slate-200 hover:border-slate-300 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col justify-between cursor-pointer h-full"
                    >
                      <div className="h-32 relative overflow-hidden bg-slate-100">
                        <img 
                          src={rel.image} 
                          alt="" 
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      </div>
                      
                      <div className="p-4 flex-grow flex flex-col justify-between">
                        <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-blue-600 group-hover:underline transition-all line-clamp-2 mb-2">
                          {rel.title}
                        </h4>
                        <span className="text-[9px] text-slate-400">
                          {formatPublishDate(rel.date)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

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
            <div className="bg-white p-5 border border-slate-200 rounded-2xl shadow-sm text-center space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  🎯 Banner Lateral
                </span>
              </div>
              {adSidebar ? (
                <div 
                  className="flex justify-center items-center overflow-x-auto p-4 bg-slate-50/50 border border-slate-200/50 rounded-xl min-h-[250px] md:min-h-[500px]"
                  dangerouslySetInnerHTML={{ __html: adSidebar.code }}
                />
              ) : (
                <div className="p-8 border border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-slate-400 text-xs">
                  Anúncio AdSense Lateral
                </div>
              )}
            </div>

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

          </div>

        </div>

        {/* BOTTOM ADSENSE BANNER CONTAINER - RODAPÉ DESTAQUE NO ARTIGO */}
        <div className="mt-12 bg-white border border-slate-200 p-6 rounded-2xl shadow-sm text-center space-y-3 max-w-7xl mx-auto">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <span className="inline-block w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span> Publicidade Google AdSense (Rodapé do Artigo)
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

      </div>
    </div>
  );
}
