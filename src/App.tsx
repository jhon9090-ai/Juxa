import React, { useState, useEffect } from 'react';
import { ArticleViewer } from './components/ArticleViewer';
import { LibraryDrawer } from './components/LibraryDrawer';
import { ModelSettingsModal } from './components/ModelSettingsModal';
import { UnitWorkspace } from './components/UnitWorkspace';
import { enhanceNote, EnhancedNote } from './services/geminiService';
import { saveNotebook, getAllNotebooks, deleteNotebook, EnhancedNotebook } from './services/db';
import { SYLLABUS, Subject, Theme, Unit } from './data/syllabus';
import { 
  ChevronLeft, Share2, Sparkles, AlertCircle, Compass, Cpu, 
  History, Settings, BookOpen, GraduationCap, Dna, Binary, 
  Activity, FlaskConical, CheckCircle, ArrowRight, BookOpenCheck,
  ChevronRight, Library, FileText, Sparkles as SparklesIcon,
  Sun, Moon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const LOADING_STAGES = [
  "Structuring syllabus curriculum standards for this specific unit...",
  "Running rigorous pedagogical analysis on raw notes...",
  "Formatting advanced formulas into compliant math KaTeX text...",
  "Synthesizing elaborate inline dark SVG technical diagrams...",
  "Formulating critical cognitive challenges and quiz items...",
  "Polishing textbook layout typography settings..."
];

// Dynamically assign subject icon
const SubjectIcon = ({ name, className }: { name: string; className?: string }) => {
  switch (name) {
    case "dna":
      return <Dna className={className} />;
    case "binary":
      return <Binary className={className} />;
    case "waves":
      return <Activity className={className} />;
    case "flask":
      return <FlaskConical className={className} />;
    case "graduation-cap":
      return <GraduationCap className={className} />;
    default:
      return <BookOpen className={className} />;
  }
};

export default function App() {
  // Navigation & Curriculum State
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedThemeId, setSelectedThemeId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  // App & Database State
  const [vaultNotebooks, setVaultNotebooks] = useState<EnhancedNotebook[]>([]);
  const [enhancedNote, setEnhancedNote] = useState<EnhancedNotebook | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stageIndex, setStageIndex] = useState(0);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [activeModelName, setActiveModelName] = useState("Gemini (Built-In)");

  // Dark Mode State with local persistence
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem("juxa_dark_mode") === "true";
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("juxa_dark_mode", "true");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("juxa_dark_mode", "false");
    }
  }, [darkMode]);

  // Sync with current model selection
  const updateActiveModelName = () => {
    const source = localStorage.getItem("juxa_api_source") || "builtin";
    if (source === "openrouter") {
      const model = localStorage.getItem("juxa_openrouter_model") || "google/gemini-2.5-pro";
      setActiveModelName(model.includes("/") ? model.split("/")[1] : model);
    } else {
      setActiveModelName("Gemini (Built-In)");
    }
  };

  // Load notebooks locally
  const loadVaultNotebooks = async () => {
    try {
      const data = await getAllNotebooks();
      setVaultNotebooks(data);
    } catch (err) {
      console.warn("Failed retrieving notebooks from Juxa DB.", err);
    }
  };

  useEffect(() => {
    updateActiveModelName();
    loadVaultNotebooks();
  }, []);

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

  // Generate textbook chapter
  const handleEnhance = async (rawContent: string) => {
    if (!selectedUnitId) return;
    setIsLoading(true);
    setError(null);
    try {
      const subject = SYLLABUS.find(s => s.id === selectedSubjectId);
      const theme = subject?.themes.find(t => t.id === selectedThemeId);
      const unit = theme?.units.find(u => u.id === selectedUnitId);

      const unitContext = subject && theme && unit ? {
        subjectName: subject.name,
        themeName: theme.name,
        unitName: unit.name
      } : undefined;

      // Request detailed long textbook-grade chapter from enhanced Gemini LLM
      const result = await enhanceNote(rawContent, unitContext);
      
      // Auto-save with unit link
      const offlineNotebook = await saveNotebook({
        ...result,
        unitId: selectedUnitId
      });

      // Synchronize index
      await loadVaultNotebooks();
      setEnhancedNote(offlineNotebook);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred during note enhancement.');
    } finally {
      setIsLoading(false);
    }
  };

  // Selection from Drawer / Lesson Workspace jump
  const handleSelectNotebook = (notebook: EnhancedNotebook) => {
    setEnhancedNote(notebook);
    setIsDrawerOpen(false);
    setError(null);

    // Auto-traverse menu path to matched unit if available
    if (notebook.unitId) {
      for (const subject of SYLLABUS) {
        for (const theme of subject.themes) {
          const unit = theme.units.find(u => u.id === notebook.unitId);
          if (unit) {
            setSelectedSubjectId(subject.id);
            setSelectedThemeId(theme.id);
            setSelectedUnitId(notebook.unitId);
            break;
          }
        }
      }
    }
  };

  const handleDeleteNotebook = async (id: string) => {
    if (confirm("Are you sure you want to permanently delete this textbook lesson from your offline database?")) {
      try {
        await deleteNotebook(id);
        await loadVaultNotebooks();
        if (enhancedNote?.id === id) {
          setEnhancedNote(null);
        }
      } catch (err) {
        console.error("Failed to delete notebook:", err);
      }
    }
  };

  // Breadcrumb / Back Navigation Trigger
  const handleBack = () => {
    if (enhancedNote) {
      setEnhancedNote(null);
    } else if (selectedUnitId) {
      setSelectedUnitId(null);
    } else if (selectedThemeId) {
      setSelectedThemeId(null);
    } else if (selectedSubjectId) {
      setSelectedSubjectId(null);
    }
    setError(null);
  };

  // Helper computation: count completed units in a subject
  const getSubjectProgress = (subject: Subject) => {
    const totalUnits = subject.themes.reduce((acc, t) => acc + t.units.length, 0);
    const completedUnits = subject.themes.reduce((acc, t) => {
      return acc + t.units.filter(unit => vaultNotebooks.some(n => n.unitId === unit.id)).length;
    }, 0);
    return { completedUnits, totalUnits };
  };

  const getThemeProgress = (theme: Theme) => {
    const total = theme.units.length;
    const completed = theme.units.filter(u => vaultNotebooks.some(n => n.unitId === u.id)).length;
    return { completed, total };
  };

  const activeSubject = SYLLABUS.find(s => s.id === selectedSubjectId);
  const activeTheme = activeSubject?.themes.find(t => t.id === selectedThemeId);
  const activeUnit = activeTheme?.units.find(u => u.id === selectedUnitId);
  const activeNotebookForUnit = selectedUnitId ? vaultNotebooks.find(n => n.unitId === selectedUnitId) || null : null;

  const showBackButton = !!(enhancedNote || selectedUnitId || selectedThemeId || selectedSubjectId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Header */}
      <header className="d8 flex items-center justify-between px-4 md:px-8">
        <div className="flex items-center gap-4">
          {showBackButton && (
            <button 
              onClick={handleBack}
              className="d48 d66 flex items-center justify-center transition-transform hover:scale-105 cursor-pointer"
              aria-label="Go back"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-indigo-500 to-pink-500 rounded-full flex items-center justify-center shadow-md">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <span className="text-xl font-black text-white tracking-tight">Juxa</span>
          </div>
        </div>
        
        {/* Breadcrumb Path for Desktop */}
        {activeSubject && !enhancedNote && (
          <div className="hidden lg:flex items-center gap-2 text-xs font-bold text-white/50 font-mono">
            <span>Syllabus</span>
            <span>/</span>
            <span 
              className={`hover:text-white cursor-pointer transition-colors ${!selectedThemeId ? 'text-white' : ''}`}
              onClick={() => { setSelectedThemeId(null); setSelectedUnitId(null); }}
            >
              {activeSubject.shortName}
            </span>
            {activeTheme && (
              <>
                <span>/</span>
                <span 
                  className={`hover:text-white cursor-pointer transition-colors ${!selectedUnitId ? 'text-white' : ''}`}
                  onClick={() => { setSelectedUnitId(null); }}
                >
                  {activeTheme.name}
                </span>
                {activeUnit && (
                  <>
                    <span>/</span>
                    <span className="text-white">{activeUnit.name}</span>
                  </>
                )}
              </>
            )}
          </div>
        )}

        <div className="flex items-center gap-1">
          {/* Theme Toggler */}
          <button
            type="button"
            onClick={() => setDarkMode(!darkMode)}
            className="d48 d66 flex items-center justify-center transition-all hover:bg-white/20 cursor-pointer"
            title={darkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
            aria-label="Toggle Theme"
          >
            {darkMode ? <Sun className="w-5 h-5 text-amber-300" /> : <Moon className="w-5 h-5 text-slate-100" />}
          </button>

          {/* AI Settings Trigger */}
          <button 
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="d48 d66 flex items-center justify-center transition-all hover:bg-white/20 cursor-pointer" 
            title="AI Configuration Settings"
          >
            <Settings className="w-5 h-5" />
          </button>

          {/* History Drawer Trigger button */}
          <button 
            type="button"
            onClick={() => setIsDrawerOpen(true)}
            className="d48 d66 flex items-center justify-center transition-all hover:bg-white/20 cursor-pointer" 
            title="Open Offline Library"
          >
            <History className="w-5 h-5" />
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

              <span className="text-2xl font-black tracking-tight text-slate-800">Synthesizing Course Chapter</span>
              <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-mono font-bold">Juxa AI Engine • Co-pilot thinking check</p>

              {/* Progress Stage Tracker */}
              <div className="w-full mt-8 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex items-center gap-2 text-indigo-650 justify-center font-black text-sm mb-3 font-mono">
                  <Compass className="w-4 h-4 animate-spin" />
                  <span>PHASE {stageIndex + 1} OF {LOADING_STAGES.length}</span>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.p
                    key={stageIndex}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    className="text-slate-600 text-sm font-semibold leading-relaxed min-h-[44px] flex items-center justify-center px-4"
                  >
                    {LOADING_STAGES[stageIndex]}
                  </motion.p>
                </AnimatePresence>

                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-100 rounded-full mt-4 overflow-hidden">
                  <div 
                    className="h-full bg-indigo-600 transition-all duration-500 rounded-full" 
                    style={{ width: `${((stageIndex + 1) / LOADING_STAGES.length) * 100}%` }}
                  />
                </div>
              </div>

              {/* Tips list */}
              <div className="mt-8 text-[11px] text-slate-400 flex flex-col gap-1 max-w-sm">
                <span>⚡ Harnessing deep contextual thinking capabilities for complex curriculum.</span>
                <span>💡 Generating complete textbook structures and interactive MCQ testing nodes.</span>
              </div>
            </motion.div>
          ) : enhancedNote ? (
            <motion.div
              key="viewer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <ArticleViewer note={enhancedNote} onUpdateNote={setEnhancedNote} />
            </motion.div>
          ) : selectedUnitId && activeSubject && activeTheme && activeUnit ? (
            /* Selected Unit detail Workspace */
            <motion.div
              key="unit-workspace"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="py-6"
            >
              <UnitWorkspace
                subjectName={activeSubject.name}
                themeName={activeTheme.name}
                unitName={activeUnit.name}
                unitGrade={activeUnit.grade}
                existingNotebook={activeNotebookForUnit}
                onGenerate={handleEnhance}
                onOpenNotebook={handleSelectNotebook}
                onDeleteNotebook={handleDeleteNotebook}
                isLoading={isLoading}
              />
              {error && (
                <div className="max-w-3xl mx-auto mt-6 p-5 bg-red-50 border border-red-200 rounded-2xl flex items-center gap-3 text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <p className="font-semibold text-sm">{error}</p>
                </div>
              )}
            </motion.div>
          ) : selectedThemeId && activeSubject && activeTheme ? (
            /* Selected Theme Detail Screen Listing its Units */
            <motion.div
              key="theme-detail"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto px-4 py-8"
              id="theme-detail-panel"
            >
              {/* Theme Header Summary Box */}
              <div className="bg-white border border-slate-200 p-6 md:p-8 rounded-3xl mb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 shadow-sm">
                <div>
                  <div className="text-xs font-bold text-indigo-600 uppercase tracking-widest font-mono mb-1">
                    {activeSubject.name} • Curriculum Topic
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight leading-none mb-2">
                    {activeTheme.name}
                  </h2>
                  <p className="text-sm text-slate-400">Select a unit below to read generated textbook notes or feed new syllabus instructions.</p>
                </div>
                
                {/* Theme progress pill */}
                <div className="bg-transparent border border-indigo-200 dark:border-indigo-500/30 rounded-2xl px-5 py-3 text-center self-stretch md:self-auto flex md:flex-col justify-between items-center whitespace-nowrap">
                  <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">Progress</span>
                  <span className="text-base font-black text-indigo-950 dark:text-indigo-300 mt-0.5">
                    {getThemeProgress(activeTheme).completed} / {getThemeProgress(activeTheme).total} Units Finished
                  </span>
                </div>
              </div>

              {/* Units Checklist Grid */}
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-4">Units Listing</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {activeTheme.units.map(unit => {
                  const unitNote = vaultNotebooks.find(n => n.unitId === unit.id);
                  const isComplete = !!unitNote;
                  
                  return (
                    <div
                      key={unit.id}
                      onClick={() => setSelectedUnitId(unit.id)}
                      className={`group border rounded-2.5xl p-5 cursor-pointer text-left focus:outline-none transition-all ${
                        isComplete 
                          ? "border-emerald-200 bg-white shadow-sm hover:border-emerald-400 hover:shadow" 
                          : "border-slate-250 bg-white hover:border-indigo-400 hover:shadow-sm"
                      }`}
                    >
                      <div className="flex justify-between items-start gap-4 mb-3">
                        <span className="text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg font-mono">
                          {unit.grade || "CORE"}
                        </span>
                        
                        {isComplete ? (
                          <span className="flex items-center gap-1 text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-1 rounded-full border border-emerald-100">
                            <CheckCircle className="w-3 h-3" />
                            <span>Lesson Drafted</span>
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-medium bg-slate-50 px-2 py-1 rounded-full">
                            Concept Pending
                          </span>
                        )}
                      </div>
                      
                      <h4 className="text-base font-black text-slate-850 group-hover:text-indigo-650 transition-colors leading-tight mb-2">
                        {unit.name}
                      </h4>
                      
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed mb-4">
                        {isComplete ? unitNote.title : "No notes yet. Upload textbook resource chapters, PDF, Markdown text to initiate course drafting."}
                      </p>

                      <div className="flex items-center justify-between text-xs font-extrabold text-indigo-650 pt-2 border-t border-slate-100/60 font-mono">
                        <span>{isComplete ? "Review Lesson" : "Generate Chapter"}</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : selectedSubjectId && activeSubject ? (
            /* Selected Subject Detail Screen listing all of its Themes */
            <motion.div
              key="subject-detail"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-4xl mx-auto px-4 py-8"
              id="subject-detail-panel"
            >
              {/* Subject Hero Summary Box */}
              <div className="bg-white border-2 border-slate-200/85 p-6 md:p-8 rounded-3xl mb-8 flex flex-col md:flex-row items-stretch justify-between gap-6 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
                
                <div className="relative z-10 max-w-xl">
                  <div className="flex items-center gap-2 text-indigo-650 text-xs font-bold tracking-widest uppercase font-mono mb-2">
                    <SubjectIcon name={activeSubject.iconName} className="w-3.5 h-3.5" />
                    <span>SYLLABUS PORTFOLIO</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-850 tracking-tight leading-none mb-3">
                    {activeSubject.name}
                  </h2>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    {activeSubject.description} Click study themes below to browse individual units, upload curriculum files, and manage your Juxa local library.
                  </p>
                </div>

                <div className="relative z-10 bg-indigo-950/5 border border-indigo-950/10 hover:bg-indigo-955/10 rounded-2.5xl px-6 py-5 flex md:flex-col justify-between items-center md:justify-center gap-2 whitespace-nowrap md:min-w-[160px] cursor-default">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Course progress</span>
                  <span className="text-2xl font-black text-indigo-950">
                    {getSubjectProgress(activeSubject).completedUnits} / {getSubjectProgress(activeSubject).totalUnits}
                  </span>
                  <span className="text-[9px] font-mono font-medium text-slate-400 uppercase tracking-wider">Units Complete</span>
                </div>
              </div>

              {/* Themes Grid */}
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-4">Themes Outline ({activeSubject.themes.length})</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {activeSubject.themes.map(theme => {
                  const progress = getThemeProgress(theme);
                  const isCompletedTheme = progress.completed === progress.total;
                  
                  return (
                    <div
                      key={theme.id}
                      onClick={() => setSelectedThemeId(theme.id)}
                      className="group border border-slate-200 hover:border-slate-400 bg-white hover:bg-slate-50/10 rounded-3xl p-6 text-left shadow-sm hover:shadow hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between min-h-[170px]"
                    >
                      <div>
                        {/* Completion tag */}
                        <div className="flex justify-between items-center mb-3">
                          <span className="text-[10px] font-extrabold uppercase font-mono tracking-wider text-slate-450 bg-slate-50 px-2.5 py-1 rounded-lg">
                            {theme.units.length} UNITS
                          </span>
                          
                          {progress.completed > 0 && (
                            <span className={`text-[10px] font-black px-2.5 py-1 rounded-full font-mono flex items-center gap-1 ${
                              isCompletedTheme 
                                ? "bg-emerald-50 text-emerald-700" 
                                : "bg-indigo-50 text-indigo-700"
                            }`}>
                              <span>{progress.completed}/{progress.total} UNIT LECTURES</span>
                            </span>
                          )}
                        </div>
                        
                        <h4 className="text-lg font-black text-slate-800 tracking-tight mb-2 group-hover:text-indigo-600 transition-colors">
                          {theme.name}
                        </h4>
                      </div>

                      <div className="flex items-center justify-between text-xs font-extrabold text-indigo-650 pt-3 border-t border-slate-100 font-mono">
                        <span>Browse Theme Units</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1.5 transition-transform" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          ) : (
            /* Home Screen: Subject Grid View */
            <motion.div
              key="syllabus-home"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="max-w-5xl mx-auto px-4 py-8"
              id="syllabus-dashboard"
            >
              {/* Modern Elegant Dashboard Greeting */}
              <div className="text-center mb-10 max-w-xl mx-auto relative">
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-pink-100 rounded-full blur-3xl opacity-40"></div>
                
                <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight relative">
                  Juxa Study Vault
                </h1>
              </div>

              {/* Subjects Bento Grid */}
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-5">Select Class Subject Syllabus</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                {SYLLABUS.map(subj => {
                  const progress = getSubjectProgress(subj);
                  const isStarted = progress.completedUnits > 0;
                  
                  return (
                    <div
                      key={subj.id}
                      onClick={() => setSelectedSubjectId(subj.id)}
                      className="group relative bg-white border border-slate-200 rounded-3xl p-6 text-left shadow-sm hover:shadow hover:scale-[1.01] transition-all cursor-pointer flex flex-col justify-between min-h-[220px]"
                    >
                      <div>
                        {/* Dynamic Icon with Colored Container */}
                        <div className={`w-11 h-11 bg-gradient-to-tr ${subj.gradient} text-white rounded-2xl flex items-center justify-center mb-4 shadow-sm`}>
                          <SubjectIcon name={subj.iconName} className="w-5 h-5" />
                        </div>
                        
                        <h4 className="text-lg font-black text-slate-800 tracking-tight leading-snug mb-1 group-hover:text-indigo-600 transition-colors">
                          {subj.name}
                        </h4>
                        
                        <p className="text-xs text-slate-400 line-clamp-3 leading-relaxed mb-4">
                          {subj.description}
                        </p>
                      </div>

                      <div>
                        {/* Progress meter */}
                        <div className="mt-4 pt-3 border-t border-slate-100/60 flex items-center justify-between text-[11px] font-bold text-slate-600 font-mono">
                          <span className="text-slate-400">{subj.themes.length} Subjects•Themes</span>
                          <span>{progress.completedUnits} / {progress.totalUnits} Units</span>
                        </div>
                        
                        {/* Slim bar if started */}
                        <div className="h-1 w-full bg-slate-50 rounded-full mt-2 overflow-hidden">
                          <div 
                            className={`h-full rounded-full bg-gradient-to-r ${subj.gradient}`} 
                            style={{ width: `${(progress.completedUnits / progress.totalUnits) * 100}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Recently completed lessons if database has items */}
              {vaultNotebooks.length > 0 && (
                <div className="border-t border-slate-200 pt-8" id="recent-studies">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-xs font-black text-slate-450 uppercase tracking-widest font-mono">Recent Drafted Chapters</h3>
                    <span className="text-xs text-indigo-650 cursor-pointer hover:underline font-mono" onClick={() => setIsDrawerOpen(true)}>Open Library Drawer</span>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {vaultNotebooks.slice(0, 2).map(notebook => {
                      const matchedSubject = SYLLABUS.find(s => s.themes.some(t => t.units.some(u => u.id === notebook.unitId)));
                      return (
                        <div
                          key={notebook.id}
                          onClick={() => handleSelectNotebook(notebook)}
                          className="flex items-center justify-between p-4 bg-white border border-slate-200 hover:border-slate-300 rounded-2.5xl shadow-sm hover:shadow transition-all cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-indigo-50 text-indigo-650 rounded-xl flex items-center justify-center flex-shrink-0">
                              <BookOpenCheck className="w-5 h-5 animate-pulse" />
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-350 bg-slate-50 px-2 py-0.5 rounded font-mono">
                                {matchedSubject ? matchedSubject.shortName : "Syllabus Course"}
                              </span>
                              <h4 className="text-sm font-black text-slate-800 line-clamp-1 mt-0.5">
                                {notebook.title}
                              </h4>
                            </div>
                          </div>
                          
                          <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
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

      {/* Settings Dialog Modal */}
      <ModelSettingsModal 
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onSettingsSaved={updateActiveModelName}
      />

      {/* Footer */}
      <footer className="py-6 mt-auto"></footer>
    </div>
  );
}
