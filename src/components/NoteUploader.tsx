import React, { useState, useRef, DragEvent, useEffect } from 'react';
import { 
  Upload, FileText, Send, Sparkles, File, Trash2, 
  ChevronDown, ChevronUp, AlertCircle, RefreshCw, FileUp,
  Cpu, BookOpen, Clock, Zap, Search, Layers, Compass, ArrowRight
} from 'lucide-react';
import { cn } from '../lib/utils';
import { getAllNotebooks, deleteNotebook, EnhancedNotebook } from '../services/db';

// Helper inside App to load PDF CDN script dynamically to prevent bundler problems
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

  // Fetch recent notebooks for the gorgeous Knowledge Vault section
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

  // Load PDF parser on demand
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
        throw new Error("File extension not supported. Please upload a PDF, TXT or MD note.");
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
Key biochemical milestones:
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

  // Filter vault notebooks
  const filteredVault = recentNotebooks.filter(notebook => {
    if (!searchVaultQuery) return true;
    const query = searchVaultQuery.toLowerCase();
    return notebook.title?.toLowerCase().includes(query) || 
           notebook.htmlContent?.toLowerCase().includes(query);
  });

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 animate-in fade-in duration-500">
      
      {/* Background decoration */}
      <div className="absolute top-10 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[450px] bg-gradient-to-tr from-indigo-500/5 via-violet-500/5 to-pink-500/5 blur-3xl rounded-full -z-10 pointer-events-none" />

      {/* Futuristic Hero Section */}
      <div className="relative text-center mb-12 max-w-3xl mx-auto pt-6">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 text-white text-xs font-bold mb-4 shadow-lg ring-1 ring-slate-800">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
          <span className="uppercase tracking-widest text-[9px] font-mono">Next-Generation Revision Engine</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-800 tracking-tight leading-none mb-3">
          Juxa
        </h1>
        <p className="text-slate-500 text-base md:text-lg max-w-xl mx-auto leading-relaxed">
          Upgrade regular study booklets with animated dark vector coordinate demonstrations, mathematical equations, and active cognitive tests.
        </p>

        {/* Quick Sandboxed Concept Previews */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="text-xs text-slate-400 font-medium mr-1">No notes on hand? Try instant templates:</span>
          <button 
            onClick={() => triggerSample('maxwell')}
            className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-full font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Maxwell's Electromagnetism</span>
          </button>
          <button 
            onClick={() => triggerSample('krebs')}
            className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-cyan-600 hover:border-cyan-400 hover:bg-cyan-50/50 rounded-full font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Layers className="w-3.5 h-3.5" />
            <span>The Krebs Cycle</span>
          </button>
          <button 
            onClick={() => triggerSample('kepler')}
            className="text-xs px-3 py-1.5 bg-white border border-slate-200 text-violet-600 hover:border-violet-400 hover:bg-violet-50/50 rounded-full font-bold transition-all shadow-sm flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Kepler's Astrophysics</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Left Side Input Panel, Right Side Elegant Knowledge Vault */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Drag, drop & parse control card (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden transition-all duration-300">
            
            {/* Header tab */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-100">
                  <Cpu className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-sm">Transform Workspace</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Draft dynamic math and graphics</p>
                </div>
              </div>

              <div className="text-xs bg-indigo-50 text-indigo-700 px-2.5 py-1 rounded-lg font-bold">
                Juxa Core v1
              </div>
            </div>

            {/* Drag Zone */}
            <div className="p-6">
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
                    "border-2 border-dashed rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300",
                    isDragging 
                      ? "border-indigo-500 bg-indigo-50/50 scale-[0.98] shadow-inner" 
                      : "border-slate-200 bg-slate-50/40 hover:bg-slate-50 hover:border-slate-300",
                    extractorLoading && "pointer-events-none opacity-60"
                  )}
                >
                  {extractorLoading ? (
                    <div className="flex flex-col items-center py-6">
                      <div className="relative">
                        <div className="w-14 h-14 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                          <FileUp className="w-5 h-5 text-indigo-500 animate-bounce" />
                        </div>
                      </div>
                      <h4 className="mt-4 font-bold text-slate-800">Reading doc page-by-page...</h4>
                      <p className="text-xs text-slate-400 max-w-sm mt-1">Downloading libraries & compiling structures client-side</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 text-indigo-600 transition-transform hover:scale-110">
                        <Upload className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-base">Upload study notebook</h4>
                      <p className="text-slate-400 text-xs max-w-md mt-1 mb-4">
                        Drag & drop a <span className="font-medium text-slate-600">PDF, TXT, or MD</span> file, or click to choose path.
                      </p>
                      
                      <div className="flex items-center gap-1.5 bg-slate-100 rounded-lg p-1">
                        <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 rounded">PDF</span>
                        <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 rounded">MD</span>
                        <span className="text-[10px] text-slate-500 font-bold px-2 py-0.5 rounded">TXT</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 border border-indigo-100 bg-indigo-50/30 rounded-2xl flex items-center justify-between shadow-sm animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 bg-indigo-600 text-white rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 flex-shrink-0">
                      <File className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-800 text-sm truncate">{extractedFile.name}</h4>
                      <div className="flex items-center gap-1.5 mt-0.5 text-[11px] text-slate-500">
                        <span>{extractedFile.size}</span>
                        <span>•</span>
                        <span className="text-emerald-600 font-bold">Ready</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    type="button" 
                    onClick={clearFile}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    title="Discard uploaded file"
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

            {/* Collapsible Direct Paste Area */}
            <div className="border-t border-slate-100 bg-slate-50/40 px-6 py-4">
              <button
                type="button"
                onClick={() => setShowPastedTextOption(!showPastedTextOption)}
                className="flex items-center justify-between w-full text-slate-500 hover:text-slate-800 transition-colors text-xs font-semibold py-1"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <span>Alternatively paste text notes directly</span>
                </div>
                {showPastedTextOption ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showPastedTextOption && (
                <div className="mt-3 pb-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <textarea
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder="Enter mathematical steps, formulas, chemical cycles, or anatomy steps..."
                    className="w-full h-36 p-4 text-slate-700 bg-white border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-2xl transition-all outline-none resize-none text-xs leading-relaxed"
                    disabled={isLoading}
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-slate-400 font-mono">
                    <span>{pastedText.length} characters</span>
                    <span>Supports unicode equations</span>
                  </div>
                </div>
              )}
            </div>

            {/* Dispatch Row */}
            <div className="px-6 py-5 bg-slate-50/90 border-t border-slate-100 flex items-center justify-end">
              <button
                type="button"
                onClick={triggerProcess}
                disabled={isLoading || !activeContentExists}
                className={cn(
                  "flex items-center gap-2 px-8 py-3.5 bg-indigo-600 text-white font-bold text-sm rounded-xl shadow-lg hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-50 disabled:pointer-events-none disabled:shadow-none",
                  isLoading && "animate-pulse"
                )}
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Modeling graphics...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Generate Juxa Notebook</span>
                  </>
                )}
              </button>
            </div>

          </div>

          {/* Quick Technical features indicators */}
          <div className="p-5 bg-slate-900 text-slate-300 rounded-3xl flex items-center justify-between border border-slate-800 shadow-md">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-500/10 text-indigo-400 rounded-xl">
                <Sparkles className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <span className="block text-xs font-black tracking-wider uppercase text-slate-400">Illustrative engine</span>
                <span className="text-[11px] text-slate-500">Vector rendering outputs custom coordinate coordinates.</span>
              </div>
            </div>
            <span className="text-[10px] bg-slate-800 text-slate-400 font-mono px-2 py-0.5 rounded border border-slate-700">SVG API Active</span>
          </div>
        </div>

        {/* Right Side: Gorgeous Knowledge Vault Section (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden min-h-[480px] flex flex-col">
            
            {/* Vault title */}
            <div className="px-6 py-5 border-b border-slate-100 bg-slate-50/40 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center">
                  <BookOpen className="w-4.5 h-4.5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">Knowledge Vault</h3>
                  <p className="text-[11px] text-slate-400 font-medium">Durable offline database</p>
                </div>
              </div>
              
              <span className="text-xs bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded-full">
                {recentNotebooks.length} notebooks
              </span>
            </div>

            {/* Quick Filter Search inside Knowledge Vault */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Filter vault..."
                  value={searchVaultQuery}
                  onChange={(e) => setSearchVaultQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-150 focus:border-indigo-300 focus:ring-4 focus:ring-indigo-100 rounded-xl transition-all outline-none text-xs placeholder-slate-450"
                />
              </div>
            </div>

            {/* Vault List */}
            <div className="flex-grow overflow-y-auto max-h-[350px] p-4 space-y-3 bg-slate-50/20">
              {recentNotebooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-450">
                  <Layers className="w-8 h-8 text-slate-300 mb-2 stroke-[1.5]" />
                  <span className="font-bold text-slate-700 text-xs">IndexedDB empty</span>
                  <p className="text-[10px] text-slate-400 max-w-xs mt-1">
                    Your generated documents will be captured automatically right here.
                  </p>
                </div>
              ) : filteredVault.length === 0 ? (
                <div className="text-center py-12 text-xs text-slate-450 font-medium">
                  No notebooks matched your query.
                </div>
              ) : (
                filteredVault.map((notebook) => {
                  const words = notebook.htmlContent.replace(/<[^>]*>/g, ' ').split(/\s+/).filter(Boolean).length;
                  const dateStr = new Date(notebook.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit'
                  });

                  return (
                    <div 
                      key={notebook.id}
                      onClick={() => onEnhance(notebook.htmlContent)} // Pre-load or select
                      className="group p-3.5 bg-white border border-slate-200/80 hover:border-violet-300 hover:shadow-sm rounded-xl cursor-pointer transition-all duration-200"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="font-bold text-xs text-slate-800 tracking-tight group-hover:text-indigo-600 truncate">
                            {notebook.title}
                          </h4>
                          <div className="flex items-center gap-2 mt-1.5 text-[10px] text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{dateStr}</span>
                            </span>
                            <span>•</span>
                            <span>{words} words</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <button 
                            type="button"
                            onClick={(e) => handleDeleteNotebook(notebook.id, e)}
                            className="p-1 text-slate-300 hover:text-red-500 hover:bg-rose-50 rounded transition-all opacity-0 group-hover:opacity-100"
                            title="Delete permanently"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <div className="p-1 bg-slate-50 text-slate-400 group-hover:text-indigo-600 rounded">
                            <ArrowRight className="w-3.5 h-3.5 transform group-hover:translate-x-0.5 transition-transform" />
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom quick tip status bar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 font-medium">
              Offline IndexedDB storage ensures no notebook is ever lost.
            </div>

          </div>
        </div>

      </div>

      {/* Elegant Juxa Feature Grid details at base */}
      <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="mb-4">
            <span className="p-3 rounded-xl bg-indigo-50 text-indigo-600 inline-block">
              <Sparkles className="w-5 h-5" />
            </span>
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm mb-1.5">Intelligent Vector Plots</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Constructs detailed SVG models coordinates including orbiting satellites, Krebs respiration blocks, and force vector interactions.
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="mb-4">
            <span className="p-3 rounded-xl bg-violet-50 text-violet-600 inline-block font-mono font-black text-xs">
              f(x)
            </span>
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm mb-1.5">Academic Typography & KaTeX</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Exquisitely aligns integrals, chemical formulations, and differential equations in premium, error-free LaTeX parameters.
          </p>
        </div>

        <div className="p-6 bg-white rounded-2xl border border-slate-150 shadow-sm hover:shadow-md transition-all duration-300">
          <div className="mb-4">
            <span className="p-3 rounded-xl bg-cyan-50 text-cyan-600 inline-block">
              <Compass className="w-5 h-5" />
            </span>
          </div>
          <h3 className="font-extrabold text-slate-800 text-sm mb-1.5">Interactive Assessments</h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            Provides comprehensive diagnostic evaluations with rich instant answer checking, detailed rationales, and performance telemetry.
          </p>
        </div>
      </div>

    </div>
  );
};
