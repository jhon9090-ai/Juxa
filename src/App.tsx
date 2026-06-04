import React, { useState, useEffect } from 'react';
import { NoteUploader } from './components/NoteUploader';
import { ArticleViewer } from './components/ArticleViewer';
import { LibraryDrawer } from './components/LibraryDrawer';
import { enhanceNote, EnhancedNote } from './services/geminiService';
import { saveNotebook, EnhancedNotebook } from './services/db';
import { ChevronLeft, Share2, Sparkles, AlertCircle, Compass, Cpu, History } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOADING_STAGES = [
  "Structuring curriculum sections based on note concepts...",
  "Generating highly-accurate dark vector coordinates for technical illustrations...",
  "Integrating custom inline SVG keyframe animations...",
  "Formatting mathematical principles into textbook KaTeX notation...",
  "Composing rigorous cognitive challenges & explaining answers...",
  "Polishing aesthetic layouts and matching typography settings..."
];

export default function App() {
  const [enhancedNote, setEnhancedNote] = useState<EnhancedNotebook | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isLoading) {
      setStageIndex(0);
      interval = setInterval(() => {
        setStageIndex((prev) => (prev < LOADING_STAGES.length - 1 ? prev + 1 : prev));
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  const handleEnhance = async (notes: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await enhanceNote(notes);
      
      // Auto-save parsed notebook to IndexedDB
      const offlineNotebook = await saveNotebook(result);
      setEnhancedNote(offlineNotebook);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectNotebook = (notebook: EnhancedNotebook) => {
    setEnhancedNote(notebook);
    setIsDrawerOpen(false);
    setError(null);
  };

  const handleBack = () => {
    setEnhancedNote(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="d8 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          {enhancedNote && (
            <button 
              onClick={handleBack}
              className="d48 d66 flex items-center justify-center transition-transform hover:scale-105"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">Juxa AI</span>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {/* History Drawer Trigger button */}
          <button 
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="d48 d66 flex items-center justify-center transition-all hover:bg-white/20" 
            title="Open Offine Library"
          >
            <History className="w-5 h-5" />
          </button>
          
          <button className="d48 d66 flex items-center justify-center transition-all hover:bg-white/20" aria-label="Share">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow pt-16 md:pt-20">
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading-screen"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-xl mx-auto px-6 py-20 text-center flex flex-col items-center justify-center"
            >
              <div className="relative mb-8">
                {/* Orbital Loader Pattern */}
                <div className="w-24 h-24 rounded-full border-4 border-slate-100 border-t-indigo-600 animate-spin"></div>
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-indigo-50 flex items-center justify-center shadow-inner">
                  <Cpu className="w-8 h-8 text-indigo-600 animate-pulse" />
                </div>
              </div>

              <span className="text-2xl font-bold text-slate-800">Transforming Studies</span>
              <p className="text-sm text-slate-400 mt-1 uppercase tracking-widest font-mono">Agent thinking level: High</p>

              {/* Progress Stage Tracker */}
              <div className="w-full mt-8 bg-white border border-slate-150 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-600 justify-center font-bold text-sm mb-3">
                  <Compass className="w-4 h-4 animate-spin" />
                  <span>Processing Stage {stageIndex + 1} of {LOADING_STAGES.length}</span>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stageIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-slate-600 text-sm font-medium leading-relaxed min-h-[40px] flex items-center justify-center"
                  >
                    {LOADING_STAGES[stageIndex]}
                  </motion.p>
                </AnimatePresence>

                {/* Progress bar */}
                <div className="h-1.5 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-500 rounded-full" 
                    style={{ width: `${((stageIndex + 1) / LOADING_STAGES.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Tips list */}
              <div className="mt-8 text-xs text-slate-400 flex flex-col gap-1 max-w-sm">
                <span>⚡ Designing premium inline vector demonstrations in high-contrast SVG.</span>
                <span>💡 This creates robust explanations without leaving out raw materials.</span>
              </div>
            </motion.div>
          ) : !enhancedNote ? (
            <motion.div
              key="uploader"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="py-12"
            >
              <NoteUploader onEnhance={handleEnhance} isLoading={isLoading} />
              
              {error && (
                <div className="max-w-3xl mx-auto mt-6 p-5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700 animate-in shake duration-300">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-semibold text-sm">{error}</p>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="viewer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ArticleViewer note={enhancedNote} />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Library Drawer Sidebar */}
      <LibraryDrawer 
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onSelectNotebook={handleSelectNotebook}
        currentNoteId={enhancedNote?.id}
      />

      {/* Footer */}
      <footer className="d19 py-12 mt-auto">
        <div className="d0 text-center">
          <div className="d36 flex justify-center gap-6 mb-4">
            <a href="#" className="d37 opacity-80 hover:opacity-100 transition-opacity">Terms</a>
            <a href="#" className="d37 opacity-80 hover:opacity-100 transition-opacity">Privacy</a>
            <a href="#" className="d37 opacity-80 hover:opacity-100 transition-opacity">Cookies</a>
            <a href="#" className="d37 opacity-80 hover:opacity-100 transition-opacity">Contact</a>
          </div>
          <div className="d36">
            <span className="d38 opacity-60">Juxa © 2026 • Supported by high-cognitive planning models</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

