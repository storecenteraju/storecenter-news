import React, { useState, useEffect } from 'react';
import { Newspaper, Bell, Search, LayoutDashboard, Home, Radio, Calendar, FileText, HelpCircle, Coins, ShieldCheck, ChevronRight, ArrowUpDown, X } from 'lucide-react';
import { CategoryType, AdUnit } from '../types';

interface NavigationProps {
  currentView: 'portal' | 'admin';
  setView: (view: 'portal' | 'admin') => void;
  selectedCategory: CategoryType | 'Home';
  setSelectedCategory: (cat: CategoryType | 'Home') => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  breakingNewsTitle?: string;
  ads?: AdUnit[];
}

export default function Navigation({
  currentView,
  setView,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  breakingNewsTitle = "PIB do Brasil surpreende no primeiro trimestre de 2026 e cresce 1,2% impulsionado por serviços",
  ads = []
}: NavigationProps) {
  const [currentTime, setCurrentTime] = useState("");
  const [isMarketModalOpen, setIsMarketModalOpen] = useState(false);

  const [markets, setMarkets] = useState([
    // Moedas & Cripto (8)
    { label: "Dólar Comercial", value: 5.14, change: 0.42, prefix: "R$ ", suffix: "", isInt: false, category: "Moedas & Cripto" },
    { label: "Euro", value: 5.58, change: 0.12, prefix: "R$ ", suffix: "", isInt: false, category: "Moedas & Cripto" },
    { label: "Dólar Turismo", value: 5.35, change: 0.38, prefix: "R$ ", suffix: "", isInt: false, category: "Moedas & Cripto" },
    { label: "Libra Esterlina", value: 6.51, change: -0.25, prefix: "R$ ", suffix: "", isInt: false, category: "Moedas & Cripto" },
    { label: "Yen Japonês", value: 0.033, change: -0.15, prefix: "R$ ", suffix: "", isInt: false, category: "Moedas & Cripto" },
    { label: "Bitcoin (BTC)", value: 352480, change: 2.14, prefix: "R$ ", suffix: "", isInt: true, category: "Moedas & Cripto" },
    { label: "Ethereum (ETH)", value: 18240, change: 1.85, prefix: "R$ ", suffix: "", isInt: true, category: "Moedas & Cripto" },
    { label: "Solana (SOL)", value: 924.50, change: 4.12, prefix: "R$ ", suffix: "", isInt: false, category: "Moedas & Cripto" },

    // Agronegócio (8)
    { label: "Soja (Cascavel/PR)", value: 138.50, change: 0.85, prefix: "R$ ", suffix: "", isInt: false, category: "Agronegócio" },
    { label: "Arroba do Boi Gordo", value: 225.00, change: -0.45, prefix: "R$ ", suffix: "", isInt: false, category: "Agronegócio" },
    { label: "Milho (Campinas/SP)", value: 57.20, change: 0.20, prefix: "R$ ", suffix: "", isInt: false, category: "Agronegócio" },
    { label: "Café Arábica Tipo 6", value: 1050.00, change: 1.48, prefix: "R$ ", suffix: "", isInt: true, category: "Agronegócio" },
    { label: "Trigo (Paraná)", value: 82.10, change: -0.15, prefix: "R$ ", suffix: "", isInt: false, category: "Agronegócio" },
    { label: "Algodão em Pluma", value: 142.40, change: -0.80, prefix: "R$ ", suffix: "", isInt: false, category: "Agronegócio" },
    { label: "Açúcar Cristal (Saca)", value: 145.80, change: -0.32, prefix: "R$ ", suffix: "", isInt: false, category: "Agronegócio" },
    { label: "Arroz Esf. (Saca 50kg)", value: 112.50, change: 0.62, prefix: "R$ ", suffix: "", isInt: false, category: "Agronegócio" },

    // Índices Globais (8)
    { label: "Ibovespa", value: 126430, change: -0.31, prefix: "", suffix: " pts", isInt: true, category: "Índices & Indicadores" },
    { label: "Petróleo Brent", value: 83.18, change: 1.15, prefix: "US$ ", suffix: "", isInt: false, category: "Índices & Indicadores" },
    { label: "IFIX (Fundos Imob.)", value: 3385, change: 0.08, prefix: "", suffix: " pts", isInt: true, category: "Índices & Indicadores" },
    { label: "Nasdaq (EUA)", value: 16730, change: 0.72, prefix: "", suffix: " pts", isInt: true, category: "Índices & Indicadores" },
    { label: "S&P 500 (EUA)", value: 5305, change: 0.65, prefix: "", suffix: " pts", isInt: true, category: "Índices & Indicadores" },
    { label: "Dow Jones (EUA)", value: 39060, change: 0.44, prefix: "", suffix: " pts", isInt: true, category: "Índices & Indicadores" },
    { label: "Taxa Selic", value: 10.50, change: 0.00, prefix: "", suffix: "%", isInt: false, category: "Índices & Indicadores" },
    { label: "IPCA (Inflação anual)", value: 3.69, change: 0.05, prefix: "", suffix: "%", isInt: false, category: "Índices & Indicadores" },

    // Principais Ações (Brasil) (8)
    { label: "Petrobras (PETR4)", value: 37.42, change: 0.52, prefix: "R$ ", suffix: "", isInt: false, category: "Principais Ações (Brasil)" },
    { label: "Vale (VALE3)", value: 64.15, change: -1.15, prefix: "R$ ", suffix: "", isInt: false, category: "Principais Ações (Brasil)" },
    { label: "Itaú Unibanco (ITUB4)", value: 32.80, change: -0.22, prefix: "R$ ", suffix: "", isInt: false, category: "Principais Ações (Brasil)" },
    { label: "Bradesco (BBDC4)", value: 13.92, change: 0.14, prefix: "R$ ", suffix: "", isInt: false, category: "Principais Ações (Brasil)" },
    { label: "Banco do Brasil (BBAS3)", value: 27.55, change: 0.82, prefix: "R$ ", suffix: "", isInt: false, category: "Principais Ações (Brasil)" },
    { label: "Ambev (ABEV3)", value: 11.45, change: -0.50, prefix: "R$ ", suffix: "", isInt: false, category: "Principais Ações (Brasil)" },
    { label: "Eletrobras (ELET3)", value: 38.60, change: 0.45, prefix: "R$ ", suffix: "", isInt: false, category: "Principais Ações (Brasil)" },
    { label: "Weg S.A. (WEGE3)", value: 39.15, change: 1.10, prefix: "R$ ", suffix: "", isInt: false, category: "Principais Ações (Brasil)" }
  ]);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const ptTime = now.toLocaleDateString('pt-BR', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      setCurrentTime(ptTime);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setMarkets(prev => prev.map(item => {
        const factor = (Math.random() - 0.5) * 0.05; // -0.025% to +0.025%
        const newChange = Number((item.change + (Math.random() - 0.5) * 0.08).toFixed(2));
        const newValue = item.isInt 
          ? Math.round(item.value * (1 + factor * 0.01))
          : Number((item.value * (1 + factor * 0.01)).toFixed(item.value < 0.1 ? 3 : 2));
        return {
          ...item,
          value: newValue,
          change: newChange
        };
      }));
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const categories: (CategoryType | 'Home')[] = [
    'Home',
    'Economia',
    'Política',
    'Judiciário',
    'Negócios',
    'Tecnologia',
    'Geopolítica',
    'Nacional',
    'Esporte',
    'Saúde',
    'Entretenimento'
  ];

  const marketCategories = ["Moedas & Cripto", "Agronegócio", "Índices & Indicadores", "Principais Ações (Brasil)"];

  // Fetch middle, bottom, or sidebar active AdSense to display in popup
  const activeAd = ads.find(a => a.enabled && (a.slot === 'middle' || a.slot === 'bottom' || a.slot === 'sidebar')) || ads.find(a => a.enabled);

  return (
    <header className="bg-white border-b border-slate-200">
      {/* ADVERTISING / TOP BAR TICKER */}
      <div className="bg-slate-900 text-white text-xs py-2">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-2 overflow-hidden w-full md:w-3/4">
            <span className="flex items-center gap-1 bg-red-600 px-2 py-0.5 rounded text-[10px] font-extrabold uppercase animate-pulse shrink-0">
              <Bell className="w-2.5 h-2.5" /> URGENTE
            </span>
            <div className="flex overflow-hidden">
              <p className="text-slate-300 font-medium whitespace-nowrap animate-marquee select-none hover:underline cursor-pointer">
                {breakingNewsTitle}
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-4 text-[10px] font-bold text-slate-400">
            <span className="flex items-center gap-1 text-emerald-400 font-bold tracking-wider">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
              MERCADO ATIVO
            </span>
          </div>
        </div>
      </div>

      {/* INNER BRAND CONTAINER */}
      <div className="max-w-7xl mx-auto px-4 py-5 flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 cursor-pointer select-none group" onClick={() => { setSelectedCategory('Home'); setView('portal'); }}>
          <svg viewBox="0 0 120 100" className="w-12 h-12 shrink-0 transition-transform group-hover:scale-105" data-logo-version="2.0.1" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadowNav" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="1.5" dy="2" stdDeviation="2" floodColor="#001a4d" floodOpacity="0.32" />
              </filter>
              <filter id="glowNav" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0055ff" floodOpacity="0.4" />
              </filter>
              <linearGradient id="bubbleGradNav" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="40%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <linearGradient id="paperGradNav" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f8fafc" />
              </linearGradient>
            </defs>
            
            <g filter="url(#shadowNav)">
              <rect x="36" y="8" width="68" height="76" rx="10" fill="url(#paperGradNav)" stroke="#1e40af" strokeWidth="4" strokeLinejoin="round" />
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
            
            <g filter="url(#glowNav)">
              <path d="M 12 40 h 68 a 10 10 0 0 1 10 10 v 22 a 10 10 0 0 1 -10 10 H 66 l -12 12 v -12 H 22 a 10 10 0 0 1 -10 -10 v -22 a 10 10 0 0 1 10 -10 z" fill="url(#bubbleGradNav)" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
              <path d="M 14 42 h 64 a 8 8 0 0 1 8 8 v 3" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
              <text x="46" y="66" fontFamily="sans-serif" fontWeight="900" fontStyle="italic" fontSize="19.5" fill="#ffffff" textAnchor="middle" letterSpacing="-0.5">NEWS</text>
            </g>
          </svg>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black font-display tracking-tight text-slate-900 uppercase">
                STORECENTER
              </h1>
              <span className="hidden sm:inline bg-blue-500/10 border border-blue-500/30 text-blue-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider">
                NEWS
              </span>
            </div>
            <p className="text-[10px] text-slate-500 font-bold tracking-widest uppercase">
              Economia &bull; Política &nbsp;<span className="text-emerald-500">&bull;</span>&nbsp; Negócios &bull; Inovação
            </p>
          </div>
        </div>

        {/* CLOCK & CONTROL SWITCHES */}
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-end">
          <div className="text-center sm:text-right text-[11px] text-slate-500 font-medium">
            <p className="capitalize text-slate-900 font-semibold">{currentTime}</p>
            <p className="text-slate-400 text-[10px]">Storecenter.com.br</p>
          </div>

          {currentView === 'admin' && (
            <button
              onClick={() => { setView('portal'); }}
              className="flex items-center justify-center gap-1.5 px-4 py-2 border border-blue-200 hover:border-blue-300 text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg text-xs font-bold uppercase tracking-wider transition-all select-none cursor-pointer"
            >
              <Home className="w-3.5 h-3.5 text-blue-600" /> Voltar ao Portal
            </button>
          )}
        </div>
      </div>

      {/* NAVIGATION LABELS & CATEGORIES BAR */}
      <div className="bg-slate-900 text-white select-none shadow-md overflow-x-auto scrollbar-hide">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between gap-6 min-w-[760px]">
          <div className="flex space-x-1 py-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setSelectedCategory(cat);
                  setView('portal'); // clicking category always returns to public portal
                }}
                className={`px-4 py-3.5 text-[11px] font-extrabold uppercase tracking-widest hover:bg-slate-800 transition-colors cursor-pointer select-none ${selectedCategory === cat && currentView === 'portal' ? 'bg-blue-600 text-white border-b-2 border-emerald-400' : 'text-slate-200'}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* SEARCH COMPONENT INTERACTIVE */}
          <div className="relative w-64 pr-4">
            <input
              type="text"
              placeholder="Buscar notícia..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-800 hover:bg-slate-700/80 focus:bg-slate-700 text-white text-xs px-8 py-2 rounded border border-transparent focus:border-slate-700 focus:outline-none placeholder-slate-400 w-full transition-all"
            />
            <Search className="absolute left-2.5 top-2.5 text-slate-400 w-3.5 h-3.5" />
          </div>
        </div>
      </div>

      {/* LIVE MARKET BAR INDEX Ticker for Agribusiness and Finance */}
      <div className="bg-slate-100 border-b border-slate-200/85 py-2.5 relative shadow-sm overflow-hidden select-none animate-in fade-in slide-in-from-top-1 duration-200">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4">
          <div className="flex md:block justify-start">
            <button 
              type="button"
              onClick={() => setIsMarketModalOpen(true)}
              className="flex items-center gap-1.5 shrink-0 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded text-[9px] uppercase tracking-wider transition-colors shadow-sm focus:outline-none cursor-pointer border-0 w-full sm:w-auto justify-center"
            >
              <ArrowUpDown className="w-3 h-3 text-white animate-pulse" />
              Variações Financeira / Agro e Ações
            </button>
          </div>
          
          <div className="relative w-full overflow-hidden flex items-center border-t border-slate-200/40 md:border-t-0 pt-2 md:pt-0">
            {/* Infinite ticker content duplicates the markets block to ensure continuous smooth rolling */}
            <div className="animate-tick flex items-center gap-8 py-0.5">
              {/* Ticker Batch 1 */}
              {markets.map((index, i) => {
                const isPositive = index.change >= 0;
                const formattedVal = index.isInt 
                  ? index.value.toLocaleString('pt-BR')
                  : index.value.toLocaleString('pt-BR', { minimumFractionDigits: index.value < 0.1 ? 3 : 2, maximumFractionDigits: index.value < 0.1 ? 3 : 2 });
                
                return (
                  <div key={`tick-a-${i}`} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 shrink-0">
                    <span className="text-slate-500 font-semibold">{index.label}:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {index.prefix}{formattedVal}{index.suffix}
                    </span>
                    <span className={`inline-flex items-center text-[10px] font-bold px-1 py-0.5 rounded ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isPositive ? '▲' : '▼'} {Math.abs(index.change).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
              {/* Ticker Batch 2 */}
              {markets.map((index, i) => {
                const isPositive = index.change >= 0;
                const formattedVal = index.isInt 
                  ? index.value.toLocaleString('pt-BR')
                  : index.value.toLocaleString('pt-BR', { minimumFractionDigits: index.value < 0.1 ? 3 : 2, maximumFractionDigits: index.value < 0.1 ? 3 : 2 });
                
                return (
                  <div key={`tick-b-${i}`} className="flex items-center gap-1.5 text-[11px] font-medium text-slate-700 shrink-0">
                    <span className="text-slate-500 font-semibold">{index.label}:</span>
                    <span className="font-mono font-bold text-slate-900">
                      {index.prefix}{formattedVal}{index.suffix}
                    </span>
                    <span className={`inline-flex items-center text-[10px] font-bold px-1 py-0.5 rounded ${isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
                      {isPositive ? '▲' : '▼'} {Math.abs(index.change).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* POPUP MODAL: CORE FINANCIAL & FARMING VARIATIONS LIST WITH ADSENSE */}
      {isMarketModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <ArrowUpDown className="w-5 h-5 text-blue-600 animate-bounce" />
                <div>
                  <h3 className="font-black font-display text-slate-950 text-base uppercase tracking-tight">Variações Financeira / Agro e Ações</h3>
                  <p className="text-xs text-slate-500">Cotações em tempo real do mercado financeiro, agronegócio e principais ações do Brasil</p>
                </div>
              </div>
              <button 
                onClick={() => setIsMarketModalOpen(false)}
                className="p-1.5 hover:bg-slate-200 text-slate-400 hover:text-slate-700 rounded-full transition-colors cursor-pointer"
                title="Fechar"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-6 overflow-y-auto space-y-8 flex-1">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {marketCategories.map((group) => {
                  const itemsInGroup = markets.filter(m => m.category === group);
                  return (
                    <div key={group} className="space-y-3">
                      <h4 className="text-xs font-black font-display text-slate-950 uppercase tracking-widest border-l-4 border-blue-600 pl-2.5 pb-0.5 mb-2 bg-slate-100/50 py-1 rounded-r">
                        {group}
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {itemsInGroup.map((item, idx) => {
                          const isPositive = item.change >= 0;
                          const formattedVal = item.isInt 
                            ? item.value.toLocaleString('pt-BR')
                            : item.value.toLocaleString('pt-BR', { minimumFractionDigits: item.value < 0.1 ? 3 : 2, maximumFractionDigits: item.value < 0.1 ? 3 : 2 });
                          
                          return (
                            <div key={idx} className="bg-white border border-slate-200/80 rounded-lg p-3 hover:border-slate-300 transition-colors shadow-sm flex flex-col justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight block truncate" title={item.label}>
                                {item.label}
                              </span>
                              <div className="flex items-baseline justify-between mt-1.5 gap-2">
                                <span className="text-sm font-mono font-bold text-slate-950 truncate">
                                  {item.prefix}{formattedVal}{item.suffix}
                                </span>
                                <span className={`inline-flex shrink-0 items-center text-[10px] font-black px-1.5 py-0.5 rounded ${isPositive ? 'bg-emerald-500/10 text-emerald-700' : 'bg-red-500/10 text-red-700'}`}>
                                  {isPositive ? '▲' : '▼'} {Math.abs(item.change).toFixed(2)}%
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* SPACE FOR ADSENSE PUBLICITY (at the bottom of the list) */}
              <div className="border-t border-slate-100 pt-6 mt-4">
                <span className="text-[9px] font-bold text-white select-none uppercase tracking-widest text-center block mb-2.5">
                  Publicidade Google AdSense
                </span>
                {activeAd ? (
                  <div 
                    className="mx-auto min-h-[90px] flex items-center justify-center bg-slate-50/50 border border-slate-200 rounded-lg p-3 text-center overflow-hidden max-w-[728px]"
                    dangerouslySetInnerHTML={{ __html: activeAd.code }}
                  />
                ) : (
                  <div className="mx-auto max-w-[728px] min-h-[90px] border border-dashed border-slate-300/80 rounded-lg bg-slate-50 flex flex-col items-center justify-center p-4">
                    <p className="text-[10px] font-bold text-slate-500">Espaço de Anúncio Publicitário AdSense (728x90)</p>
                    <p className="text-[9px] text-slate-400 mt-1">Sua conta do AdSense configurada monitora esta área do portal de notícias automaticamente.</p>
                  </div>
                )}
              </div>

            </div>

            {/* Footer buttons */}
            <div className="p-4 border-t border-slate-100 flex justify-end bg-slate-50">
              <button 
                type="button"
                onClick={() => setIsMarketModalOpen(false)}
                className="px-5 py-2 hover:bg-slate-200 text-slate-700 hover:text-slate-900 border border-slate-200 hover:border-slate-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
              >
                Fechar Painel
              </button>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}
