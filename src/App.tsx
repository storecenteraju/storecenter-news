import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import PortalHome from './components/PortalHome';
import PostDetails from './components/PostDetails';
import AdminPanel from './components/AdminPanel';
import { Post, RSSFeed, AdUnit, SiteSettings, CategoryType, normalizePost, getPostTimestamp } from './types';
import { Loader2, Globe, Sparkles, Server } from 'lucide-react';
import dbBackup from '../db.json';

const SITE_NAME = 'Store Center News';
const PUBLIC_SITE_URL = 'https://storecenter.com.br';
const HOME_TITLE = 'Store Center News - Economia, Política, Negócios e Tecnologia';
const HOME_DESCRIPTION = 'Notícias e análises sobre economia, política, negócios, tecnologia e os principais acontecimentos do Brasil e do mundo.';

function getArticleSlugFromPath(pathname = window.location.pathname): string | null {
  const match = pathname.match(/^\/noticia\/([^/]+)\/?$/i);
  if (!match) return null;

  try {
    return decodeURIComponent(match[1]);
  } catch {
    return match[1];
  }
}

function getPostPath(post: Post): string {
  return `/noticia/${encodeURIComponent(post.slug)}`;
}

function setMeta(selector: string, attribute: 'content' | 'href', value: string) {
  const element = document.querySelector(selector);
  if (element) element.setAttribute(attribute, value);
}

export default function App() {
  const hasPasswordResetToken = new URLSearchParams(window.location.search).has('reset');
  const [currentView, setView] = useState<'portal' | 'admin'>(window.location.pathname === '/redacao' || hasPasswordResetToken ? 'admin' : 'portal');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Home'>('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [routeNotFound, setRouteNotFound] = useState(false);

  // Core Database States
  const [posts, setPosts] = useState<Post[]>([]);
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [ads, setAds] = useState<AdUnit[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPortalData = async () => {
    try {
      let portalRes = await fetch('/data/site-data.json', { cache: 'no-store' });
      if (!portalRes.ok) {
        portalRes = await fetch('/api/portal-data');
      }
      const contentType = portalRes.headers.get("content-type");
      if (!portalRes.ok || !contentType?.includes("application/json")) {
        throw new Error(`Falha carregando o portal: HTTP ${portalRes.status}`);
      }

      const portalData = await portalRes.json();
      const fetchedPosts = portalData?.posts;
      const fetchedFeeds = portalData?.feeds;
      const fetchedAds = portalData?.ads;
      const fetchedSettings = portalData?.settings;

      if (Array.isArray(fetchedPosts) && fetchedPosts.length > 0) {
        setPosts(fetchedPosts.map(normalizePost));
      } else {
        setPosts(dbBackup.posts.map(normalizePost));
      }

      if (Array.isArray(fetchedFeeds) && fetchedFeeds.length > 0) {
        setFeeds(fetchedFeeds);
      } else {
        setFeeds(dbBackup.feeds as any);
      }

      if (Array.isArray(fetchedAds) && fetchedAds.length > 0) {
        setAds(fetchedAds);
      } else {
        setAds(dbBackup.ads as any);
      }

      if (fetchedSettings && typeof fetchedSettings === 'object') {
        setSettings(fetchedSettings);
      } else {
        setSettings(dbBackup.settings as any);
      }
    } catch (err) {
      console.error("Erro consultando base Express. Usando db.json local como backup:", err);
      setPosts(dbBackup.posts.map(normalizePost));
      setFeeds(dbBackup.feeds as any);
      setAds(dbBackup.ads as any);
      setSettings(dbBackup.settings as any);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortalData();
  }, []);

  useEffect(() => {
    if (loading) return;

    const syncRoute = () => {
      if (window.location.pathname === '/redacao' || new URLSearchParams(window.location.search).has('reset')) {
        setView('admin');
        setSelectedPost(null);
        setRouteNotFound(false);
        window.scrollTo({ top: 0, behavior: 'instant' });
        return;
      }
      const slug = getArticleSlugFromPath();
      if (!slug) {
        setSelectedPost(null);
        setRouteNotFound(window.location.pathname !== '/');
        return;
      }

      const routedPost = posts.find(post => (
        post.slug === slug &&
        post.status === 'published' &&
        !post.isTestPost &&
        getPostTimestamp(post) <= Date.now()
      )) || null;
      setView('portal');
      setSelectedPost(routedPost);
      setRouteNotFound(!routedPost);
      window.scrollTo({ top: 0, behavior: 'instant' });
    };

    syncRoute();
    window.addEventListener('popstate', syncRoute);
    return () => window.removeEventListener('popstate', syncRoute);
  }, [loading, posts]);

  useEffect(() => {
    if (loading) return;

    const canonicalUrl = selectedPost
      ? `${PUBLIC_SITE_URL}${getPostPath(selectedPost)}`
      : `${PUBLIC_SITE_URL}/`;
    const title = routeNotFound
      ? `Matéria não encontrada | ${SITE_NAME}`
      : selectedPost
      ? `${selectedPost.seoTitle || selectedPost.title} | ${SITE_NAME}`
      : HOME_TITLE;
    const description = routeNotFound
      ? 'O endereço informado não corresponde a uma matéria publicada no Store Center News.'
      : selectedPost?.seoDescription || selectedPost?.subtitle || HOME_DESCRIPTION;
    const image = selectedPost?.image
      ? new URL(selectedPost.image, window.location.origin).href
      : `${window.location.origin}/assets/editorial/geral.svg`;

    document.title = title;
    setMeta('meta[name="description"]', 'content', description);
    setMeta('link[rel="canonical"]', 'href', canonicalUrl);
    setMeta('meta[property="og:type"]', 'content', selectedPost ? 'article' : 'website');
    setMeta('meta[property="og:title"]', 'content', title);
    setMeta('meta[property="og:description"]', 'content', description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);
    setMeta('meta[property="og:image"]', 'content', image);
    setMeta('meta[name="twitter:title"]', 'content', title);
    setMeta('meta[name="twitter:description"]', 'content', description);
    setMeta('meta[name="twitter:image"]', 'content', image);
    setMeta('meta[name="robots"]', 'content', routeNotFound ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
  }, [loading, selectedPost, routeNotFound]);

  const handlePostClick = (post: Post) => {
    const postPath = getPostPath(post);
    if (window.location.pathname !== postPath) {
      window.history.pushState({ postSlug: post.slug }, '', postPath);
    }
    setView('portal');
    setRouteNotFound(false);
    setSelectedPost(post);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToPortal = () => {
    if (window.location.pathname !== '/') {
      window.history.pushState({}, '', '/');
    }
    setRouteNotFound(false);
    setSelectedPost(null);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const breakingNewsPost = posts
    .map(normalizePost)
    .filter((post) => (
      post.status === 'published' &&
      !post.isTestPost &&
      getPostTimestamp(post) <= Date.now()
    ))
    .sort((a, b) => getPostTimestamp(b) - getPostTimestamp(a))[0];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans">
      
      {/* GLOBAL NAVIGATION HEADER */}
      <Navigation 
        currentView={currentView}
        setView={(view) => {
          setView(view);
          if (view === 'admin') {
            window.history.pushState({}, '', '/redacao');
            setSelectedPost(null);
            setRouteNotFound(false);
          } else {
            handleBackToPortal();
          }
        }}
        selectedCategory={selectedCategory}
        setSelectedCategory={(cat) => {
          setSelectedCategory(cat);
          handleBackToPortal();
        }}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        breakingNewsTitle={breakingNewsPost?.title}
        onBreakingNewsClick={breakingNewsPost ? () => handlePostClick(breakingNewsPost) : undefined}
        ads={ads}
      />

      {/* LOADING PORTAL STATE ANIMATION */}
      {loading ? (
        <div className="flex-grow flex flex-col items-center justify-center p-24 select-none">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mb-4" />
          <p className="text-sm font-bold font-display uppercase tracking-widest text-slate-900">Carregando Store Center</p>
          <p className="text-xs text-slate-400 mt-1">Carregando canais de notícias e anúncios AdSense...</p>
        </div>
      ) : (
        <div className="flex-grow">
          {currentView === 'portal' ? (
            // PORTAL PUBLIC LAYOUT
            routeNotFound ? (
              <main className="max-w-3xl mx-auto px-4 py-24 text-center">
                <p className="text-xs font-black uppercase tracking-widest text-blue-600">Erro 404</p>
                <h1 className="mt-3 text-3xl font-black text-slate-950">Matéria não encontrada</h1>
                <p className="mt-3 text-slate-500">O endereço pode estar incompleto ou esta matéria não está mais disponível.</p>
                <button
                  onClick={handleBackToPortal}
                  className="mt-8 rounded-xl bg-blue-600 px-6 py-3 text-xs font-bold uppercase tracking-wider text-white hover:bg-blue-700"
                >
                  Voltar para o portal
                </button>
              </main>
            ) : selectedPost ? (
              // 1. ARTICLE DETAIL VIEW
              <PostDetails 
                post={selectedPost}
                posts={posts}
                ads={ads}
                onBack={handleBackToPortal}
                onPostClick={handlePostClick}
              />
            ) : (
              // 2. PUBLIC PORTAL INSTANCE (GRID + SECTIONS + SIDEBARS)
              <PortalHome 
                posts={posts}
                ads={ads}
                selectedCategory={selectedCategory}
                searchQuery={searchQuery}
                onPostClick={handlePostClick}
                siteSettings={settings}
                onCategorySelect={setSelectedCategory}
                onAdminClick={() => {
                  window.history.pushState({}, '', '/redacao');
                  setView('admin');
                  setSelectedPost(null);
                  setRouteNotFound(false);
                }}
                onSearchChange={setSearchQuery}
              />
            )
          ) : (
            // ADMIN STRATEGIC PANEL
            <AdminPanel 
              posts={posts}
              feeds={feeds}
              ads={ads}
              siteSettings={settings || {
                siteName: "Store Center",
                siteDescription: "",
                footerText: "",
                analyticsId: "",
                contactEmail: ""
              }}
              onRefreshData={fetchPortalData}
            />
          )}
        </div>
      )}

      {/* QUICK ASSIST FLOATING TOOLBAR */}
      {currentView === 'admin' && (
        <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 select-none">
          <div className="bg-slate-950/90 hover:bg-slate-950 text-white backdrop-blur border border-slate-800 rounded-full px-4 py-2.5 shadow-xl flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" /> 
            <span>Gemini AI Simulação</span>
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          </div>
        </div>
      )}

    </div>
  );
}


