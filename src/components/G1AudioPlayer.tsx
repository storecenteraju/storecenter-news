import React, { useState, useEffect, useRef } from 'react';
import { Play, Pause, Square, SkipBack, SkipForward, Volume2, HelpCircle, Sparkles } from 'lucide-react';
import { Post } from '../types';

interface G1AudioPlayerProps {
  post: Post;
}

type PlaybackState = 'stopped' | 'playing' | 'paused';

interface TextChunk {
  text: string;
  source: 'title' | 'subtitle' | 'content';
}

export function G1AudioPlayer({ post }: G1AudioPlayerProps) {
  const [playState, setPlayState] = useState<PlaybackState>('stopped');
  const [chunks, setChunks] = useState<TextChunk[]>([]);
  const [currentIdx, setCurrentIdx] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(0.85); // 0.85 is naturally "suave e pausado"
  const [voiceList, setVoiceList] = useState<SpeechSynthesisVoice[]>([]);
  const [activeVoice, setActiveVoice] = useState<SpeechSynthesisVoice | null>(null);
  const [estimatedDuration, setEstimatedDuration] = useState<number>(0);
  const [showVoiceSelect, setShowVoiceSelect] = useState<boolean>(false);

  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const pauseTimerRef = useRef<number | null>(null);

  // 1. Prepare Text Chunks (Title -> Subtitle -> Content paragraphs sentence by sentence)
  useEffect(() => {
    const list: TextChunk[] = [];
    
    if (post.title) {
      list.push({ text: post.title.trim() + '.', source: 'title' });
    }
    if (post.subtitle) {
      list.push({ text: post.subtitle.trim() + '.', source: 'subtitle' });
    }
    if (post.content) {
      // Split content into paragraphs first
      const paragraphs = post.content.split('\n\n').map(p => p.trim()).filter(Boolean);
      paragraphs.forEach(para => {
        // Split paragraph into sentences on punctuation marks (. ! ?)
        // Use a safe split that doesn't lose standard words
        const sentences = para.split(/(?<=[.!?])\s+/);
        sentences.forEach(sentence => {
          const trimmed = sentence.trim();
          if (trimmed.length > 2) {
            list.push({ text: trimmed, source: 'content' });
          }
        });
      });
    }

    setChunks(list);
    setCurrentIdx(0);
    setPlayState('stopped');

    // Estimate dynamic duration based on 145 words per minute (WPM) reading rate plus sentence-gap overheads
    const totalWords = list.reduce((acc, chunk) => acc + chunk.text.split(/\s+/).filter(Boolean).length, 0);
    // 145 words/min ~ 2.4 words per second. Add 0.8s pause overhead for each sentence chunk to make it realistic
    const secondsNeeded = Math.round(totalWords / 2.40) + list.length * 0.8;
    setEstimatedDuration(secondsNeeded || 60);

    // Stop speech if running when post changes
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  }, [post]);

  // 2. Fetch available Portuguese and English voices from browser
  useEffect(() => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    const loadVoices = () => {
      const all = window.speechSynthesis.getVoices();
      // Filter for Portuguese and English voices
      const candidates = all.filter(v => v.lang.toLowerCase().startsWith('pt') || v.lang.toLowerCase().startsWith('en'));
      setVoiceList(candidates);

      if (candidates.length > 0) {
        // Prefer pt-BR specifically, and high quality Google / Microsoft voices if available
        const preferred = candidates.find(v => v.lang.toLowerCase().includes('br') && v.name.toLowerCase().includes('google')) || 
                          candidates.find(v => v.lang.toLowerCase().includes('br')) || 
                          candidates.find(v => v.lang.toLowerCase().startsWith('en')) ||
                          candidates[0];
        setActiveVoice(preferred);
      }
    };

    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Guarantee that on component unmount, speech is stopped
  useEffect(() => {
    return () => {
      if (clearRefTimer) clearRefTimer();
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const clearRefTimer = () => {
    if (pauseTimerRef.current) {
      window.clearTimeout(pauseTimerRef.current);
      pauseTimerRef.current = null;
    }
  };

  // Speaks a specific sentence chunk with G1 style "tom suave e pausado"
  const speakChunk = (idx: number) => {
    if (typeof window === 'undefined' || !window.speechSynthesis || idx < 0 || idx >= chunks.length) {
      // Audio completed!
      if (idx >= chunks.length && chunks.length > 0) {
        handleStop();
      }
      return;
    }

    clearRefTimer();
    window.speechSynthesis.cancel(); // Clears any leftover speech state

    const currentChunk = chunks[idx];
    const u = new SpeechSynthesisUtterance(currentChunk.text);
    
    // Voice configuration for beautiful pronunciation
    if (activeVoice) {
      u.voice = activeVoice;
    }
    u.lang = activeVoice ? activeVoice.lang : 'pt-BR';
    
    // Slow, serene rate (0.85 creates the perfect professional and gentle newsroom cadence)
    u.rate = speed; 
    u.pitch = 1.0;

    u.onend = () => {
      // When this chunk ends, introduce a soft, soothing pause before playing the next sentence.
      // This complies perfectly with "pausado nos sinal de pontuação" (e.g. 750ms of quiet breathing space)
      if (playState !== 'playing') return;

      const nextIdx = idx + 1;
      setCurrentIdx(nextIdx);

      pauseTimerRef.current = window.setTimeout(() => {
        speakChunk(nextIdx);
      }, 750); // 750ms natural pause between logical sentences/paragraphs
    };

    u.onerror = (e) => {
      // If speech is cancelled intentionally, do not print error
      if (e.error !== 'interrupted') {
        console.warn('Speech API notification:', e.error);
      }
    };

    utteranceRef.current = u;
    window.speechSynthesis.speak(u);
  };

  const handlePlay = () => {
    if (playState === 'playing') return;

    if (playState === 'paused') {
      setPlayState('playing');
      speakChunk(currentIdx);
    } else {
      // stopped state, reset to beginning or current progress
      setPlayState('playing');
      speakChunk(currentIdx >= chunks.length ? 0 : currentIdx);
    }
  };

  const handlePause = () => {
    if (playState !== 'playing') return;
    setPlayState('paused');
    clearRefTimer();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel(); // reliably pause by cancelling, resume will restart chunk
    }
  };

  const handleStop = () => {
    setPlayState('stopped');
    setCurrentIdx(0);
    clearRefTimer();
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  const handleSkipForward = () => {
    const next = Math.min(chunks.length - 1, currentIdx + 1);
    setCurrentIdx(next);
    if (playState === 'playing') {
      speakChunk(next);
    }
  };

  const handleSkipBackward = () => {
    const prev = Math.max(0, currentIdx - 1);
    setCurrentIdx(prev);
    if (playState === 'playing') {
      speakChunk(prev);
    }
  };

  // Handles manual speed changes
  const handleSpeedChange = (newSpeed: number) => {
    setSpeed(newSpeed);
    if (playState === 'playing') {
      // Reboot speech at new speed from this chunk
      speakChunk(currentIdx);
    }
  };

  // Format seconds to nicely padded mm:ss
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  // Estimate remaining or current time in playback matching sentence indicators
  const currentEstSeconds = chunks.length > 0
    ? Math.round((currentIdx / chunks.length) * estimatedDuration)
    : 0;

  const progressPercent = chunks.length > 0 
    ? (currentIdx / chunks.length) * 100 
    : 0;

  return (
    <div className="bg-slate-50 border border-slate-200 p-4 md:p-5 rounded-2xl shadow-sm space-y-4 select-none">
      
      {/* HEADER SECTION STYLED FOR STORECENTER AUDIO PLAYER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <svg viewBox="0 0 120 100" className="w-9 h-9 shrink-0 transition-all" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <filter id="shadowPlayer" x="-10%" y="-10%" width="130%" height="130%">
                <feDropShadow dx="1.5" dy="2" stdDeviation="2" floodColor="#001a4d" floodOpacity="0.32" />
              </filter>
              <filter id="glowPlayer" x="-20%" y="-20%" width="140%" height="140%">
                <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0055ff" floodOpacity="0.4" />
              </filter>
              <linearGradient id="bubbleGradPlayer" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#2563eb" />
                <stop offset="40%" stopColor="#1d4ed8" />
                <stop offset="100%" stopColor="#1e3a8a" />
              </linearGradient>
              <linearGradient id="paperGradPlayer" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#f8fafc" />
              </linearGradient>
            </defs>
            
            <g filter="url(#shadowPlayer)">
              <rect x="36" y="8" width="68" height="76" rx="10" fill="url(#paperGradPlayer)" stroke="#1e40af" strokeWidth="4" strokeLinejoin="round" />
              <rect x="42" y="14" width="56" height="64" rx="6" fill="none" stroke="#3b82f6" strokeWidth="1.5" opacity="0.3" />
              <rect x="48" y="20" width="22" height="22" rx="4" fill="#1d4ed8" />
              <path d="M 48 36 L 56 28 L 62 34 L 66 30 L 70 36 Z" fill="#3b82f6" opacity="0.8" />
              <rect x="76" y="21" width="16" height="3" rx="1.5" fill="#1e3a8a" opacity="0.85" />
              <rect x="76" y="28" width="16" height="3" rx="1.5" fill="#1e3a8a" opacity="0.85" />
              <rect x="76" y="35" width="16" height="3" rx="1.5" fill="#1e3a8a" opacity="0.85" />
              <rect x="48" y="50" width="44" height="3" rx="1.5" fill="#1e3a8a" opacity="0.8" />
              <rect x="48" y="57" width="44" height="3" rx="1.5" fill="#1e3a8a" opacity="0.8" />
              <rect x="48" y="64" width="44" height="3" rx="1.5" fill="#1e3a8a" opacity="0.8" />
              <rect x="48" y="71" width="30" height="3" rx="1.5" fill="#1e3a8a" opacity="0.6" />
            </g>
            
            <g filter="url(#glowPlayer)">
              <path d="M 12 40 h 68 a 10 10 0 0 1 10 10 v 22 a 10 10 0 0 1 -10 10 H 66 l -12 12 v -12 H 22 a 10 10 0 0 1 -10 -10 v -22 a 10 10 0 0 1 10 -10 z" fill="url(#bubbleGradPlayer)" stroke="#ffffff" strokeWidth="3" strokeLinejoin="round" />
              <path d="M 14 42 h 64 a 8 8 0 0 1 8 8 v 3" fill="none" stroke="#60a5fa" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
              <text x="46" y="66" fontFamily="sans-serif" fontWeight="900" fontStyle="italic" fontSize="19.5" fill="#ffffff" textAnchor="middle" letterSpacing="-0.5">NEWS</text>
            </g>
          </svg>
          <div>
            <h3 className="text-xs font-black font-display text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
              <span>🎧 OUVIR MATÉRIA</span>
              <span className="bg-blue-100 text-blue-700 text-[8px] font-bold px-1.5 py-0.5 rounded tracking-widest">
                AUDIO-PLAY
              </span>
            </h3>
          </div>
        </div>

        {/* VOICE SELECTION DROP-OUT */}
        {voiceList.length > 1 && (
          <div className="relative">
            <button
              onClick={() => setShowVoiceSelect(!showVoiceSelect)}
              className="text-[10px] font-bold text-slate-650 hover:text-blue-600 flex items-center gap-1.5 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg transition-colors shadow-sm focus:outline-none cursor-pointer"
            >
              <Volume2 className="w-3.5 h-3.5 text-slate-500" />
              <span>
                {activeVoice?.lang.toLowerCase().startsWith('en') ? '🇺🇸 English: ' : '🇧🇷 Voz: '}
                {activeVoice ? activeVoice.name.replace(/Microsoft|Google|Apple/gi, '').trim().split(' ')[0] || 'Narrador' : 'Padrão'}
              </span>
            </button>
            
            {showVoiceSelect && (
              <div className="absolute right-0 top-9 mt-1 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1.5 z-50 text-left max-h-56 overflow-y-auto">
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-wider px-3 py-1.5 border-b border-slate-100 bg-slate-50">
                  Selecione um narrador
                </p>
                {voiceList.map((v) => {
                  const isEn = v.lang.toLowerCase().startsWith('en');
                  return (
                    <button
                      key={v.name}
                      onClick={() => {
                        setActiveVoice(v);
                        setShowVoiceSelect(false);
                        if (playState === 'playing') speakChunk(currentIdx);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs font-medium hover:bg-slate-50 transition-colors flex items-center justify-between border-0 cursor-pointer ${
                        activeVoice?.name === v.name ? 'text-blue-600 bg-blue-50/50 font-bold' : 'text-slate-705'
                      }`}
                    >
                      <span className="truncate max-w-[140px] flex items-center gap-1.5">
                        <span className="text-[11px]">{isEn ? '🇺🇸' : '🇧🇷'}</span>
                        <span className="truncate">{v.name.replace(/Microsoft|Google|Apple|Speech Synthesis/gi, '').trim()}</span>
                      </span>
                      <span className="text-[8px] font-mono font-bold px-1 py-0.5 rounded bg-slate-100 text-slate-550 uppercase shrink-0">
                        {isEn ? 'EN' : 'PT'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* CORE CONTROLLER TRACK & BAR */}
      <div className="bg-white border border-slate-200/80 p-3 md:p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4">
        
        {/* BIG G1 PLAY/PAUSE BUTTON */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={playState === 'playing' ? handlePause : handlePlay}
            className={`w-12 h-12 rounded-full flex items-center justify-center text-white transition-all shadow-md focus:inline-none cursor-pointer ${
              playState === 'playing' 
                ? 'bg-rose-600 hover:bg-rose-700 active:scale-95' 
                : 'bg-emerald-600 hover:bg-emerald-700 active:scale-95 animate-pulse'
            }`}
            title={playState === 'playing' ? 'Pausar' : 'Ouvir reportagem'}
          >
            {playState === 'playing' ? (
              <Pause className="w-5 h-5 fill-white text-white ml-0" />
            ) : (
              <Play className="w-5 h-5 fill-white text-white ml-0.5" />
            )}
          </button>

          {playState !== 'stopped' && (
            <button
              onClick={handleStop}
              className="w-8 h-8 rounded-full bg-slate-150 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer"
              title="Interromper áudio"
            >
              <Square className="w-3.5 h-3.5 fill-slate-700 text-slate-750" />
            </button>
          )}
        </div>

        {/* PROGRESS SLIDER AND SENTENCE POINTER */}
        <div className="flex-1 w-full space-y-1.5">
          <div className="flex justify-between items-center text-[10px] font-mono font-bold text-slate-500">
            <span>{formatTime(currentEstSeconds)}</span>
            <span>{formatTime(estimatedDuration)}</span>
          </div>

          {/* RULER TRACK BODY */}
          <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden relative border border-slate-200/50">
            <div 
              className="bg-gradient-to-r from-blue-500 to-emerald-500 h-full rounded-full transition-all duration-500 relative"
              style={{ width: `${progressPercent}%` }}
            >
              {/* Pulsing light tracker */}
              <div className="absolute right-0 top-0 h-full w-2 bg-white/70 animate-ping"></div>
            </div>
          </div>

          {/* SENTENCE INDEX DISPLAY */}
          {chunks.length > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-[9px] font-bold text-slate-450 uppercase tracking-widest">
                Parágrafo {currentIdx + 1} de {chunks.length}
              </span>
              
              {/* PREV/NEXT SENTENCE BUTTONS */}
              <div className="flex items-center gap-1">
                <button
                  onClick={handleSkipBackward}
                  disabled={currentIdx === 0}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer border-0"
                  title="Voltar sentença"
                >
                  <SkipBack className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleSkipForward}
                  disabled={currentIdx >= chunks.length - 1}
                  className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30 disabled:hover:text-slate-400 transition-colors cursor-pointer border-0"
                  title="Avançar sentença"
                >
                  <SkipForward className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* SPEED SELECTOR STYLED COHESIVELY */}
        <div className="flex flex-col items-center justify-center shrink-0 border-t sm:border-t-0 sm:border-l border-slate-150 pt-2 sm:pt-0 sm:pl-4 space-y-1 w-full sm:w-auto">
          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">
            Cadência (Tom)
          </span>
          <div className="flex gap-1.5 bg-slate-100 p-1 rounded-lg">
            {[
              { label: 'Suave', speedVal: 0.8 },
              { label: 'Pausado', speedVal: 0.88 },
              { label: 'Normal', speedVal: 1.0 },
              { label: 'Rápido', speedVal: 1.15 }
            ].map((sp) => (
              <button
                key={sp.label}
                onClick={() => handleSpeedChange(sp.speedVal)}
                className={`px-2 py-1 text-[9px] font-extrabold uppercase rounded transition-all cursor-pointer border-0 ${
                  Math.abs(speed - sp.speedVal) < 0.05
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-200 hover:text-slate-800'
                }`}
              >
                {sp.label}
              </button>
            ))}
          </div>
        </div>

      </div>

      {/* HIGHLIGHTED PHRASE IN SPEAKING BOX */}
      {playState === 'playing' && chunks[currentIdx] && (
        <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-start gap-2.5 animate-fadeIn">
          <Sparkles className="w-4 h-4 text-blue-500 shrink-0 mt-0.5 animate-spin-slow" />
          <p className="text-xs text-blue-900 leading-relaxed font-semibold italic">
            &ldquo;{chunks[currentIdx].text}&rdquo;
          </p>
        </div>
      )}

    </div>
  );
}
