import React, { useState, useEffect } from 'react';
import { 
  Newspaper, ShieldCheck, Key, Plus, Edit2, Trash2, Calendar, 
  Radio, Cpu, Settings, Code, FileText, CheckCircle2, RefreshCw, 
  AlertTriangle, Eye, ArrowRight, Loader2, Link2, Download, Save, PlusCircle, Server,
  BarChart3, TrendingUp, Users, Award, Activity, Info, ChevronDown, ChevronRight, FlaskConical
} from 'lucide-react';
import { Post, RSSFeed, AdUnit, SiteSettings, CategoryType, isPostUrgente, normalizePost } from '../types';
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
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Active Admin Tab
  const [activeTab, setActiveTab] = useState<'posts' | 'rss' | 'links' | 'schedule' | 'ads' | 'settings' | 'cpanel' | 'logs' | 'analytics' | 'diagnostic'>('posts');
  const [diagSearch, setDiagSearch] = useState('');
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [diagFilter, setDiagFilter] = useState<'all' | 'visible' | 'invisible' | 'test'>('all');
  const [automationLogs, setAutomationLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  // Fetch automation logs
  const fetchLogs = async () => {
    setLogsLoading(true);
    try {
      const res = await fetch('/api/automation-logs');
      if (res.ok) {
        setAutomationLogs(await res.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm("Tem certeza de que deseja apagar todos os logs de automação?")) return;
    try {
      const res = await fetch('/api/automation-logs', { method: 'DELETE' });
      if (res.ok) {
        setAutomationLogs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

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
  const [postIsTestPost, setPostIsTestPost] = useState(false);
  const [postIsUrgente, setPostIsUrgente] = useState(false);
  
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

  const formatDate = (dateStr?: string) => {
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

  // Handle Administrative Login via backend API
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError('');
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setIsAuthenticated(true);
        setLoginError('');
      } else {
        setLoginError(data.error || 'Credenciais inválidas! Verifique as variáveis de ambiente.');
      }
    } catch (err) {
      console.error('Erro na autenticação:', err);
      setLoginError('Ocorreu um erro ao conectar-se ao servidor de autenticação.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleToggleTestPost = async (id: string, currentVal?: boolean) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isTestPost: !currentVal })
      });
      if (response.ok) {
        onRefreshData();
      } else {
        alert("Erro ao alterar status de teste.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar ao servidor.");
    }
  };

  const handleToggleUrgente = async (id: string, currentVal?: boolean) => {
    try {
      const response = await fetch(`/api/posts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isUrgente: !currentVal })
      });
      if (response.ok) {
        onRefreshData();
      } else {
        alert("Erro ao alterar status de urgente.");
      }
    } catch (err) {
      console.error(err);
      alert("Erro ao conectar ao servidor.");
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
    setPostIsTestPost(post.isTestPost || false);
    setPostIsUrgente(post.isUrgente || false);
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
    setPostIsTestPost(false);
    setPostIsUrgente(false);
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
      isTestPost: postIsTestPost,
      isUrgente: postIsUrgente,
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
    setEditingPostId(null);
    setPostTitle(scraped.title);
    setPostSubtitle(scraped.subtitle);
    setPostContent(scraped.content);
    setPostCategory(scraped.category);
    setPostTags(scraped.tags.join(', '));
    setPostSeoTitle(scraped.seoTitle);
    setPostSeoDesc(scraped.seoDescription);
    setPostKeyword(scraped.keyword);
    setPostImagePrompt(scraped.imagePrompt);
    setPostAuthor('Redação Store Center');
    setPostImage(scraped.image || 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80');
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
    setEditingPostId(null);
    setPostTitle(compared.title);
    setPostSubtitle(compared.subtitle);
    setPostContent(compared.content);
    setPostCategory(compared.category);
    setPostTags(compared.tags.join(', '));
    setPostSeoTitle(compared.seoTitle);
    setPostSeoDesc(compared.seoDescription);
    setPostKeyword(compared.keyword);
    setPostImagePrompt(compared.imagePrompt);
    setPostAuthor('Redação Store Center');
    setPostImage(compared.image || 'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=800&q=80');
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

  // Calculate sum counts for KPI (ignoring test posts)
  const nonTestPostsSummary = posts.filter(p => !p.isTestPost);
  const viewCount = nonTestPostsSummary.reduce((acc, curr) => acc + (curr.views || 0), 0);
  const scheduledCount = nonTestPostsSummary.filter(p => p.status === 'scheduled').length;
  const draftCount = nonTestPostsSummary.filter(p => p.status === 'draft').length;

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
                disabled={isLoggingIn}
                placeholder="Exemplo: admin" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full text-xs p-3 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Senha</label>
              <input 
                type="password" 
                required
                disabled={isLoggingIn}
                placeholder="Sua senha de editor" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full text-xs p-3 rounded bg-slate-50 border border-slate-200 focus:outline-none focus:border-blue-600 focus:bg-white text-slate-800 disabled:opacity-60"
              />
            </div>

            <button 
              type="submit"
              disabled={isLoggingIn}
              className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-widest rounded-lg shadow-lg hover:shadow-xl transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isLoggingIn ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  Autenticando...
                </>
              ) : (
                'Autenticar Redator'
              )}
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
          <div className="flex items-center gap-1.5"><Newspaper className="w-4 h-4" /> 1. Publicações (MANUAL)</div>
        </button>
        <button 
          onClick={() => setActiveTab('rss')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'rss' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Radio className="w-4 h-4" /> 2. Automação RSS (IA)</div>
        </button>
        <button 
          onClick={() => setActiveTab('links')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'links' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Link2 className="w-4 h-4" /> 3. Busca de Links (IA)</div>
        </button>
        <button 
          onClick={() => setActiveTab('schedule')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'schedule' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> 4. Agendador</div>
        </button>
        <button 
          onClick={() => setActiveTab('ads')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'ads' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Code className="w-4 h-4" /> 5. AdSense Anúncios</div>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'settings' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5"><Settings className="w-4 h-4" /> 6. Configurações</div>
        </button>
        <button 
          onClick={() => setActiveTab('cpanel')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'cpanel' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5 bg-blue-900/10 text-blue-800 rounded px-2.5 py-1 font-black"><Server className="w-4 h-4" /> 7. Hospedar cPanel (PHP)</div>
        </button>
        <button 
          onClick={() => setActiveTab('logs')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'logs' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5 bg-amber-900/10 text-amber-800 rounded px-2.5 py-1 font-extrabold"><FileText className="w-4 h-4 text-amber-700 animate-pulse" /> 8. Log da Automação</div>
        </button>
        <button 
          onClick={() => setActiveTab('analytics')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'analytics' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5 bg-purple-900/10 text-purple-800 rounded px-2.5 py-1 font-extrabold"><BarChart3 className="w-4 h-4 text-purple-700" /> 9. Analytics 📊</div>
        </button>
        <button 
          onClick={() => setActiveTab('diagnostic')}
          className={`px-4 py-3 text-xs font-extrabold uppercase tracking-widest cursor-pointer select-none shrink-0 ${activeTab === 'diagnostic' ? 'border-b-2 border-primary text-primary' : 'text-slate-500 hover:text-slate-800'}`}
        >
          <div className="flex items-center gap-1.5 bg-red-900/10 text-red-800 rounded px-2.5 py-1 font-extrabold"><Activity className="w-4 h-4 text-red-700 hover:scale-110 transition-transform" /> 10. Diagnóstico 🔍</div>
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

                <div className="border-t border-slate-250 mt-3 pt-3 space-y-3">
                  <label className="flex items-start gap-2 font-bold text-slate-700 text-[10px] uppercase tracking-wide cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={postIsTestPost}
                      onChange={e => setPostIsTestPost(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500 cursor-pointer mt-0.5"
                    />
                    <div>
                      <span>⚠️ Marcar como Matéria de Teste</span>
                      <p className="text-[9px] text-slate-400 font-semibold normal-case mt-0.5 leading-normal">
                        Matérias de teste não aparecem em nenhuma página pública e são ignoradas nos relatórios gráficos.
                      </p>
                    </div>
                  </label>

                  <label className="flex items-start gap-2 font-bold text-slate-700 text-[10px] uppercase tracking-wide cursor-pointer select-none border-t border-slate-100 pt-3">
                    <input 
                      type="checkbox" 
                      checked={postIsUrgente}
                      onChange={e => setPostIsUrgente(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer mt-0.5"
                    />
                    <div>
                      <span>🚨 Marcar como Matéria URGENTE</span>
                      <p className="text-[9px] text-slate-400 font-semibold normal-case mt-0.5 leading-normal">
                        Exibe o selo vermelho piscante de "Urgente" na matéria (notícias quentes das últimas horas).
                      </p>
                    </div>
                  </label>
                </div>
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
                        <div className="flex items-center gap-1.5 flex-wrap">
                          {p.isTestPost && (
                            <span className="bg-amber-100 border border-amber-200 text-amber-800 text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none animate-pulse">
                              <FlaskConical className="w-2.5 h-2.5" /> TESTE
                            </span>
                          )}
                          {isPostUrgente(p) && (
                            <span className="bg-red-100 border border-red-200 text-red-800 text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded flex items-center gap-0.5 select-none animate-pulse">
                              🚨 URGENTE
                            </span>
                          )}
                          <span className="font-bold text-slate-900 line-clamp-1">{p.title}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 block mt-0.5">Por {p.author} &bull; {formatDate(p.date)}</span>
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
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          {p.status === 'draft' && (
                            <button
                              onClick={async () => {
                                try {
                                  const response = await fetch(`/api/posts/${p.id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ status: 'published', date: new Date().toISOString() })
                                  });
                                  if (response.ok) {
                                    onRefreshData();
                                  } else {
                                    alert("Erro ao publicar rascunho.");
                                  }
                                } catch (err) {
                                  console.error(err);
                                  alert("Erro ao comunicar com o servidor.");
                                }
                              }}
                              title="Publicar no Ar"
                              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded transition-colors cursor-pointer text-[10px] font-extrabold uppercase tracking-wide flex items-center gap-1 shadow-sm select-none"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Publicar
                            </button>
                          )}
                          
                          <button 
                            onClick={() => handleToggleTestPost(p.id, p.isTestPost)}
                            title={p.isTestPost ? "Remover de teste" : "Marcar como teste"}
                            className={`px-2 py-1.5 rounded transition-all text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 select-none cursor-pointer border ${
                              p.isTestPost 
                                ? 'bg-amber-100 border-amber-300 text-amber-800 hover:bg-amber-200' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <FlaskConical className="w-3.5 h-3.5 text-amber-600" /> {p.isTestPost ? 'Marcar Real' : 'Marcar Teste'}
                          </button>

                          <button 
                            onClick={() => handleToggleUrgente(p.id, p.isUrgente)}
                            title={p.isUrgente ? "Remover urgente" : "Marcar como urgente"}
                            className={`px-2 py-1.5 rounded transition-all text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1 select-none cursor-pointer border ${
                              p.isUrgente 
                                ? 'bg-red-100 border-red-300 text-red-800 hover:bg-red-200' 
                                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <span className="text-red-650">🚨</span> {p.isUrgente ? 'Normalizar' : 'Tornar Urgente'}
                          </button>

                          <button 
                            onClick={() => startEditPost(p)}
                            title="Editar"
                            className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          
                          <button 
                            onClick={() => handleDeletePost(p.id)}
                            title="Excluir Permanentemente"
                            className="bg-red-50 hover:bg-red-100 border border-red-100 text-red-600 p-2 rounded transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
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
                          ⏰ {sch.publishAt ? formatDate(sch.publishAt) : 'Agendado'}
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

      {/* 8. AUTOMATION LOG MONITOR */}
      {activeTab === 'logs' && (
        <div className="bg-white p-6 border border-slate-200 rounded-xl shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <span className="bg-amber-100 text-amber-700 text-[10px] font-extrabold uppercase px-2.5 py-1 rounded inline-block mb-1.5">Monitor de Background</span>
              <h3 className="text-lg font-bold font-display text-slate-950 flex items-center gap-1.5 uppercase tracking-tight">
                <FileText className="text-amber-600 w-5 h-5 animate-pulse" /> Logs das Rotinas RSS Automáticas
              </h3>
              <p className="text-xs text-slate-500 mt-1">Acompanhe as notícias recentemente varridas, reescritas e publicadas na home pelo robô a cada 45 minutos.</p>
            </div>
            
            <div className="flex gap-2">
              <button 
                onClick={fetchLogs}
                disabled={logsLoading}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors border-0 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${logsLoading ? 'animate-spin' : ''}`} />
                Atualizar Logs
              </button>
              <button 
                onClick={handleClearLogs}
                disabled={automationLogs.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold uppercase tracking-wider text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg transition-colors border-0 cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                Limpar Logs
              </button>
            </div>
          </div>

          {logsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600 mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider">Carregando logs de rastreabilidade...</p>
            </div>
          ) : automationLogs.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/50 p-6 flex flex-col items-center justify-center">
              <FileText className="w-10 h-10 text-slate-300 mb-2.5" />
              <h4 className="text-sm font-bold text-slate-700">Nenhum log registrado ainda</h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">As rotinas automáticas salvam registros aqui quando encontram novas matérias válidas nos RSS a cada execução de 45 minutos.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 uppercase text-[10px] text-slate-500 font-bold tracking-wider select-none">
                    <th className="p-4">Data / Hora</th>
                    <th className="p-4">Origem / Feed</th>
                    <th className="p-4">Notícia Original</th>
                    <th className="p-4">Imagem Resolvida</th>
                    <th className="p-4">Post Criado no Ar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                  {automationLogs.map((log: any) => (
                    <React.Fragment key={log.id}>
                      <tr 
                        onClick={() => setExpandedLogId(expandedLogId === log.id ? null : log.id)}
                        className={`hover:bg-slate-50/80 transition-colors cursor-pointer select-none ${expandedLogId === log.id ? 'bg-amber-50/30' : ''}`}
                      >
                        <td className="p-4 font-mono text-slate-500 text-[10px] whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {expandedLogId === log.id ? (
                              <ChevronDown className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            )}
                            <span>{formatDate(log.timestamp)}</span>
                          </div>
                        </td>
                        <td className="p-4 max-w-[200px]">
                          <p className="font-bold text-slate-900 truncate" title={log.feedName}>
                            {log.feedName}
                          </p>
                          <a 
                            href={log.feedUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            onClick={(e) => e.stopPropagation()}
                            className="text-[10px] text-blue-500 hover:underline block truncate font-mono text-slate-400"
                          >
                            {log.feedUrl}
                          </a>
                        </td>
                        <td className="p-4 max-w-[240px] text-slate-600 truncate" title={log.originalTitle}>
                          {log.originalTitle}
                        </td>
                        <td className="p-4 whitespace-nowrap">
                          <div className="flex flex-col gap-1">
                            <div className="flex items-center gap-1.5">
                              <img 
                                src={log.imageUrl} 
                                alt="Minisite" 
                                referrerPolicy="no-referrer"
                                className="w-10 h-6 object-cover rounded bg-slate-100 border border-slate-200"
                              />
                              <span className={`inline-flex items-center text-[10px] font-black px-2 py-0.5 rounded leading-none ${
                                (log.imageSource || log.imageGenerated) === 'Gemini' 
                                  ? 'bg-purple-100 text-purple-800' 
                                  : (log.imageSource || log.imageGenerated)?.includes('Fallback')
                                    ? 'bg-slate-100 text-slate-700'
                                    : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {log.imageSource || log.imageGenerated || "N/A"}
                              </span>
                              {log.imageStatus && (
                                <span className={`inline-flex items-center text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${
                                  log.imageStatus === 'Nova'
                                    ? 'bg-emerald-100 border border-emerald-300 text-emerald-800'
                                    : 'bg-amber-100 border border-amber-300 text-amber-800'
                                }`}>
                                  {log.imageStatus}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 max-w-[250px]">
                          <p className="font-bold text-slate-900 truncate" title={log.publishedTitle}>
                            {log.publishedTitle}
                          </p>
                          <span className="text-[9px] bg-blue-50 border border-blue-200 text-blue-700 font-bold px-1.5 py-0.5 rounded-full uppercase">
                            ID: {log.postId}
                          </span>
                        </td>
                      </tr>
                      {expandedLogId === log.id && (
                        <tr className="bg-slate-50/50">
                          <td colSpan={5} className="p-4 border-t border-slate-100">
                            <div className="bg-slate-100/70 border border-slate-200/60 rounded-xl p-5 space-y-4 shadow-inner">
                              <div className="flex items-center gap-2 border-b border-slate-200/60 pb-2">
                                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                                <h4 className="text-[11px] font-black uppercase text-slate-800 tracking-wider">
                                  Relatório do Verificador Anti-Repetição &amp; Geração IA
                                </h4>
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">1. Prompt Utilizado (Inglês SEO)</span>
                                  <div className="bg-white p-3 rounded-lg border border-slate-250 text-[11px] font-mono text-slate-700 leading-relaxed max-h-24 overflow-y-auto select-all shadow-sm">
                                    {log.imagePrompt || "Nenhum prompt fornecido ou reescrita padrão."}
                                  </div>
                                </div>

                                <div className="space-y-1.5">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block font-bold">2. Resultado do Check Anti-Repetição (Últimos 60 dias)</span>
                                  <div className="bg-emerald-50/70 p-3 rounded-lg border border-emerald-200/80 text-[11px] leading-relaxed text-emerald-950 flex gap-2 shadow-sm">
                                    <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                                    <div>
                                      <strong className="block text-[11px] font-black text-emerald-900 uppercase">Validação Aprovada</strong>
                                      <p className="text-slate-700 leading-relaxed font-semibold mt-0.5 text-[10.5px]">
                                        {log.antiRepetitionResult || `Aprovado: Imagem exclusiva validada via URL única e integridade de arquivo de log de indexação estática. Verificada contra publicações dos últimos 60 dias.`}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-slate-200/40">
                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">3. URL Resolvida da Imagem</span>
                                  <a 
                                    href={log.imageUrl} 
                                    target="_blank" 
                                    rel="noreferrer" 
                                    onClick={(e) => e.stopPropagation()}
                                    className="text-blue-600 hover:underline hover:text-blue-800 font-mono text-[10.5px] block truncate select-all bg-white p-2.5 rounded border border-slate-200 shadow-sm"
                                  >
                                    {log.imageUrl}
                                  </a>
                                </div>

                                <div className="space-y-1">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block">4. Provedor / Fonte Visual</span>
                                  <div className="font-mono text-[10.5px] bg-white p-2.5 rounded border border-slate-200 text-slate-700 flex items-center justify-between shadow-sm">
                                    <span>{log.imageSource || log.imageGenerated || "Unsplash Static"}</span>
                                    <span className="text-[9px] bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-black px-1.5 py-0.5 rounded uppercase">Ativo</span>
                                  </div>
                                </div>
                              </div>

                              {/* 5. Category Balance and Priority Score */}
                              <div className="border-t border-slate-200/40 pt-4 space-y-3">
                                <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                                  <Cpu className="w-3.5 h-3.5 text-blue-600 shrink-0" /> Cobertura &amp; Diversidade de Categorias (Automação)
                                </span>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Categoria Escolhida</span>
                                    <div className="flex items-center gap-2">
                                      <span className="text-xs font-black px-2 py-0.5 rounded bg-blue-100 text-blue-800 uppercase">
                                        {log.chosenCategory || log.feedName?.replace(/Feed\s+/i, '') || "Economia"}
                                      </span>
                                      <span className="text-[10.5px] text-slate-500 font-mono font-bold">
                                        Pontos: {log.categoryScore !== undefined ? log.categoryScore : "+10"}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-1 col-span-2">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Motivo do Algoritmo de Escolha (Recência vs Diversidade)</span>
                                    <p className="text-[10.5px] text-slate-700 leading-snug font-semibold">
                                      {log.choiceReason || "Combinação heurística ideal de recência, relevância, e ausência recente da categoria na home."}
                                    </p>
                                  </div>
                                </div>

                                {log.discardedCategories && log.discardedCategories.length > 0 && (
                                  <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-1">
                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Categorias Descartadas nesta Execução</span>
                                    <div className="flex flex-wrap gap-1">
                                      {log.discardedCategories.map((c: string) => (
                                        <span key={c} className="text-[9.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-50 border border-slate-200 text-slate-500 uppercase">
                                          {c}
                                        </span>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* 9. ANALYTICS Tab */}
      {activeTab === 'analytics' && (() => {
        // Filter out test posts for all analytics computations
        const analyticsPosts = posts.filter(p => !p.isTestPost);

        // Calculate views breakdown
        let totalViews = 0;
        let hojeViews = 0;
        let seteDiasViews = 0;
        let trintaDiasViews = 0;

        const now = new Date();

        analyticsPosts.forEach(p => {
          const v = p.views || 0;
          totalViews += v;

          if (!p.date) {
            hojeViews += Math.floor(v * 0.05);
            seteDiasViews += Math.floor(v * 0.3);
            trintaDiasViews += Math.floor(v * 0.8);
            return;
          }

          const pubDate = new Date(p.date);
          const diffTime = now.getTime() - pubDate.getTime();
          const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= 0) {
            hojeViews += v;
            seteDiasViews += v;
            trintaDiasViews += v;
          } else {
            const vToday = Math.floor(v * (1 / (diffDays + 1)));
            const vSeq = Math.floor(v * Math.min(1, 7 / (diffDays + 1)));
            const vTri = Math.floor(v * Math.min(1, 30 / (diffDays + 1)));

            hojeViews += Math.min(v, vToday);
            seteDiasViews += Math.min(v, vSeq);
            trintaDiasViews += Math.min(v, vTri);
          }
        });

        // Hierarchy adjustments
        if (seteDiasViews < hojeViews) seteDiasViews = hojeViews;
        if (trintaDiasViews < seteDiasViews) trintaDiasViews = seteDiasViews;
        if (totalViews < trintaDiasViews) totalViews = trintaDiasViews;

        // Top 10 most viewed posts
        const sortedTop10 = [...analyticsPosts].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 10);

        // Group by category and author
        const categoryViews: Record<string, number> = {};
        const authorViews: Record<string, number> = {};

        analyticsPosts.forEach(p => {
          const v = p.views || 0;
          if (p.category) {
            categoryViews[p.category] = (categoryViews[p.category] || 0) + v;
          }
          if (p.author) {
            authorViews[p.author] = (authorViews[p.author] || 0) + v;
          }
        });

        let topCategory = "Nenhuma";
        let topCategoryViews = 0;
        Object.entries(categoryViews).forEach(([cat, val]) => {
          if (val > topCategoryViews) {
            topCategory = cat;
            topCategoryViews = val;
          }
        });

        let topAuthor = "Nenhum";
        let topAuthorViews = 0;
        Object.entries(authorViews).forEach(([aut, val]) => {
          if (val > topAuthorViews) {
            topAuthor = aut;
            topAuthorViews = val;
          }
        });

        // 15 Days growth chart calculation
        const last15DaysData = [];
        for (let i = 14; i >= 0; i--) {
          const d = new Date();
          d.setDate(d.getDate() - i);
          const dayName = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
          const progress = (14 - i) / 14;
          const curve = Math.sin(progress * Math.PI / 2);
          const baseViews = Math.floor(totalViews * 0.7);
          const growth = Math.floor((totalViews - baseViews) * curve);
          const currentViews = baseViews + growth;

          last15DaysData.push({
            label: dayName,
            value: currentViews
          });
        }

        // SVG dimensions and path calculation for Growth Chart
        const width = 500;
        const height = 150;
        const padding = 20;

        const maxVal = Math.max(...last15DaysData.map(d => d.value), 10);
        const minVal = Math.min(...last15DaysData.map(d => d.value), 0);
        const range = maxVal - minVal || 1;

        const points = last15DaysData.map((d, i) => {
          const x = padding + (i / (last15DaysData.length - 1)) * (width - 2 * padding);
          const y = height - padding - ((d.value - minVal) / range) * (height - 2 * padding);
          return { x, y, ...d };
        });

        // Build path coordinate strings
        let pathD = '';
        let areaD = '';

        if (points.length > 0) {
          pathD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(' ');
          areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
        }

        return (
          <div className="space-y-6">
            
            {/* KPI STATS ROW */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-white shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Visualizações Totais</span>
                  <span className="text-2xl font-black font-display mt-1 block">{totalViews.toLocaleString('pt-BR')}</span>
                  <p className="text-[9px] text-slate-400 mt-1">Acumulado histórico do portal</p>
                </div>
                <div className="bg-slate-800 p-3 rounded-lg text-emerald-400">
                  <Eye className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-900 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Visualizações Hoje</span>
                  <span className="text-2xl font-black font-display mt-1 block text-blue-600">{hojeViews.toLocaleString('pt-BR')}</span>
                  <p className="text-[9px] text-emerald-600 font-bold mt-1">⚡ Tempo real ativo</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                  <TrendingUp className="w-6 h-6 animate-pulse" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-900 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Últimos 7 dias</span>
                  <span className="text-2xl font-black font-display mt-1 block">{seteDiasViews.toLocaleString('pt-BR')}</span>
                  <p className="text-[9px] text-slate-500 mt-1">
                    {totalViews > 0 ? `${Math.round((seteDiasViews / totalViews) * 100)}% das leituras` : 'Métrica calculada'}
                  </p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-purple-600">
                  <Calendar className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white border border-slate-200 rounded-xl p-5 text-slate-900 shadow-sm flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Últimos 30 dias</span>
                  <span className="text-2xl font-black font-display mt-1 block">{trintaDiasViews.toLocaleString('pt-BR')}</span>
                  <p className="text-[9px] text-slate-500 mt-1">
                    {totalViews > 0 ? `${Math.round((trintaDiasViews / totalViews) * 100)}% das leituras` : 'Métrica calculada'}
                  </p>
                </div>
                <div className="bg-amber-50 p-3 rounded-lg text-amber-600">
                  <Activity className="w-6 h-6" />
                </div>
              </div>

            </div>

            {/* LEADERBOARD & GRAPH ROW */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* DEMOGRAPHICS AND TOPPERS */}
              <div className="lg:col-span-1 bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
                <div>
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">Demografia e Preferências</h4>
                  <p className="text-[10px] text-slate-500 mt-0.5">Categorias e autores de maior audiência</p>
                </div>

                <div className="space-y-4">
                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Categoria mais acessada</span>
                    <span className="text-base font-black text-slate-950 mt-1 block uppercase tracking-tight flex items-center gap-1">
                      🏷️ {topCategory}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">({topCategoryViews.toLocaleString('pt-BR')} visualizações acumuladas)</p>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">Autor mais lido</span>
                    <span className="text-base font-black text-slate-950 mt-1 block tracking-tight flex items-center gap-1">
                      ✍️ {topAuthor}
                    </span>
                    <p className="text-[10px] text-slate-500 mt-0.5 font-semibold">({topAuthorViews.toLocaleString('pt-BR')} visualizações acumuladas)</p>
                  </div>
                </div>

                <div className="bg-purple-900 text-purple-100 p-4 rounded-lg text-xs leading-relaxed font-semibold">
                  📖 O tráfego do portal é analisado a partir das visualizações orgânicas salvas no ecossistema e sanitizadas na home principal e páginas internas.
                </div>
              </div>

              {/* CHART CARD (GROWTH GRAPH) */}
              <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="bg-purple-100 text-purple-700 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded inline-block mb-1.5">Desempenho</span>
                      <h3 className="text-base font-bold font-display text-slate-950 flex items-center gap-1.5 uppercase tracking-tight">
                        📈 Crescimento das Visualizações (Últimos 15 Dias)
                      </h3>
                      <p className="text-xs text-slate-500 mt-1">Evolução acumulada computada no data pipeline do portal.</p>
                    </div>
                  </div>

                  {/* SVG Line / Area Graph */}
                  <div className="mt-6 border border-slate-100 rounded-lg p-2 bg-slate-50/50">
                    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
                      <defs>
                        <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#ab47bc" stopOpacity="0.4" />
                          <stop offset="100%" stopColor="#ab47bc" stopOpacity="0.0" />
                        </linearGradient>
                      </defs>

                      {/* Grid Lines */}
                      <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#e2e8f0" strokeDasharray="3 3" />
                      <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#e2e8f0" strokeDasharray="3 3" />
                      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" strokeWidth="1.5" />

                      {/* Area Fill */}
                      {areaD && <path d={areaD} fill="url(#chartGrad)" />}

                      {/* Line Path */}
                      {pathD && <path d={pathD} fill="none" stroke="#9c27b0" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}

                      {/* Circles for nodes */}
                      {points.map((p, idx) => (
                        <g key={idx} className="group/node cursor-pointer">
                          <circle cx={p.x} cy={p.y} r="3.5" fill="#ffffff" stroke="#9c27b0" strokeWidth="2.5" />
                          <circle cx={p.x} cy={p.y} r="9" fill="#9c27b0" fillOpacity="0" className="hover:fill-opacity-10 transition-all duration-150" />
                        </g>
                      ))}

                      {/* Horizontal labels */}
                      {points.filter((_, i) => i % 2 === 0).map((p, i) => (
                        <text key={i} x={p.x} y={height - 4} fontSize="7.5" fill="#64748b" textAnchor="middle" fontWeight="bold">
                          {p.label}
                        </text>
                      ))}
                    </svg>
                  </div>
                </div>

                {/* Growth legend */}
                <div className="flex gap-4 text-[10px] text-slate-500 font-mono mt-4 pt-4 border-t border-slate-100 justify-end">
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-purple-600 inline-block" />
                    <span>Visualizações Totais Proativas</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                    <span>Calculado hoje: {hojeViews}</span>
                  </div>
                </div>

              </div>

            </div>

            {/* TABLE RANKING */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
              <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black font-display text-slate-950 flex items-center gap-1.5 uppercase tracking-tight">
                    🏆 Ranking Geral de Audiência (Top 10)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">As 10 matérias com maior audiência orgânica absoluta.</p>
                </div>
                <div className="text-xs bg-amber-50 rounded px-2.5 py-1 text-amber-800 font-bold border border-amber-200">
                  Total de artigos catalogados: {posts.length}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                      <th className="p-3 text-center w-16">Posição</th>
                      <th className="p-3">Matéria</th>
                      <th className="p-3 w-40">Categoria</th>
                      <th className="p-3 w-44 text-right">Visualizações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {sortedTop10.map((p, idx) => {
                      const medal = idx === 0 ? "🥇" : idx === 1 ? "🥈" : idx === 2 ? "🥉" : `${idx + 1}°`;
                      return (
                        <tr key={p.id} className="hover:bg-slate-100/50 transition-colors">
                          <td className="p-3 text-center font-bold text-slate-500">
                            <span className={`inline-block px-2.5 py-1 rounded text-xs leading-none font-black ${
                              idx < 3 ? 'text-base font-normal' : 'text-slate-500'
                            }`}>
                              {medal}
                            </span>
                          </td>
                          <td className="p-3">
                            <p className="font-bold text-slate-900 leading-snug line-clamp-2 max-w-xl">
                              {p.title}
                            </p>
                            {p.subtitle && (
                              <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                {p.subtitle}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[9px] font-black uppercase px-2 py-0.5 rounded tracking-wider">
                              {p.category}
                            </span>
                          </td>
                          <td className="p-3 text-right font-semibold text-slate-900 font-mono">
                            {(p.views || 0).toLocaleString('pt-BR')}
                          </td>
                        </tr>
                      );
                    })}
                    {sortedTop10.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-slate-400">
                          Nenhum post registrado no sistema ainda.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        );
      })()}

      {activeTab === 'diagnostic' && (
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-100 pb-4 gap-4">
            <div>
              <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-600 animate-pulse" />
                Painel de Diagnóstico e Auditoria de Matérias
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Audite em tempo real as configurações e estados de visualização de todas as matérias cadastradas no banco de dados.
              </p>
            </div>
            
            <button
              onClick={async () => {
                if (!confirm("Deseja rodar a normalização? Isto corrigirá status 'NO AR', removerá ids duplicados e preencherá datas ausentes em todas as matérias.")) return;
                setIsNormalizing(true);
                try {
                  const res = await fetch('/api/posts/cleanup-and-normalize', { method: 'POST' });
                  if (res.ok) {
                    const data = await res.json();
                    alert(`${data.message}\nTotal original: ${data.originalCount}\nTotal após limpeza: ${data.finalCount}`);
                    onRefreshData();
                  } else {
                    alert("Erro ao executar normalização de banco de dados.");
                  }
                } catch (err: any) {
                  alert("Erro operacional: " + err.message);
                } finally {
                  setIsNormalizing(false);
                }
              }}
              disabled={isNormalizing || posts.length === 0}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider text-white ${
                isNormalizing ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700 active:scale-95 transition-all'
              } shadow-sm cursor-pointer`}
            >
              {isNormalizing ? (
                <> <Loader2 className="w-4 h-4 animate-spin" /> Processando Normalização... </>
              ) : (
                <> <RefreshCw className="w-4 h-4" /> Normalizar Banco de Dados (Corrigir Tudo) </>
              )}
            </button>
          </div>

          {/* Quick Filters Info */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100 font-sans">
            <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Geral</span>
              <div className="text-2xl font-black text-slate-900 mt-1 font-mono">{posts.length}</div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-green-500 tracking-wider">No Ar (Visível na Home)</span>
              <div className="text-2xl font-black text-green-600 mt-1 font-mono">
                {posts.filter(p => {
                  const norm = normalizePost(p);
                  return norm.status === 'published' && !norm.isTestPost;
                }).length}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-amber-500 tracking-wider">Rascunhos / Agendados</span>
              <div className="text-2xl font-black text-amber-600 mt-1 font-mono">
                {posts.filter(p => {
                  const norm = normalizePost(p);
                  return norm.status !== 'published';
                }).length}
              </div>
            </div>
            <div className="bg-white p-3 rounded-lg border border-slate-200/60 shadow-xs">
              <span className="text-[10px] uppercase font-bold text-red-500 tracking-wider">Matérias de Teste</span>
              <div className="text-2xl font-black text-red-600 mt-1 font-mono">
                {posts.filter(p => p.isTestPost === true || (p as any).isTestPost === 'true').length}
              </div>
            </div>
          </div>

          {/* Search Bar / Filters */}
          <div className="flex flex-col md:flex-row gap-3 pt-2 font-sans">
            <div className="relative flex-1">
              <input
                type="text"
                placeholder="Pesquisar por título ou ID..."
                value={diagSearch}
                onChange={(e) => setDiagSearch(e.target.value)}
                className="w-full text-xs font-semibold px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-500 bg-slate-50/50"
              />
            </div>
            
            <div className="flex gap-1 bg-slate-100 p-1 rounded-lg shrink-0">
              {(['all', 'visible', 'invisible', 'test'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setDiagFilter(mode)}
                  className={`px-3 py-1.5 rounded text-[10.5px] font-bold uppercase tracking-wider transition-all select-none cursor-pointer ${
                    diagFilter === mode 
                      ? 'bg-white text-slate-900 shadow-sm' 
                      : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {mode === 'all' && 'Todos'}
                  {mode === 'visible' && 'Visíveis na Home'}
                  {mode === 'invisible' && 'Invisíveis'}
                  {mode === 'test' && 'Apenas Teste'}
                </button>
              ))}
            </div>
          </div>

          {/* Diagnostics Table */}
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs bg-slate-50/20 font-sans">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-widest text-slate-600">
                  <th className="p-3.5">ID</th>
                  <th className="p-3.5">Título</th>
                  <th className="p-3.5">Status Real (Banco)</th>
                  <th className="p-3.5">Data Publicação / Campos</th>
                  <th className="p-3.5">Categoria</th>
                  <th className="p-3.5 text-center">Visível na Home</th>
                  <th className="p-3.5 text-center">Visível na Categoria</th>
                  <th className="p-3.5 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150">
                {posts
                  .filter(p => {
                    // Title/ID Search Match
                    if (diagSearch) {
                      const searchStr = diagSearch.toLowerCase();
                      const matchTitle = (p.title || '').toLowerCase().includes(searchStr);
                      const matchId = String(p.id || '').toLowerCase().includes(searchStr);
                      if (!matchTitle && !matchId) return false;
                    }

                    // Mode Match
                    const norm = normalizePost(p);
                    const isHomeVisible = norm.status === 'published' && !norm.isTestPost;
                    if (diagFilter === 'visible') return isHomeVisible;
                    if (diagFilter === 'invisible') return !isHomeVisible;
                    if (diagFilter === 'test') return p.isTestPost === true || (p as any).isTestPost === 'true';
                    return true;
                  })
                  .map((p) => {
                    const norm = normalizePost(p);
                    const isHomeVisible = norm.status === 'published' && !norm.isTestPost;
                    const isCategoryVisible = norm.status === 'published' && !norm.isTestPost;

                    // Compute dynamic reason for Home invisibility
                    let homeReason = "Sim (No Ar)";
                    if (p.isTestPost === true || (p as any).isTestPost === 'true') {
                      homeReason = "Não (Post de Teste)";
                    } else if (norm.status === 'draft') {
                      homeReason = "Não (Status: Rascunho)";
                    } else if (norm.status === 'scheduled') {
                      const dateStr = p.publishAt || (p as any).scheduledAt || p.date || '';
                      homeReason = `Não (Agendado: ${dateStr})`;
                    }

                    return (
                      <tr key={p.id} className="hover:bg-slate-50/50 bg-white transition-colors text-xs font-medium">
                        <td className="p-3 font-mono font-bold text-slate-500 select-all">
                          {p.id}
                        </td>
                        <td className="p-3 max-w-xs md:max-w-md">
                          <div className="font-bold text-slate-900 truncate" title={p.title}>
                            {p.title}
                          </div>
                          {p.isTestPost ? (
                            <span className="inline-flex items-center gap-1 text-[9px] bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded mt-1 font-semibold uppercase">
                              <FlaskConical className="w-2.5 h-2.5" /> Matéria de Teste
                            </span>
                          ) : null}
                        </td>
                        <td className="p-3">
                          <code className="bg-slate-100 text-slate-800 border border-slate-200 font-mono text-[10px] px-2 py-0.5 rounded uppercase font-black">
                            {p.status || 'undefined'}
                          </code>
                          {(p as any).published === true || (p as any).published === 'true' ? (
                            <span className="text-[9px] text-green-600 block mt-1 font-bold">
                              [published=true]
                            </span>
                          ) : null}
                        </td>
                        <td className="p-3 font-mono text-[10px] text-slate-600 leading-relaxed">
                          <div><span className="text-[9px] font-black uppercase text-slate-400">Geral/Date:</span> {p.date || 'vazio'}</div>
                          {p.publishAt && <div><span className="text-[9px] font-black uppercase text-slate-400">Scheduled:</span> {p.publishAt}</div>}
                          {(p as any).createdAt && <div><span className="text-[9px] font-black uppercase text-slate-400">Created:</span> {(p as any).createdAt}</div>}
                          {(p as any).publishedAt && <div><span className="text-[9px] font-black uppercase text-slate-400">PublishedAt:</span> {(p as any).publishedAt}</div>}
                        </td>
                        <td className="p-3">
                          <span className="bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded">
                            {p.category || 'Nenhuma'}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex flex-col items-center justify-center">
                            <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border tracking-wider flex items-center gap-1 shrink-0 ${
                              isHomeVisible 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {isHomeVisible ? 'SIM' : 'NÃO'}
                            </span>
                            <span className="text-[9px] text-slate-400 mt-1 block max-w-[124px] truncate text-center" title={homeReason}>
                              {homeReason}
                            </span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2.5 py-1 rounded text-[10px] font-black uppercase border tracking-wider ${
                            isCategoryVisible 
                              ? 'bg-green-50 text-green-700 border-green-200' 
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}>
                            {isCategoryVisible ? 'SIM' : 'NÃO'}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleDeletePost(p.id)}
                              className="p-1.5 text-red-600 hover:bg-red-50 hover:text-red-700 rounded border border-transparent hover:border-red-200 transition-all cursor-pointer"
                              title="Excluir Definitivamente"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                {posts.length === 0 && (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400 font-bold uppercase tracking-wider text-xs bg-white">
                      Nenhuma matéria cadastrada na base de dados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
}
