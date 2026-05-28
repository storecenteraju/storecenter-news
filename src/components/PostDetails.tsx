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

  const adMiddle = getAdBySlot('middle');
  const adBottom = getAdBySlot('bottom');
  const adSidebar = getAdBySlot('sidebar');

  // Filter related posts (same category, excluding current)
  const relatedPosts = posts
    .filter(p => p.category === post.category && p.id !== post.id && (p.status === 'published' || p.status === 'scheduled'))
    .slice(0, 3);

  const formatPublishDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('pt-BR', { 
        weekday: 'long',
        day: '2-digit', 
        month: 'long', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
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
              <ArrowLeft class="w-3.5 h-3.5" /> Voltar
            </button>
            <span className="text-slate-300 font-normal shrink-0">&bull;</span>
            <span className="text-blue-600 font-extrabold uppercase shrink-0 select-none tracking-wide">{post.category}</span>
            <span className="text-slate-300 font-normal shrink-0">&bull;</span>
            <span className="text-slate-400 font-medium truncate max-w-[200px] md:max-w-md select-none">{post.title}</span>
          </div>

          <div className="flex items-center gap-4 shrink-0 font-bold">
            <span className="text-slate-400 capitalize flex items-center gap-1">Palavra-Chave SEO: <code className="bg-slate-100 text-slate-700 font-mono px-1.5 py-0.5 rounded text-[10px]">{post.keyword || 'S/K'}</code></span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          
          {/* ARTICLE MAIN AREA */}
          <div className="lg:col-span-3">
            <article className="bg-white border border-slate-200 rounded-2xl p-6 md:p-10 shadow-sm leading-relaxed">
              
              {/* PRIMARY HEADER INFOGRAPH */}
              <header className="space-y-4 mb-8">
                <div className="flex items-center justify-between">
                  <span className="bg-blue-600 text-white text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded shadow-sm inline-block">
                    {post.category}
                  </span>
                  
                  <div className="flex items-center gap-2">
                    <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors" title="Favoritar">
                      <Bookmark class="w-4 h-4" />
                    </button>
                    <button className="text-slate-400 hover:text-slate-600 p-1.5 rounded-full hover:bg-slate-50 transition-colors" title="Compartilhar">
                      <Share2 class="w-4 h-4" />
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
                    <p className="text-slate-600 flex items-center gap-1"><Clock class="w-3.5 h-3.5" /> {formatPublishDate(post.date)}</p>
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
              {adMiddle && (
                <div className="my-8 bg-slate-50 p-5 rounded-lg border border-dashed border-slate-200 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Anúncio Google AdSense (Meio do Artigo)</span>
                  <div 
                    className="font-mono text-[10px] text-slate-500 overflow-x-hidden text-ellipsis selection:bg-slate-200"
                    dangerouslySetInnerHTML={{ __html: adMiddle.code }}
                  />
                </div>
              )}

              {/* ARTICLE PARAGRAPH BLOCK 2 */}
              <div className="prose prose-slate max-w-none text-slate-800 text-[15px] space-y-6 leading-relaxed mt-6">
                {part2.split('\n\n').map((p, i) => (
                  <p key={i} className="whitespace-pre-wrap">{p}</p>
                ))}
              </div>

              {/* SEO IMAGE PROMPT AND INSIGHT DETAILS BOXED */}
              {post.imagePrompt && (
                <div className="mt-8 bg-blue-50/50 border border-blue-100 p-5 rounded-xl text-xs text-slate-600 space-y-2">
                  <div className="font-bold text-blue-900 border-b border-blue-100 pb-1.5 uppercase tracking-wide flex items-center gap-1.5 select-none">
                    💡 Prompt Sugerido por IA para Imagem Destacada Unsplash / Midjourney
                  </div>
                  <p className="italic font-medium text-slate-700 bg-white/75 p-3 rounded border border-blue-50 font-mono">
                    "{post.imagePrompt}"
                  </p>
                </div>
              )}

              {/* METADATA TARGETING SEO DETAILS (META TAGS COMPLIANCE) */}
              <div className="mt-8 p-5 rounded-xl border border-slate-200 bg-slate-50 text-xs text-slate-500 space-y-2 select-none">
                <div className="font-bold text-slate-800 border-b border-slate-200 pb-1.5 uppercase tracking-wider flex items-center gap-1.5">
                  🔍 Otimização SEO Meta Tags (Pronto para Google Search Console)
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <span className="block font-semibold text-slate-700 mb-0.5">Título SEO (max 60 carac.):</span>
                    <p className="font-mono text-[11px] text-blue-700 select-all">{post.seoTitle || post.title}</p>
                  </div>
                  <div>
                    <span className="block font-semibold text-slate-700 mb-0.5">Slug URL Amigável:</span>
                    <p className="font-mono text-[11px] text-emerald-700 select-all">/{post.category.toLowerCase()}/{post.slug}</p>
                  </div>
                </div>
                <div>
                  <span className="block font-semibold text-slate-700 mb-0.5">Meta-Description (max 150 carac.):</span>
                  <p className="font-mono text-[11px]" style={{ wordBreak: 'break-word' }}>{post.seoDescription || post.subtitle}</p>
                </div>
              </div>

              {/* EXPLICIT METRICS */}
              <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 mt-10 pt-6">
                <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">Tags da Notícia:</span>
                {post.tags.map(tg => (
                  <span 
                    key={tg}
                    className="flex items-center gap-1 bg-slate-100 text-slate-700 text-[10px] font-bold px-3 py-1.5 uppercase rounded-full hover:bg-slate-200 transition-colors select-none"
                  >
                    <Tag class="w-2.5 h-2.5" /> #{tg}
                  </span>
                ))}
              </div>

              {/* BOTTOM AD BLOCK (IF ACTIVE) */}
              {adBottom && (
                <div className="mt-8 bg-slate-50 p-5 rounded-lg border border-dashed border-slate-200 text-center">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-1">Anúncio Google AdSense (Final do Artigo)</span>
                  <div 
                    className="font-mono text-[10px] text-slate-500 overflow-x-hidden text-ellipsis select-all"
                    dangerouslySetInnerHTML={{ __html: adBottom.code }}
                  />
                </div>
              )}

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

            {/* AD BANNER IN POST SIDEBAR */}
            <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm text-center">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block mb-2">Publicidade AdSense Lateral</span>
              {adSidebar ? (
                <div 
                  className="p-4 bg-slate-50/70 border border-slate-200 rounded text-center text-[10px] leading-normal font-mono text-slate-500 overflow-x-hidden text-ellipsis max-h-[300px] overflow-y-hidden"
                  dangerouslySetInnerHTML={{ __html: adSidebar.code }}
                />
              ) : (
                <div className="p-16 border border-dashed border-slate-200 rounded text-slate-400 text-[11px]">
                  Anúncio AdSense Lateral
                </div>
              )}
            </div>

            {/* CLICKS COUNTER FOR CURRENT READING METRIC */}
            <div className="bg-slate-900 p-5 rounded-xl border border-slate-800 text-slate-300 space-y-1.5 text-xs">
              <div className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Painel de Analytics Ativo
              </div>
              <p className="text-[10px] text-slate-400">Este artigo registrou <strong className="text-white font-mono text-xs">{post.views + 1}</strong> visualizações orgânicas computadas no painel da redação.</p>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
