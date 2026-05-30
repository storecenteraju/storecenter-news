import React, { useState, useEffect } from 'react';
import Navigation from './components/Navigation';
import PortalHome from './components/PortalHome';
import PostDetails from './components/PostDetails';
import AdminPanel from './components/AdminPanel';
import { Post, RSSFeed, AdUnit, SiteSettings, CategoryType, normalizePost } from './types';
import { Loader2, Globe, Sparkles, Server } from 'lucide-react';

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

      if (pRes.ok) {
        const rawPosts = await pRes.json();
        setPosts(Array.isArray(rawPosts) ? rawPosts.map(normalizePost) : []);
      }
      if (fRes.ok) setFeeds(await fRes.json());
      if (aRes.ok) setAds(await aRes.json());
      if (sRes.ok) setSettings(await sRes.json());
    } catch (err) {
      console.error("Erro consultando base Express:", err);
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
        breakingNewsTitle={posts[0]?.title}
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
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 select-none">
        <div className="bg-slate-950/90 hover:bg-slate-950 text-white backdrop-blur border border-slate-800 rounded-full px-4 py-2.5 shadow-xl flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5 text-blue-400" /> 
          <span>Gemini AI {process.env.GEMINI_API_KEY ? 'Ativo' : 'Simulação'}</span>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
        </div>
      </div>

    </div>
  );
}
