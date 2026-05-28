import React, { useState, useEffect } from 'react';
import { 
  Newspaper, ShieldCheck, Key, Plus, Edit2, Trash2, Calendar, 
  Radio, Cpu, Settings, Code, FileText, CheckCircle2, RefreshCw, 
  AlertTriangle, Eye, ArrowRight, Loader2, Link2, Download, Save, PlusCircle, Server
} from 'lucide-react';
import { Post, RSSFeed, AdUnit, SiteSettings, CategoryType } from '../types';
import PhpExporter from './PhpExporter';

interface AdminPanelProps {
  posts: Post[];
  feeds: RSSFeed[];
  ads: AdUnit[];
  siteSettings: SiteSettings;
  onRefreshData: () => void;
}

export default function AdminPanel({
  posts,
  feeds,
  ads,
  siteSettings,
  onRefreshData
}: AdminPanelProps) {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'posts' | 'rss' | 'links' | 'schedule' | 'ads' | 'settings' | 'cpanel'>('posts');

  // Form states - Post manual creation / editing
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [postTitle, setPostTitle] = useState('');
  const [postSubtitle, setPostSubtitle] = useState('');
  const [postContent, setPostContent] = useState('');
  const [postCategory, setPostCategory] = useState<CategoryType>('Economia');
  const [postAuthor, setPostAuthor] = useState('Carlos Drummond');
  const [postImage, setPostImage] = useState('https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80');
  const [postTags, setPostTags] = useState('');
  const [postStatus, setPostStatus] = useState<'published' | 'draft' | 'scheduled'>('published');
  const [postPublishAt, setPostPublishAt] = useState('');
  
  // SEO variables
  const [postSeoTitle, setPostSeoTitle] = useState('');
  const [postSeoDesc, setPostSeoDesc] = useState('');
  const [postKeyword, setPostKeyword] = useState('');
  const [postImagePrompt, setPostImagePrompt] = useState('');
  const [formSuccessMsg, setFormSuccessMsg] = useState('');

  // RSS panel states
  const [newRssName, setNewRssName] = useState('');
  const [newRssUrl, setNewRssUrl] = useState('');
  const [newRssCategory, setNewRssCategory] = useState<CategoryType>('Economia');

  const [scrapingFeedId, setScrapingFeedId] = useState<string | null>(null);
  const [scrapingLoading, setScrapingLoading] = useState(false);
  const [scrapedResult, setScrapedResult] = useState<any>(null);

  // Link comparisons state
  const [comparativeLinks, setComparativeLinks] = useState<string[]>(['', '']);
  const [comparativeCategory, setComparativeCategory] = useState<CategoryType>('Economia');
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [comparisonResult, setComparisonResult] = useState<any>(null);

  // AdSense editing state
  const [localAds, setLocalAds] = useState<AdUnit[]>([]);

  // Settings editing state
  const [siteName, setSiteName] = useState('');
  const [siteDescr, setSiteDescr] = useState('');
  const [footerText, setFooterText] = useState('');
  const [analyticsId, setAnalyticsId] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  useEffect(() => {
    if (ads && ads.length > 0) {
      setLocalAds(ads);
    }
  }, [ads]);

  useEffect(() => {
    if (siteSettings) {
      setSiteName(siteSettings.siteName || '');
      setSiteDescr(siteSettings.siteDescription || '');
      setFooterText(siteSettings.footerText || '');
      setAnalyticsId(siteSettings.analyticsId || '');
      setContactEmail(siteSettings.contactEmail || '');
    }
  }, [siteSettings]);

  // Handle Administrative Login (admin / admin123)
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === 'admin' && password === 'admin123') {
      setIsAuthenticated(true);
      setLoginError('');
    } else {
      setLoginError('Credenciais inválidas! Tente admin / admin123.');
    }
  };

  // Pre-load form for editing an article
  const startEditPost = (post: Post) => {
    setEditingPostId(post.id);
    setPostTitle(post.title);
    setPostSubtitle(post.subtitle);
    setPostContent(post.content);
    setPostCategory(post.category);
    setPostAuthor(post.author);
    setPostImage(post.image);
    setPostTags(post.tags.join(', '));
    setPostStatus(post.status);
    setPostPublishAt(post.publishAt || '');
    setPostSeoTitle(post.seoTitle || '');
    setPostSeoDesc(post.seoDescription || '');
    setPostKeyword(post.keyword || '');
    setPostImagePrompt(post.imagePrompt || '');
    setFormSuccessMsg('');
    
    // Smooth scroll inside editing grid
    document.getElementById('post-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const clearPostForm = () => {
    setEditingPostId(null);
    setPostTitle('');
    setPostSubtitle('');
    setPostContent('');
    setPostCategory('Economia');
    setPostAuthor('Carlos Drummond');
    setPostImage('https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80');
    setPostTags('');
    setPostStatus('published');
    setPostPublishAt('');
    setPostSeoTitle('');
    setPostSeoDesc('');
    setPostKeyword('');
    setPostImagePrompt('');
    setFormSuccessMsg('');
  };

  // Create or Update Manual news post
  const handleSavePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postTitle || !postContent) {
      alert("Por favor, informe pelo menos o Título e o Conteúdo.");
      return;
    }

    const payload = {
      title: postTitle,
      subtitle: postSubtitle,
      content: postContent,
      category: postCategory,
      author: postAuthor,
      image: postImage,
      tags: postTags.split(',').map(t => t.trim()).filter(Boolean),
      status: postStatus,
      publishAt: postStatus === 'scheduled' ? postPublishAt : undefined,
      seoTitle: postSeoTitle || postTitle.slice(0, 55),
      seoDescription: postSeoDesc || postSubtitle.slice(0, 145),
      keyword: postKeyword,
      imagePrompt: postImagePrompt
    };

    try {
      let response;
      if (editingPostId) {
        response = await fetch(`/api/posts/${editingPostId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      } else {
        response = await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
      }

      if (response.ok) {
        setFormSuccessMsg(editingPostId ? "Notícia atualizada com sucesso!" : "Notícia criada com sucesso!");
        clearPostForm();
        onRefreshData();
      } else {
        alert("Erro ao salvar notícia.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro conectando ao servidor.");
    }
  };

  // Delete article
  const handleDeletePost = async (id: string) => {
    if (!confirm("Deseja realmente excluir este artigo? Esta ação é irreversível.")) return;
    try {
      const response = await fetch(`/api/posts/${id}`, { method: 'DELETE' });
      if (response.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Add new Feed
  const handleAddFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRssName || !newRssUrl) return;

    try {
      const response = await fetch('/api/feeds', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newRssName,
          url: newRssUrl,
          category: newRssCategory
        })
      });

      if (response.ok) {
        setNewRssName('');
        setNewRssUrl('');
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete RSS
  const handleDeleteFeed = async (id: string) => {
    try {
      const response = await fetch(`/api/feeds/${id}`, { method: 'DELETE' });
      if (response.ok) {
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Execute Simulated or Authentic RSS feed rewrite via Gemini API
  const handleExecuteRssScrape = async (feed: RSSFeed) => {
    setScrapingFeedId(feed.id);
    setScrapingLoading(true);
    setScrapedResult(null);

    try {
      const response = await fetch('/api/ai/rss-scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: feed.category,
          sourceName: feed.name
        })
      });

      const data = await response.json();
      if (data.success) {
        setScrapedResult(data.post);
      } else {
        alert("Falha no scraper de IA: " + data.error);
      }
    } catch (err: any) {
      console.error(err);
      alert("Erro conectando à API de Scrape.");
    } finally {
      setScrapingLoading(false);
      setScrapingFeedId(null);
    }
  };

  // Load the scraped post automatically into manual editor for approval
  const approveScrapedPost = (scraped: any) => {
    setPostTitle(scraped.title);
    setPostSubtitle(scraped.subtitle);
    setPostContent(scraped.content);
    setPostCategory(scraped.category);
    setPostTags(scraped.tags.join(', '));
    setPostSeoTitle(scraped.seoTitle);
    setPostSeoDesc(scraped.seoDescription);
    setPostKeyword(scraped.keyword);
    setPostImagePrompt(scraped.imagePrompt);
    setPostStatus('published');
    setScrapedResult(null);
    
    // Scroll to section manually
    setActiveTab('posts');
    setTimeout(() => {
      document.getElementById('post-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 150);
  };

  // Multi-link URL comparative generation trigger
  const handleCompareLinks = async (e: React.FormEvent) => {
    e.preventDefault();
    const activeUrls = comparativeLinks.filter(l => l.trim().length > 0);
    if (activeUrls.length === 0) {
      alert("Preencha de 1 a 4 links de notícias.");
      return;
    }

    setComparisonLoading(true);
    setComparisonResult(null);

    try {
      const response = await fetch('/api/ai/links-compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          links: activeUrls,
          category: comparativeCategory
        })
      });

      const data = await response.json();
      if (data.success) {
        setComparisonResult(data.result);
      } else {
        alert("Erro ao ler e comparar links: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar ao endpoint de comparação.");
    } finally {
      setComparisonLoading(false);
    }
  };

  // Move compared article to editor for publication
  const approveComparisonPost = (compared: any) => {
    setPostTitle(compared.title);
    setPostSubtitle(compared.subtitle);
    setPostContent(compared.content);
    setPostCategory(compared.category);
    setPostTags(compared.tags.join(', '));
    setPostSeoTitle(compared.seoTitle);
    setPostSeoDesc(compared.seoDescription);
    setPostKeyword(compared.keyword);
    setPostImagePrompt(compared.imagePrompt);
    setPostStatus('published');
    setComparisonResult(null);

    setActiveTab('posts');
    setTimeout(() => {
      document.getElementById('post-form')?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // Update AdSense Unit configs
  const handleSaveAds = async () => {
    try {
      const response = await fetch('/api/ads', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localAds)
      });
      if (response.ok) {
        alert("Anúncios do AdSense atualizados com sucesso!");
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Update site descriptive settings
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          siteName,
          siteDescription: siteDescr,
          footerText,
          analyticsId,
          contactEmail
        })
      });
      if (response.ok) {
        alert("Configurações do portal armazenadas com sucesso!");
        onRefreshData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Calculate sum counts for KPI
  const viewCount = posts.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const scheduledCount = posts.filter(p => p.status === 'scheduled').length;
  const draftCount = posts.filter(p => p.status === 'draft').length;

  // Render Login Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="bg-slate-50 min-h-[80vh] flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xl max-w-md w-full p-8 space-y-6">
          <div className="text-center space-y-3">
            <svg viewBox="0 0 100 100" className="w-16 h-16 drop-shadow-[2px_3px_2px_rgba(0,0,0,0.25)] text-slate-900 mx-auto" fill="none" stroke="currentColor" xmlns="http://www.w3.org/2000/svg">
              <path d="M23 25 C23 25 12 25 12 27 L12 73 C12 81 14 82 23 82" strokeWidth="6.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M23 25 L23 82" strokeWidth="6.5" strokeLinecap="round" />
              <rect x="22" y="15" width="62" height="67" rx="6" ry="6" fill="#FFFFFF" strokeWidth="6.5" strokeLinejoin="round" />
              <rect x="31" y="24" width="20" height="23" rx="1" fill="currentColor" stroke="none" />
              <line x1="58" y1="27" x2="75" y2="27" strokeWidth="4.5" strokeLinecap="round" />
              <line x1="58" y1="35" x2="75" y2="35" strokeWidth="4.5" strokeLinecap="round" />
              <line x1="58" y1="43" x2="75" y2="43" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
              <line x1="31" y1="56" x2="75" y2="56" strokeWidth="4.5" strokeLinecap="round" />
              <line x1="31" y1="65" x2="75" y2="65" strokeWidth="4.5" strokeLinecap="round" />
              <line x1="31" y1="74" x2="75" y2="74" strokeWidth="4.5" strokeLinecap="round" />
            </svg>
            <div className="space-y-1">
              <h2 className="text-xl font-black font-display text-slate-950 uppercase tracking-tight">Redação STORECENTER</h2>
              <p className="text-xs text-slate-500">Credenciais para o painel de publicador e automações.</p>
            </div>
          </div>

          {loginError && (
            <div className="bg-red-50 border border-red-200 text-red-600 rounded p-3 text-xs font-semibold text-center leading-normal">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Usuário</label>
              <input 
                type="text" 
                required
                placeholder="Exemplo: admin" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full text-xs p-3 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Senha</label>
              <input 
                type="password" 
                required
                placeholder="Sua senha de editor" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full text-xs p-3 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
              />
            </div>

            <button 
              type="submit"
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer"
            >
              Autenticar Redator
            </button>
          </form>

          <div className="border-t border-slate-100 pt-4 text-center">
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              Acesso Inicial: <code className="bg-slate-100 text-slate-600 px-1 rounded">admin</code> e <code className="bg-slate-100 text-slate-600 px-1 rounded">admin123</code>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      
      {/* HEADER DESK STATISTICS */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8 select-none">
        
        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Postagens Ativas</span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">{posts.length}</p>
          </div>
          <Newspaper className="w-8 h-8 text-blue-500 bg-blue-50 p-1.5 rounded-lg" />
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Leituras Totais</span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">{viewCount}</p>
          </div>
          <Eye className="w-8 h-8 text-emerald-500 bg-emerald-50 p-1.5 rounded-lg" />
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Agendadas / Rascunhos</span>
            <p className="text-2xl font-black font-mono text-slate-900 mt-1">{scheduledCount} / {draftCount}</p>
          </div>
          <Calendar className="w-8 h-8 text-amber-500 bg-amber-50 p-1.5 rounded-lg" />
        </div>

        <div className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex items-center justify-between animate-pulse">
          <div>
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status da Conexão</span>
            <p className="text-xs font-bold text-emerald-600 mt-2 flex items-center gap-1 uppercase tracking-wide">
              <ShieldCheck className="w-4 h-4" /> cPanel Conectado
            </p>
          </div>
          <Cpu className="w-8 h-8 text-purple-500 bg-purple-50 p-1.5 rounded-lg" />
        </div>

      </div>

      {/* ADMIN TAB SELECTORS */}
      <div className="flex border-b border-slate-200 mb-8 overflow-x-auto scrollbar-hide">
        <button 
          onClick={() => setActiveTab('posts')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'posts' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Newspaper class="w-4 h-4" /> 1. Publicações (MANUAL)</div>
        </button>
        <button 
          onClick={() => setActiveTab('rss')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'rss' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Radio class="w-4 h-4" /> 2. Automação RSS (IA)</div>
        </button>
        <button 
          onClick={() => setActiveTab('links')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'links' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Link2 class="w-4 h-4" /> 3. Busca de Links (IA)</div>
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'schedule' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Calendar class="w-4 h-4" /> 4. Agendador</div>
        </button>
        <button 
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'ads' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Code class="w-4 h-4" /> 5. AdSense Anúncios</div>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'settings' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Settings class="w-4 h-4" /> 6. Configurações</div>
        </button>
        <button 
          onClick={() => setActiveTab('cpanel')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'cpanel' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5 bg-blue-900/10 text-blue-800 rounded px-2.5 py-1 font-black"><Server class="w-4 h-4" /> 7. Hospedar cPanel (PHP)</div>
        </button>
      </div>

      {/* 1. PUBLICADOR MANUAL / CRUD */}
      {activeTab === 'posts' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* EDIT FORM */}
          <div id="post-form" className="lg:col-span-1 bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold font-display text-slate-900 border-b border-slate-100 pb-2 uppercase select-none">
              {editingPostId ? '🖊️ Editar Notícia' : '➕ Escrever Nova Matéria'}
            </h3>

            {formSuccessMsg && (
              <div class="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs p-3 rounded font-semibold text-center leading-normal">
                {formSuccessMsg}
              </div>
            )}

            <form onSubmit={handleSavePost} className="space-y-4 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Título Principal *</label>
                <input 
                  type="text" 
                  required
                  placeholder="Título jornalístico polido"
                  value={postTitle}
                  onChange={e => setPostTitle(e.target.value)}
                  className="w-full text-xs p-3 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Subtítulo (Linha de Apoio)</label>
                <textarea 
                  rows={2}
                  placeholder="Sumário explicativo"
                  value={postSubtitle}
                  onChange={e => setPostSubtitle(e.target.value)}
                  className="w-full text-xs p-3 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Categoria</label>
                  <select 
                    value={postCategory}
                    onChange={e => setPostCategory(e.target.value as CategoryType)}
                    className="w-full text-xs p-2.5 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 text-slate-800"
                  >
                    <option value="Economia">Economia</option>
                    <option value="Política">Política</option>
                    <option value="Negócios">Negócios</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Geopolítica">Geopolítica</option>
                    <option value="Nacional">Nacional</option>
                    <option value="Esporte">Esporte</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Entretenimento">Entretenimento</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Autor</label>
                  <input 
                    type="text" 
                    value={postAuthor}
                    onChange={e => setPostAuthor(e.target.value)}
                    className="w-full text-xs p-2.5 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">URL da Imagem Destacada</label>
                <input 
                  type="text" 
                  placeholder="Link da imagem (Unsplash)"
                  value={postImage}
                  onChange={e => setPostImage(e.target.value)}
                  className="w-full text-xs p-3 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Conteúdo do Artigo *</label>
                <textarea 
                  rows={8}
                  required
                  placeholder="Escreva a notícia em parágrafos separados..."
                  value={postContent}
                  onChange={e => setPostContent(e.target.value)}
                  className="w-full text-xs p-3 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
                />
              </div>

              {/* INTEGRATED SEO COMPARTMENT */}
              <div className="bg-slate-50 border border-slate-200 rounded p-4 space-y-3">
                <p className="font-bold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px]">Otimização para SEO</p>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Palavra-Chave Foco</label>
                    <input 
                      type="text" 
                      placeholder="Ex: PIB Brasil 2026"
                      value={postKeyword}
                      onChange={e => setPostKeyword(e.target.value)}
                      className="w-full text-[11px] p-2 bg-white border border-slate-200 rounded"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Tags (Vírgula)</label>
                    <input 
                      type="text" 
                      placeholder="tag1, tag2"
                      value={postTags}
                      onChange={e => setPostTags(e.target.value)}
                      className="w-full text-[11px] p-2 bg-white border border-slate-200 rounded"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Título SEO (max 60 carac)</label>
                  <input 
                    type="text" 
                    placeholder="Título otimizado no buscador"
                    value={postSeoTitle}
                    onChange={e => setPostSeoTitle(e.target.value)}
                    className="w-full text-[11px] p-2 bg-white border border-slate-200 rounded"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Meta Descrição (max 150 carac)</label>
                  <textarea 
                    rows={2}
                    placeholder="Descrição do card de busca"
                    value={postSeoDesc}
                    onChange={e => setPostSeoDesc(e.target.value)}
                    className="w-full text-[11px] p-2 bg-white border border-slate-200 rounded"
                  />
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Prompt de Imagem IA</label>
                  <input 
                    type="text" 
                    placeholder="A highly detailed photography of..."
                    value={postImagePrompt}
                    onChange={e => setPostImagePrompt(e.target.value)}
                    className="w-full text-[11px] p-2 bg-white border border-slate-200 rounded"
                  />
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded">
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Status & Agendamento</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-1 font-semibold text-slate-700">
                    <input 
                      type="radio" 
                      name="postStatus" 
                      value="published"
                      checked={postStatus === 'published'}
                      onChange={() => setPostStatus('published')}
                    /> Imediato
                  </label>
                  <label className="flex items-center gap-1 font-semibold text-slate-700">
                    <input 
                      type="radio" 
                      name="postStatus" 
                      value="draft"
                      checked={postStatus === 'draft'}
                      onChange={() => setPostStatus('draft')}
                    /> Rascunho
                  </label>
                  <label className="flex items-center gap-1 font-semibold text-slate-700">
                    <input 
                      type="radio" 
                      name="postStatus" 
                      value="scheduled"
                      checked={postStatus === 'scheduled'}
                      onChange={() => setPostStatus('scheduled')}
                    /> Agendar
                  </label>
                </div>

                {postStatus === 'scheduled' && (
                  <div>
                    <label className="block text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Data/Hora da Publicação</label>
                    <input 
                      type="datetime-local" 
                      value={postPublishAt}
                      onChange={e => setPostPublishAt(e.target.value)}
                      className="w-full p-2 bg-white border border-slate-200 rounded text-xs text-slate-800"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-2">
                <button 
                  type="submit" 
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded shadow transition-all cursor-pointer select-none text-center"
                >
                  {editingPostId ? 'Salvar Edições' : 'Publicar Agora'}
                </button>
                {editingPostId && (
                  <button 
                    type="button" 
                    onClick={clearPostForm}
                    className="px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded border border-slate-200 uppercase tracking-wide cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* TABLE */}
          <div className="lg:col-span-2 bg-white p-6 border border-slate-200 rounded-xl shadow-sm">
            <h3 className="text-sm font-bold font-display text-slate-900 border-b border-slate-100 pb-3 mb-4 uppercase flex items-center justify-between">
              Lista de Matérias Cadastradas ({posts.length})
              <button onClick={clearPostForm} className="text-xs bg-slate-100 hover:bg-slate-200 border text-slate-800 px-3 py-1 rounded flex items-center gap-1">
                <Plus class="w-3.5 h-3.5" /> Escrever Novo
              </button>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50 select-none">
                    <th className="p-3">Notícia</th>
                    <th className="p-3">Categoria</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Visualizações</th>
                    <th className="p-3 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {posts.map(p => (
                    <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                      <td className="p-3 max-w-sm">
                        <span className="font-bold text-slate-900 line-clamp-1">{p.title}</span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Por {p.author} &bull; {new Date(p.date).toLocaleString('pt-BR')}</span>
                      </td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-800 text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded">
                          {p.category}
                        </span>
                      </td>
                      <td className="p-3">
                        {p.status === 'published' && <span className="text-emerald-600 font-bold flex items-center gap-1 text-[10px] uppercase">● No ar</span>}
                        {p.status === 'draft' && <span className="text-slate-400 font-bold flex items-center gap-1 text-[10px] uppercase">○ Rascunho</span>}
                        {p.status === 'scheduled' && <span className="text-amber-600 font-bold flex items-center gap-1 text-[10px] uppercase">⏰ Agendado</span>}
                      </td>
                      <td className="p-3 font-mono text-slate-500 font-semibold">{p.views || 0}</td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button 
                            onClick={() => startEditPost(p)}
                            title="Editar"
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded transition-colors cursor-pointer"
                          >
                            <Edit2 class="w-3.5 h-3.5" />
                          </button>
                          <button 
                            onClick={() => handleDeletePost(p.id)}
                            title="Excluir"
                            className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 class="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 2. AUTOMACAO RSS FEEDS */}
      {activeTab === 'rss' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* FEED LIST REGISTRY */}
          <div className="lg:col-span-1 bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-4">
            <h3 className="text-sm font-bold font-display text-slate-900 border-b border-slate-100 pb-2 uppercase flex items-center gap-1">
              <PlusCircle className="text-blue-500 w-4 h-4" /> Cadastrar Feed RSS
            </h3>

            <form onSubmit={handleAddFeed} className="space-y-4 text-xs">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nome do Veículo / Editoria</label>
                <input 
                  type="text" 
                  required
                  placeholder="Ex: G1 - Finanças"
                  value={newRssName}
                  onChange={e => setNewRssName(e.target.value)}
                  className="w-full p-2.5 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">URL Oficial do Feed RSS</label>
                <input 
                  type="url" 
                  required
                  placeholder="https://g1.globo.com/dynamo/..."
                  value={newRssUrl}
                  onChange={e => setNewRssUrl(e.target.value)}
                  className="w-full p-2.5 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Categoria Própria no Portal</label>
                <select 
                  value={newRssCategory}
                  onChange={e => setNewRssCategory(e.target.value as CategoryType)}
                  className="w-full p-2.5 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 text-slate-800"
                >
                  <option value="Economia">Economia</option>
                  <option value="Política">Política</option>
                  <option value="Negócios">Negócios</option>
                  <option value="Tecnologia">Tecnologia</option>
                  <option value="Geopolítica">Geopolítica</option>
                  <option value="Nacional">Nacional</option>
                  <option value="Esporte">Esporte</option>
                  <option value="Saúde">Saúde</option>
                  <option value="Entretenimento">Entretenimento</option>
                </select>
              </div>

              <button 
                type="submit" 
                className="w-full py-2.5 bg-blue-600 text-white font-bold uppercase tracking-wide rounded hover:bg-blue-700 transition"
              >
                Ativar Novo Canal RSS
              </button>
            </form>

            <div className="bg-slate-50 p-4 border rounded text-[11px] text-slate-500 space-y-2">
              <strong className="text-slate-700 block uppercase tracking-wide text-[10px]">Como funciona o Scraper de IA?</strong>
              Quando você comanda uma busca, o Store Center aciona o inteligência Gemini para reescrever completamente o texto original em uma nova estrutura inédita, livre de plágio, focado em SEO, autogerando mada-tags e subtítulos jornalísticos prontos para cPanel.
            </div>
          </div>

          {/* ACTIVE SCRAPER TABLE */}
          <div className="lg:col-span-2 bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-6">
            <h3 className="text-sm font-bold font-display text-slate-900 border-b border-slate-100 pb-3 uppercase">
              Canais RSS Configurados e Varredura
            </h3>

            {/* AI LOADING PROGRESS BOXED */}
            {scrapingLoading && (
              <div className="bg-gradient-to-r from-blue-900 to-slate-900 text-white rounded-lg p-6 border border-blue-800 shadow-xl flex items-center gap-4 animate-pulse select-none">
                <Loader2 className="w-10 h-10 text-emerald-400 animate-spin flex-shrink-0" />
                <div>
                  <strong className="block text-emerald-300 font-display uppercase tracking-wide text-xs">Acessando Feed RSS & Alimentando Gemini AI</strong>
                  <p className="text-[11px] text-slate-300 mt-1">Nossa agência robô está lendo o feed, comparando estruturas e escrevendo um artigo editorial brasileiro original ampeado para SEO...</p>
                </div>
              </div>
            )}

            {/* SCRAPE RESULT FORM (REVIEW GATEWAY) */}
            {scrapedResult && (
              <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="bg-emerald-100 text-emerald-700 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded">Nova Notícia Reescrita por IA</span>
                    <span className="text-[10px] text-slate-400 font-medium ml-2">Modo: {scrapedResult.hasKey ? 'Gemini 3.5' : 'Simulação'}</span>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => approveScrapedPost(scrapedResult)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wider px-3.5 py-2 rounded shadow transition-all cursor-pointer"
                    >
                      Editar e Publicar Matéria
                    </button>
                    <button 
                      onClick={() => setScrapedResult(null)}
                      className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[11px] font-bold px-3 py-2 rounded cursor-pointer"
                    >
                      Descartar
                    </button>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <p className="font-extrabold text-sm text-slate-950">{scrapedResult.title}</p>
                  <p className="italic font-semibold text-slate-500 mb-2">{scrapedResult.subtitle}</p>
                  <p className="text-[11px] leading-relaxed max-h-[140px] overflow-y-auto bg-white p-3 border rounded font-medium whitespace-pre-wrap">{scrapedResult.content}</p>
                  
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    <span className="font-extrabold text-[10px] text-slate-400 uppercase tracking-widest mr-1">Palavra-Chave Foco / Tags:</span>
                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-[10px] font-bold">{scrapedResult.keyword}</span>
                    {scrapedResult.tags.map((t: string) => (
                      <span key={t} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[10px]">#{t}</span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50">
                    <th className="p-3">Veículo / Fonte</th>
                    <th className="p-3">Feed URL</th>
                    <th className="p-3">Importar na Categoria</th>
                    <th className="p-3 text-right">Ação de Varredura</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {feeds.map(f => (
                    <tr key={f.id} className="hover:bg-slate-50">
                      <td className="p-3 font-bold text-slate-900">{f.name}</td>
                      <td className="p-3 max-w-[200px] font-mono text-slate-400 truncate">{f.url}</td>
                      <td className="p-3">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[10px] uppercase">{f.category}</span>
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            disabled={scrapingLoading}
                            onClick={() => handleExecuteRssScrape(f)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 hover:text-blue-700 px-3 py-2 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-colors disabled:opacity-50"
                          >
                            <Cpu class="w-3.5 h-3.5" /> Reescrever com IA
                          </button>
                          <button 
                            onClick={() => handleDeleteFeed(f.id)}
                            className="text-red-500 hover:text-red-700 p-2 text-xs font-bold"
                          >
                            Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* 3. MULTI-LINKS ASSISTANT COMPARATIVE */}
      {activeTab === 'links' && (
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3.5">
            <span className="bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded inline-block mb-1.5">Mapeador Comparativo de IA</span>
            <h3 className="text-lg font-bold font-display text-slate-950 flex items-center gap-1.5 uppercase tracking-tight">
              <Cpu className="text-purple-600 w-5 h-5 animate-pulse" /> Busca e Consolidação Inteligente de Links (1 a 4 Fontes)
            </h3>
            <p className="text-xs text-slate-500 mt-1">Cole de 1 a 4 URLs de matérias de diferentes veículos (ex: G1, Exame, etc.). A inteligência Gemini lerá as informações contidas, fará a checagem cruzada, avisará se houver contradição de dados e gerará uma nova matéria editorial exclusiva, neutra e pronta para publicar!</p>
          </div>

          <form onSubmit={handleCompareLinks} className="space-y-6 text-xs max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wide select-none">Inserir Links das Fontes</p>
                {comparativeLinks.map((link, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="bg-slate-100 text-slate-500 w-6 h-6 rounded flex items-center justify-center font-bold text-[10px] select-none shrink-0">{idx + 1}</span>
                    <input 
                      type="url" 
                      placeholder="https://g1.globo.com/economia/noticia/..."
                      value={link}
                      onChange={(e) => {
                        const copy = [...comparativeLinks];
                        copy[idx] = e.target.value;
                        setComparativeLinks(copy);
                      }}
                      className="flex-1 p-2.5 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 text-xs"
                    />
                  </div>
                ))}

                <button 
                  type="button"
                  onClick={() => {
                    if (comparativeLinks.length < 4) {
                      setComparativeLinks([...comparativeLinks, '']);
                    } else {
                      alert("O limite máximo de links sugeridos é 4.");
                    }
                  }}
                  className="text-[10px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1 uppercase cursor-pointer select-none"
                >
                  + Adicionar mais um link (Limite 4)
                </button>
              </div>

              <div className="space-y-3 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <p className="font-bold text-slate-700 text-[10px] uppercase tracking-wide select-none">Configuração do Artigo Final</p>
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Direcionar para Categoria</label>
                  <select 
                    value={comparativeCategory}
                    onChange={e => setComparativeCategory(e.target.value as CategoryType)}
                    className="w-full text-xs p-2.5 rounded bg-white border border-slate-200 focus:outline-none focus:border-blue-600 text-slate-800 font-semibold"
                  >
                    <option value="Economia">Economia</option>
                    <option value="Política">Política</option>
                    <option value="Negócios">Negócios</option>
                    <option value="Tecnologia">Tecnologia</option>
                    <option value="Geopolítica">Geopolítica</option>
                    <option value="Nacional">Nacional</option>
                    <option value="Esporte">Esporte</option>
                    <option value="Saúde">Saúde</option>
                    <option value="Entretenimento">Entretenimento</option>
                  </select>
                </div>

                <div className="text-[11px] text-slate-500 leading-relaxed pt-2">
                  <strong className="text-slate-700 uppercase block mb-0.5 text-[9px]">Análise de Conflitos Factuais:</strong>
                  Caso o link 1 e o link 2 relatem dados contraditórios sobre o mesmo evento, o sistema criará um parecer de alerta e alertará o redator na revisão.
                </div>
              </div>
            </div>

            <button 
              type="submit"
              disabled={comparisonLoading}
              className="w-full md:w-auto px-6 py-3.5 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-bold uppercase tracking-wider rounded-lg shadow-md cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5 select-none"
            >
              {comparisonLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Processando Comparação e Escrevendo...
                </>
              ) : (
                <>
                  <Cpu class="w-4 h-4" /> Comparar Fontes e Gerar Notícia
                </>
              )}
            </button>
          </form>

          {/* AI OUTPUT GRID REWROTE */}
          {comparisonResult && (
            <div className="border border-slate-200 bg-slate-50 rounded-xl p-6 space-y-5">
              
              {/* HEADER ALERT IF CONFLICTS CITED */}
              {comparisonResult.conflicts && comparisonResult.conflicts !== 'Sem conflitos' ? (
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-lg flex gap-3 text-slate-600 text-xs">
                  <AlertTriangle className="text-amber-500 w-5 h-5 shrink-0" />
                  <div>
                    <strong className="text-amber-800 block uppercase tracking-wider text-[10px]">⚠️ Divergência Factual Detectada na Leitura Cruza:</strong>
                    <p className="mt-0.5 font-medium leading-normal">{comparisonResult.conflicts}</p>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-100 p-3.5 rounded-lg text-emerald-800 text-xs font-semibold flex items-center gap-2">
                  <CheckCircle2 class="text-emerald-500 w-5 h-5 shrink-0" /> Coerência factual verificada. Todas as fontes concordam sem contradições lógicas.
                </div>
              )}

              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 pb-4 gap-3">
                <div>
                  <h4 className="text-sm font-extrabold text-slate-900">Análise Consolidada Gerada</h4>
                  <p className="text-[10px] text-slate-400">Fontes Cruzadas: {comparisonResult.sourcesAnalyzed ? comparisonResult.sourcesAnalyzed.join(" & ") : "Web"}</p>
                </div>
                <button 
                  onClick={() => approveComparisonPost(comparisonResult)}
                  className="bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider px-5 py-2.5 rounded shadow transition-all cursor-pointer"
                >
                  Aprovar e Mandar para Editor
                </button>
              </div>

              <div className="bg-white p-6 border rounded-lg space-y-4 text-xs text-slate-800 leading-relaxed">
                <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-sm inline-block">Proposta Pronta</span>
                <p className="text-base font-black text-slate-950 leading-tight block">{comparisonResult.title}</p>
                <p className="italic font-bold text-slate-500 text-[11px] mb-3">{comparisonResult.subtitle}</p>
                <div className="border-t border-slate-100 pt-3 whitespace-pre-wrap font-medium">{comparisonResult.content}</div>

                <div className="bg-slate-50 p-3.5 rounded border text-[10px] text-slate-600 font-mono mt-4">
                  <span className="block font-bold text-slate-800 uppercase tracking-widest mb-1">PROMPT DE IMAGEM GERADO:</span>
                  "{comparisonResult.imagePrompt}"
                </div>
              </div>
            </div>
          )}

        </div>
      )}

      {/* 4. SCHEDULER BOARD / CALENDAR */}
      {activeTab === 'schedule' && (
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-sm font-bold font-display text-slate-900 uppercase">Calendário e Lista de Matérias Agendadas</h3>
            <p className="text-xs text-slate-500 mt-1">Veja seus posts programados. Eles serão publicados automaticamente no portal na hora agendada.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <strong className="text-[10px] text-slate-400 uppercase tracking-widest block font-bold select-none">Fila de Publicação Programada</strong>
              
              {posts.filter(p => p.status === 'scheduled').length === 0 ? (
                <div className="p-8 border border-dashed rounded text-center text-slate-500 text-xs">
                  Nenhum post programado no momento. Use a aba "Publicações" para agendar uma notícia!
                </div>
              ) : (
                <div className="space-y-3">
                  {posts.filter(p => p.status === 'scheduled').map(sch => (
                    <div key={sch.id} className="bg-slate-50/70 border border-slate-200 rounded-lg p-4 flex justify-between gap-4">
                      <div>
                        <span className="bg-amber-100 text-amber-800 text-[9px] font-extrabold uppercase px-2 py-0.5 rounded">
                          ⏰ {sch.publishAt ? new Date(sch.publishAt).toLocaleString('pt-BR') : 'Agendado'}
                        </span>
                        <h4 className="text-xs font-bold text-slate-900 mt-1.5 line-clamp-1">{sch.title}</h4>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Categoria: {sch.category}</span>
                      </div>
                      <div className="text-right flex flex-col justify-end">
                        <button 
                          onClick={async () => {
                            // Publish now bypass helper
                            if (confirm("Deseja publicar imediatamente este artigo no ar?")) {
                              await fetch(`/api/posts/${sch.id}`, {
                                method: 'PUT',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'published', date: new Date().toISOString() })
                              });
                              onRefreshData();
                            }
                          }}
                          className="text-[10px] font-bold text-blue-600 hover:underline cursor-pointer select-none uppercase"
                        >
                          Publicar Agora &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-50 p-5 rounded-lg border border-slate-200 space-y-4">
              <strong className="text-[10px] font-bold text-slate-800 uppercase tracking-widest block select-none">Cronologia de Publicações (Dashboard)</strong>
              <div className="space-y-4 text-xs font-medium">
                <div className="flex gap-3">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full mt-1 shrink-0"></div>
                  <div>
                    <span className="font-bold text-slate-900 block">Automação de Horários nos Servidores cPanel</span>
                    <p className="text-[11px] text-slate-500">Se você estiver hospedando em cPanel comum, configure uma <strong>Cron Job</strong> disparando uma chamada a cada 5 ou 10 minutos para publicar os agendados automaticamente. O modelo de cron correto está no arquivo README.</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="w-2.5 h-2.5 bg-amber-500 rounded-full mt-1 shrink-0"></div>
                  <div>
                    <span className="font-bold text-slate-900 block">Modificação Fácil de Agenda</span>
                    <p className="text-[11px] text-slate-500">Para remarcar o horário do post agendado, clique na caneta de edição de posts (aba 1), selecione "Agendar", defina um novo dia/hora e guarde as edições.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}

      {/* 5. ADSENSE AD CODE COORDINATOR */}
      {activeTab === 'ads' && (
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-3.5 flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold font-display text-slate-900 uppercase">Blocos de Anúncios Google AdSense</h3>
              <p className="text-xs text-slate-500 mt-1">Gerencie os scripts do Google AdSense do seu layout de forma unificada.</p>
            </div>
            <button 
              onClick={handleSaveAds}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider rounded shadow flex items-center gap-1.5 cursor-pointer selection:bg-emerald-800"
            >
              <Save class="w-4 h-4" /> Salvar Códigos
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            {localAds.map((ad, idx) => (
              <div key={ad.id} className="bg-slate-50 border border-slate-200 rounded-lg p-5 space-y-3">
                <div className="flex justify-between items-center border-b border-slate-200 pb-2">
                  <span className="font-bold text-slate-950 uppercase text-[10px] tracking-wide font-display">{ad.name}</span>
                  <label className="flex items-center gap-1.5 font-bold text-slate-600 uppercase text-[10px] select-none cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={ad.enabled}
                      onChange={(e) => {
                        const copy = [...localAds];
                        copy[idx].enabled = e.target.checked;
                        setLocalAds(copy);
                      }}
                    /> Ativo
                  </label>
                </div>

                <div>
                  <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Código Script HTML / Script Google AdSense</label>
                  <textarea 
                    rows={4}
                    value={ad.code}
                    onChange={(e) => {
                      const copy = [...localAds];
                      copy[idx].code = e.target.value;
                      setLocalAds(copy);
                    }}
                    className="w-full font-mono text-[10.5px] p-2.5 rounded bg-white border border-slate-200 focus:outline-none focus:border-blue-600 text-slate-700"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. GENERAL CONFIGS */}
      {activeTab === 'settings' && (
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm max-w-2xl">
          <div className="border-b border-slate-100 pb-3 mb-5">
            <h3 className="text-sm font-bold font-display text-slate-900 uppercase">Configurações Gerais do Portal</h3>
            <p className="text-xs text-slate-500 mt-1">Ajuste as strings globais do site e tags institucionais.</p>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Nome do Veículo Oficial</label>
              <input 
                type="text" 
                required
                value={siteName}
                onChange={e => setSiteName(e.target.value)}
                className="w-full p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Descrição Comercial (Meta-Tag description principal)</label>
              <textarea 
                rows={3}
                required
                value={siteDescr}
                onChange={e => setSiteDescr(e.target.value)}
                className="w-full p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">E-mail de Contato da Redação</label>
                <input 
                  type="email" 
                  value={contactEmail}
                  onChange={e => setContactEmail(e.target.value)}
                  className="w-full p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800 text-xs"
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">ID Google Analytics</label>
                <input 
                  type="text" 
                  placeholder="UA-XXXXXXXX-Y ou G-XXXXXXXX"
                  value={analyticsId}
                  onChange={e => setAnalyticsId(e.target.value)}
                  className="w-full p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800 text-xs font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Texto de Copyright no Rodapé</label>
              <input 
                type="text" 
                value={footerText}
                onChange={e => setFooterText(e.target.value)}
                className="w-full p-2.5 rounded bg-slate-50 border border-slate-200 text-slate-800 text-xs"
              />
            </div>

            <button 
              type="submit" 
              className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase tracking-wider rounded shadow transition cursor-pointer select-none"
            >
              Guardar Configurações
            </button>
          </form>
        </div>
      )}

      {/* 7. CPANEL EXPORTER INCUBATED */}
      {activeTab === 'cpanel' && (
        <PhpExporter />
      )}

    </div>
  );
}
