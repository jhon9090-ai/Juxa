import React, { useState, useRef, DragEvent, useEffect } from 'react';
import { 
  Upload, FileText, Send, Sparkles, File, Trash2, 
  ChevronDown, ChevronUp, AlertCircle, RefreshCw, FileUp,
  Cpu, BookOpen, Clock, Zap, Search, Layers, Compass, ArrowRight,
  BookMarked, HelpCircle, GraduationCap, ClipboardList, MoveRight, HelpCircle as HelpIcon
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getAllNotebooks, deleteNotebook, EnhancedNotebook } from '../services/db';

declare global {
  interface Window {
    pdfjsLib?: any;
    pdfjsWorker?: any;
  }
}

interface NoteUploaderProps {
  onEnhance: (notes: string) => void;
  isLoading: boolean;
}

export const NoteUploader: React.FC<NoteUploaderProps> = ({ onEnhance, isLoading }) => {
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [extractedFile, setExtractedFile] = useState<{ name: string; size: string; content: string } | null>(null);
  const [extractorLoading, setExtractorLoading] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [showPastedTextOption, setShowPastedTextOption] = useState(false);
  const [recentNotebooks, setRecentNotebooks] = useState<EnhancedNotebook[]>([]);
  const [searchVaultQuery, setSearchVaultQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch from the local IndexedDB database
  const fetchRecentNotebooks = async () => {
    try {
      const data = await getAllNotebooks();
      setRecentNotebooks(data);
    } catch (err) {
      console.warn("Failed loading offline library notebooks for home screen list.", err);
    }
  };

  useEffect(() => {
    fetchRecentNotebooks();
  }, []);

  const handleDeleteNotebook = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("Are you sure you want to permanently delete this notebook from your history?")) {
      try {
        await deleteNotebook(id);
        setRecentNotebooks(prev => prev.filter(n => n.id !== id));
      } catch (err: any) {
        alert(err?.message || "Could not delete the notebook.");
      }
    }
  };

  // Safe CDN loader for PDF parser
  const loadPdfLibrary = (): Promise<any> => {
    return new Promise((resolve, reject) => {
      if (window.pdfjsLib) {
        return resolve(window.pdfjsLib);
      }
      
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js';
      script.onload = () => {
        const pdfjsLib = window.pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js';
        resolve(pdfjsLib);
      };
      script.onerror = () => {
        reject(new Error("Unable to load the PDF extraction script. Please verify your internet connection."));
      };
      document.body.appendChild(script);
    });
  };

  const parseFileContent = async (file: File) => {
    setExtractorLoading(true);
    setExtractionError(null);
    const sizeStr = (file.size / 1024).toFixed(1) + ' KB';

    try {
      if (file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string || '');
          reader.onerror = () => reject(new Error("Error reading content of the text/markdown file."));
          reader.readAsText(file);
        });

        if (!text.trim()) {
          throw new Error("Pasted or uploaded document has empty text.");
        }

        setExtractedFile({
          name: file.name,
          size: sizeStr,
          content: text
        });

      } else if (file.name.endsWith('.pdf')) {
        const pdfjs = await loadPdfLibrary();
        const fileReader = new FileReader();
        
        const arrayBuffer = await new Promise<ArrayBuffer>((resolve, reject) => {
          fileReader.onload = () => resolve(fileReader.result as ArrayBuffer);
          fileReader.onerror = () => reject(new Error("Failed reading the PDF structure."));
          fileReader.readAsArrayBuffer(file);
        });

        const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let cumulativeText = "";

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const tokenizedText = await page.getTextContent();
          const pageStrings = tokenizedText.items.map((token: any) => token.str);
          cumulativeText += pageStrings.join(" ") + "\n\n";
        }

        if (!cumulativeText.trim()) {
          throw new Error("No readable text could be extracted from the uploaded PDF document.");
        }

        setExtractedFile({
          name: file.name,
          size: sizeStr,
          content: cumulativeText
        });
      } else {
        throw new Error("Unsupported format. Please choose a PDF, TXT or MD document.");
      }
    } catch (err: any) {
      console.error(err);
      setExtractionError(err.message || "An unexpected error occurred during note extraction.");
    } finally {
      setExtractorLoading(false);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      await parseFileContent(files[0]);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await parseFileContent(files[0]);
    }
  };

  const handleTriggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const clearFile = () => {
    setExtractedFile(null);
    setExtractionError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerProcess = () => {
    if (extractedFile) {
      onEnhance(extractedFile.content);
    } else if (pastedText.trim()) {
      onEnhance(pastedText);
    }
  };

  const triggerSample = (sampleType: string) => {
    let sampleContent = "";
    if (sampleType === 'maxwell') {
      sampleContent = `Maxwell's Equations describe electromagnetic waves and field propagation. 
1. Gauss's Law for Electric Fields relates the charge Q to the electric flux: § D * dA = Q(enclosed). 
2. Gauss's Law for Magnetism states there are no magnetic monopoles: § B * dA = 0.
3. Faraday's Law of Induction: Changing magnetic fields produce mechanical/electrical force: § E * dl = -dΦB/dt. This allows transformers and power generators to harvest continuous alternating current.
4. Ampere's Circuital Law (with Maxwell's correction): § H * dl = I + dD/dt, specifying current flow and displacement currents.`;
    } else if (sampleType === 'krebs') {
      sampleContent = `The Citric Acid Cycle (Krebs Cycle) occurs inside the mitochondrial matrix and extracts high-energy electrons to feed the respiratory chain.
Key milestones:
- Condensation: Acetyl-CoA (2C) joins Oxaloacetate (4C) catalyzed by citrate synthase to synthesize Citrate (6C).
- Isomerization: Citrate is rearranged to Isocitrate.
- First Oxidative Decarboxylation: Isocitrate dehydrogenase oxidizes Isocitrate to alpha-ketoglutarate, releasing CO2 and reducing NAD+ to NADH.
- Second Oxidative Decarboxylation: alpha-ketoglutarate is oxidized to Succinyl-CoA, releasing another CO2 and another NADH.
- Substrate-level phosphorylation yields GTP. Subsequent steps regenerate oxaloacetate, producing FADH2 and one final NADH.`;
    } else if (sampleType === 'kepler') {
      sampleContent = `Kepler's Laws of Planetary Motion revolutionized astronomy and astrophysics.
1. The Law of Orbits: All planets move in elegant elliptical paths, with the sun situated at one of the two focal coordinate intersections.
2. The Law of Areas: An imaginary vector line segment drawn from the primary sun to the planetary sphere sweeps out equal surface areas in equal intervals of duration. Consequently, orbiting bodies travel faster near perihelion (closest point) compared to aphelion (farthest point).
3. The Law of Periods: The square of the orbital period T of a planet is directly proportional to the cube of the semi-major axis of its eccentric trajectory path: T² ∝ a³.`;
    }
    onEnhance(sampleContent);
  };

  const activeContentExists = !!(extractedFile?.content || pastedText.trim());

  const filteredVault = recentNotebooks.filter(notebook => {
    if (!searchVaultQuery) return true;
    const query = searchVaultQuery.toLowerCase();
    return notebook.title?.toLowerCase().includes(query) || 
           notebook.htmlContent?.toLowerCase().includes(query);
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 md:px-8 py-10 animate-in fade-in duration-500">
      
      {/* Decorative Radial Ambiance */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-5xl h-[380px] bg-gradient-to-b from-indigo-500/5 via-violet-500/[0.02] to-transparent blur-3xl rounded-full -z-10 pointer-events-none" />

      {/* Reimagined Minimal & Hero Header Section */}
      <div className="text-center mb-16 max-w-4xl mx-auto pt-4">
        
        {/* Modern micro-tag with clean glow */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50/80 rounded-full border border-indigo-100 text-[11px] text-indigo-700 font-bold mb-6 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
          <span className="uppercase tracking-widest text-[9px]">Aesthetic Vector & Math Co-Pilot</span>
        </div>
        
        <h1 className="text-6xl sm:text-7xl font-semibold tracking-tight text-slate-900 leading-tight mb-4">
          Juxa
        </h1>
        
        <p className="text-slate-500 text-lg max-w-2xl mx-auto leading-relaxed font-normal">
          A premium scholastic tool that renders beautiful math calculations, diagnostic quizzes, and animated vector demonstrations to transform regular notes.
        </p>
      </div>

      {/* Main Grid Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        
        {/* Left main interactive workspace (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between space-y-6">
          
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden flex flex-col flex-1">
            
            {/* Elegant Tab System */}
            <div className="pt-6 px-6 pb-2 border-b border-slate-100 flex items-center justify-between">
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setShowPastedTextOption(false)}
                  className={cn(
                    "pb-3 text-sm font-bold border-b-2 transition-all px-1",
                    !showPastedTextOption 
                      ? "text-indigo-600 border-indigo-600" 
                      : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  Document Parser
                </button>
                <button
                  type="button"
                  onClick={() => setShowPastedTextOption(true)}
                  className={cn(
                    "pb-3 text-sm font-bold border-b-2 transition-all px-1",
                    showPastedTextOption 
                      ? "text-indigo-600 border-indigo-600" 
                      : "text-slate-400 border-transparent hover:text-slate-600"
                  )}
                >
                  Direct Paste
                </button>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                <Cpu className="w-3.5 h-3.5 text-indigo-500" />
                <span>Client-Side Compilation</span>
              </div>
            </div>

            {/* Content pane depending on active tab selection */}
            <div className="p-6 flex-1 flex flex-col justify-center">
              {!showPastedTextOption ? (
                <div className="flex-1 flex flex-col justify-center">
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileChange}
                    accept=".pdf,.txt,.md"
                    className="hidden" 
                  />
                  
                  {!extractedFile ? (
                    <div 
                      onDragOver={handleDragOver}
                      onDragLeave={handleDragLeave}
                      onDrop={handleDrop}
                      onClick={handleTriggerFileInput}
                      className={cn(
                        "border border-slate-200 bg-slate-50/50 hover:bg-slate-50 border-dashed rounded-2xl p-12 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 min-h-[240px]",
                        isDragging && "border-indigo-500 bg-indigo-50/60 scale-[0.99] shadow-inner",
                        extractorLoading && "pointer-events-none opacity-60"
                      )}
                    >
                      {extractorLoading ? (
                        <div className="flex flex-col items-center py-4">
                          <div className="relative mb-3">
                            <div className="w-12 h-12 border-3 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">Decoding pdf layout...</h4>
                          <span className="text-[11px] text-slate-400 mt-1">Reading elements directly block-by-block</span>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 bg-white border border-slate-200 rounded-xl flex items-center justify-center text-indigo-600 shadow-sm transition-transform hover:scale-105 mb-4">
                            <Upload className="w-5 h-5" />
                          </div>
                          <h4 className="font-bold text-slate-800 text-sm">Upload Academic Note</h4>
                          <p className="text-slate-400 text-xs max-w-sm mt-1.5 mb-3 leading-relaxed">
                            Drag your PDF file here, or click to choose from directory. Supports standard lecture slips, notes & formulas.
                          </p>
                          
                          <div className="flex gap-2 text-[10px] text-slate-450 font-bold bg-white px-3 py-1 border border-slate-100 rounded-full shadow-sm">
                            <span>PDF</span>
                            <span className="text-slate-350">•</span>
                            <span>MARKDOWN</span>
                            <span className="text-slate-350">•</span>
                            <span>TEXT</span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 border border-indigo-100 bg-indigo-50/20 rounded-2xl flex items-center justify-between shadow-sm animate-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 flex-shrink-0">
                          <File className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-800 text-sm truncate">{extractedFile.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                            <span>{extractedFile.size}</span>
                            <span>•</span>
                            <span className="text-emerald-600 font-bold">Successfully Parsed</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        type="button" 
                        onClick={clearFile}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                        title="Dismiss notebook"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {extractionError && (
                    <div className="mt-3 p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start gap-2 text-rose-700 text-sm animate-in slide-in-from-top-1">
                      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                      <span>{extractionError}</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex-1 flex flex-col justify-center animate-in fade-in duration-300">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Enter mathematical formulas, biology cycles, chemistry structures or astrophysics theories directly..."
                    className="w-full h-44 p-4 text-slate-755 bg-slate-50/50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl transition-all outline-none resize-none text-xs leading-relaxed"
                    disabled={isLoading}
                  />
                  <div className="mt-1.5 flex justify-between text-[10px] text-slate-400 font-medium">
                    <span>{pastedText.length} characters</span>
                    <span>Supports unicode equations</span>
                  </div>
                </div>
              )}
            </div>

            {/* Launch Workspace controls */}
            <div className="px-6 py-5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <BookMarked className="w-4 h-4 text-slate-400" />
                <span>Zero-cloud footprint</span>
              </span>

              <button
                type="button"
                onClick={triggerProcess}
                disabled={isLoading || !activeContentExists}
                className={cn(
                  "flex items-center gap-2 px-6 py-3 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-lg hover:bg-slate-800 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none",
                  isLoading && "animate-pulse"
                )}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing Juxa...</span>
                  </>
                ) : (
                  <>
                    <span>Generate Notebook</span>
                    <MoveRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Clean illustrative status banner */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/60 flex items-center justify-between text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-indigo-500" />
              <span>Includes mock revision quizzes, feedback, coordinates, and math.</span>
            </div>
          </div>
        </div>

        {/* Right Obsidian Knowledge Vault & Quick templates (5 cols) */}
        <div className="lg:col-span-5 flex flex-col justify-between space-y-6">
          
          {/* Quick interactive Templates */}
          <div className="bg-slate-900 text-white rounded-3xl p-6 border border-slate-800 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-widest mb-3">
                <Zap className="w-4 h-4 animate-pulse" />
                <span>Scholastic Demonstration Kits</span>
              </div>
              <h3 className="font-extrabold text-white text-base tracking-tight mb-2">No notes nearby?</h3>
              <p className="text-slate-400 text-xs leading-relaxed mb-4">
                Launch structured textbook notes featuring inline dynamic vector equations instantly.
              </p>
            </div>

            <div className="space-y-2.5">
              <button 
                onClick={() => triggerSample('maxwell')}
                className="w-full text-left p-3 bg-slate-800/80 hover:bg-slate-800 hover:border-slate-700 border border-transparent rounded-2xl transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold text-[10px]">
                    EM
                  </div>
                  <div className="min-w-0">
                    <span className="block font-bold text-xs text-white">Maxwell's Field Equations</span>
                    <span className="text-[10px] text-slate-450 block">Astrophysics, integrals, derivatives</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-405 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => triggerSample('krebs')}
                className="w-full text-left p-3 bg-slate-800/80 hover:bg-slate-800 hover:border-slate-700 border border-transparent rounded-2xl transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-450 flex items-center justify-center font-medium text-[10px]">
                    KB
                  </div>
                  <div className="min-w-0">
                    <span className="block font-bold text-xs text-white">Citric Acid Respirations</span>
                    <span className="text-[10px] text-slate-450 block">Biochemical cycle, Krebs steps</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-405 group-hover:translate-x-1 transition-transform" />
              </button>

              <button 
                onClick={() => triggerSample('kepler')}
                className="w-full text-left p-3 bg-slate-800/80 hover:bg-slate-800 hover:border-slate-700 border border-transparent rounded-2xl transition-all flex items-center justify-between group"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/20 text-violet-400 flex items-center justify-center font-medium text-[10px]">
                    KP
                  </div>
                  <div className="min-w-0">
                    <span className="block font-bold text-xs text-white">Kepler's Astrophysics</span>
                    <span className="text-[10px] text-slate-450 block">Ellipses, eccentricity vectors</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-405 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Gorgeous Durable Knowledge Vault */}
          <div className="bg-white rounded-3xl border border-slate-200/95 shadow-xl overflow-hidden flex flex-col flex-1 min-h-[300px]">
            
            <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-500" />
                <span className="font-bold text-xs text-slate-800">Dynamic Knowledge Vault</span>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold">
                {recentNotebooks.length} Saved
              </span>
            </div>

            {/* Quick search input */}
            <div className="p-3 bg-white border-b border-slate-100">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Filter historic catalog..."
                  value={searchVaultQuery}
                  onChange={(e) => setSearchVaultQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-150 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 rounded-xl transition-all outline-none text-xs placeholder-slate-400"
                />
              </div>
            </div>

            {/* Notebook file tree */}
            <div className="flex-1 overflow-y-auto max-h-[190px] p-3 space-y-2 bg-slate-50/20">
              {recentNotebooks.length === 0 ? (
                <div className="py-10 text-center flex flex-col items-center justify-center text-slate-400">
                  <ClipboardList className="w-8 h-8 mb-2 stroke-[1.5] text-slate-300" />
                  <span className="font-bold text-xs text-slate-700">Offline Catalog Is Clean</span>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-0.5">Your transformations save locally automatically.</p>
                </div>
              ) : filteredVault.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-450 font-medium">No matches.</div>
              ) : (
                filteredVault.map((notebook) => {
                  const words = notebook.htmlContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
                  const dateStr = new Date(notebook.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric'
                  });

                  return (
                    <div 
                      key={notebook.id}
                      onClick={() => onEnhance(notebook.htmlContent)}
                      className="group p-3 bg-white border border-slate-205 hover:border-indigo-300 hover:shadow-xs rounded-xl cursor-pointer transition-all duration-200 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="block font-bold text-xs text-slate-800 truncate group-hover:text-indigo-600">
                          {notebook.title}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[9px] text-slate-400">
                          <span>{dateStr}</span>
                          <span>•</span>
                          <span>{words} words</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotebook(notebook.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-slate-300 hover:text-red-500 rounded transition"
                          title="Purge"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <div className="p-1 text-slate-300 group-hover:text-indigo-600">
                          <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-[9px] text-slate-400 font-medium">
              Synchronizing with client IndexedDB subsystem.
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
