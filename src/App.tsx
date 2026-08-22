import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import PortalHome from './components/PortalHome';
import PostDetails from './components/PostDetails';
import AdminPanel from './components/AdminPanel';
import { Post, RSSFeed, AdUnit, SiteSettings, CategoryType, normalizePost, getPostTimestamp } from './types';
import { Loader2, Globe, Sparkles, Server } from 'lucide-react';
import dbBackup from '../db.json';

export default function App() {
  const [currentView, setView] = useState<'portal' | 'admin'>('portal');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType | 'Home'>('Home');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);

  // Core Database States
  const [posts, setPosts] = useState<Post[]>([]);
  const [feeds, setFeeds] = useState<RSSFeed[]>([]);
  const [ads, setAds] = useState<AdUnit[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPortalData = async () => {
    try {
      const pRes = await fetch('/api/posts');
      const fRes = await fetch('/api/feeds');
      const aRes = await fetch('/api/ads');
      const sRes = await fetch('/api/settings');

      let fetchedPosts = null;
      let fetchedFeeds = null;
      let fetchedAds = null;
      let fetchedSettings = null;

      if (pRes.ok) {
        const ct = pRes.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          fetchedPosts = await pRes.json();
        }
      }
      if (fRes.ok) {
        const ct = fRes.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          fetchedFeeds = await fRes.json();
        }
      }
      if (aRes.ok) {
        const ct = aRes.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          fetchedAds = await aRes.json();
        }
      }
      if (sRes.ok) {
        const ct = sRes.headers.get("content-type");
        if (ct && ct.includes("application/json")) {
          fetchedSettings = await sRes.json();
        }
      }

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

  const handlePostClick = (post: Post) => {
    setSelectedPost(post);
    window.scrollTo({ top: 0, behavior: 'instant' });
  };

  const handleBackToPortal = () => {
    setSelectedPost(null);
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
          setSelectedPost(null); // Clear selected article reading state when toggling
        }}
        selectedCategory={selectedCategory}
        setSelectedCategory={(cat) => {
          setSelectedCategory(cat);
          setSelectedPost(null); // Clear reading state on category click
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
            selectedPost ? (
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
                onAdminClick={() => setView('admin')}
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


