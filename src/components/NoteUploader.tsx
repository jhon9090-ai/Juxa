import React, { useState, useRef, DragEvent, useEffect } from 'react';
import { 
  Upload, FileText, Send, Sparkles, File, Trash2, 
  AlertCircle, RefreshCw, FileUp, Cpu, BookOpen, Clock, Zap, Search, Layers, Compass, ArrowRight
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
  onSelectNotebook?: (notebook: EnhancedNotebook) => void;
}

export const NoteUploader: React.FC<NoteUploaderProps> = ({ onEnhance, isLoading, onSelectNotebook }) => {
  const [pastedText, setPastedText] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [extractedFile, setExtractedFile] = useState<{ name: string; size: string; content: string } | null>(null);
  const [extractorLoading, setExtractorLoading] = useState(false);
  const [extractionError, setExtractionError] = useState<string | null>(null);
  const [recentNotebooks, setRecentNotebooks] = useState<EnhancedNotebook[]>([]);
  const [searchVaultQuery, setSearchVaultQuery] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch recent notebooks for the redesigned Notebook History panel.
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

  const handleDeleteNotebook = async (id: string, e: React.MouseEvent<HTMLElement>) => {
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
    <div className="relative min-h-[calc(100vh-96px)] overflow-hidden px-4 pb-10 pt-6 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_15%,rgba(67,195,215,0.35),transparent_32%),radial-gradient(circle_at_85%_5%,rgba(129,91,222,0.45),transparent_33%),linear-gradient(135deg,#102f3d_0%,#111426_46%,#191338_100%)]" />
      <div className="pointer-events-none absolute left-1/2 top-10 -z-10 h-[540px] w-[540px] -translate-x-1/2 rounded-full bg-slate-900/45 blur-3xl" />

      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">
        <section id="workflow" className="pt-4 lg:pt-10">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/30 bg-cyan-300/10 px-4 py-2 text-xs font-black text-cyan-100 shadow-lg shadow-cyan-950/20 backdrop-blur">
            <Zap className="h-4 w-4 text-cyan-200" />
            <span>Interactive academic revision studio</span>
          </div>

          <h1 className="mt-7 max-w-4xl text-[clamp(3.75rem,10vw,7.8rem)] font-black leading-[0.86] tracking-[-0.08em] text-white drop-shadow-2xl">
            Study complex ideas with diagrams that think with you.
          </h1>

          <p className="mt-7 max-w-2xl text-base font-medium leading-8 text-slate-300 md:text-lg">
            Drop in notes, PDFs, or raw study text and let Juxa shape them into a clean, visual notebook with structured explanations, equations, and checks for understanding.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleTriggerFileInput}
              className="group inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 text-sm font-black text-slate-950 shadow-2xl shadow-cyan-950/30 transition-all hover:-translate-y-0.5 hover:bg-cyan-50"
            >
              <Upload className="h-4 w-4 text-indigo-600 transition-transform group-hover:-translate-y-0.5" />
              Upload notes
            </button>
            <div className="flex flex-wrap gap-2">
              <button onClick={() => triggerSample('maxwell')} className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/15">
                Maxwell
              </button>
              <button onClick={() => triggerSample('krebs')} className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/15">
                Krebs Cycle
              </button>
              <button onClick={() => triggerSample('kepler')} className="rounded-full border border-white/10 bg-white/8 px-4 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-300/40 hover:bg-white/15">
                Kepler
              </button>
            </div>
          </div>
        </section>

        <section id="diagrams" className="space-y-5 xl:pt-28">
          <div className="relative overflow-hidden rounded-[2rem] border border-white/12 bg-[#111a33]/85 p-5 shadow-2xl shadow-black/30 backdrop-blur-xl sm:p-6">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/70 to-transparent" />
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.22em] text-cyan-200">Today's sprint</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight text-white">Quantum Mechanics</h2>
              </div>
              <span className="rounded-full bg-amber-300 px-4 py-2 text-xs font-black text-slate-950">84% ready</span>
            </div>

            <div className="relative mx-auto my-10 flex h-56 max-w-sm items-center justify-center">
              <div className="absolute h-32 w-56 rounded-[50%] border border-cyan-300/30 rotate-[18deg]" />
              <div className="absolute h-32 w-56 rounded-[50%] border border-violet-300/35 -rotate-[18deg]" />
              <div className="absolute h-32 w-56 rounded-[50%] border border-sky-300/30 rotate-[58deg]" />
              <div className="absolute left-8 top-24 h-4 w-4 rounded-full bg-cyan-300 shadow-[0_0_24px_rgba(103,232,249,0.9)]" />
              <div className="absolute right-9 top-14 h-4 w-4 rounded-full bg-amber-300 shadow-[0_0_24px_rgba(252,211,77,0.8)]" />
              <div className="absolute bottom-9 right-20 h-4 w-4 rounded-full bg-violet-400 shadow-[0_0_24px_rgba(167,139,250,0.8)]" />
              <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-cyan-100 text-slate-950 shadow-[0_0_45px_rgba(165,243,252,0.35)]">
                <Sparkles className="h-9 w-9" />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Focus</p>
                <p className="mt-1 text-sm font-black text-white">Wave packets</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Mode</p>
                <p className="mt-1 text-sm font-black text-white">Visual notes</p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/6 p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Output</p>
                <p className="mt-1 text-sm font-black text-white">Notebook</p>
              </div>
            </div>
          </div>
        </section>
      </div>

      <div className="mx-auto mt-8 grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[2rem] border border-white/12 bg-white/[0.08] p-4 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 px-1 pb-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950 shadow-lg shadow-cyan-950/30">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Start a notebook</h2>
                <p className="text-xs font-medium text-slate-400">Upload a file or paste text to generate your study set.</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-300/25 bg-emerald-300/10 px-3 py-1 text-[11px] font-black text-emerald-200">Ready</span>
          </div>

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
                "flex min-h-52 cursor-pointer flex-col items-center justify-center rounded-[1.6rem] border border-dashed p-8 text-center transition-all duration-300",
                isDragging
                  ? "scale-[0.99] border-cyan-200 bg-cyan-300/15 shadow-inner shadow-cyan-950/30"
                  : "border-white/18 bg-slate-950/18 hover:border-cyan-200/55 hover:bg-white/10",
                extractorLoading && "pointer-events-none opacity-60"
              )}
            >
              {extractorLoading ? (
                <div className="flex flex-col items-center py-5">
                  <div className="relative">
                    <div className="h-14 w-14 animate-spin rounded-full border-4 border-cyan-100/15 border-t-cyan-200" />
                    <FileUp className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-cyan-100" />
                  </div>
                  <h3 className="mt-4 text-base font-black text-white">Reading doc page-by-page...</h3>
                  <p className="mt-1 text-xs text-slate-400">Extracting the structure locally in your browser.</p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-white text-indigo-600 shadow-xl shadow-black/20">
                    <Upload className="h-7 w-7" />
                  </div>
                  <h3 className="text-lg font-black text-white">Drop your study notebook here</h3>
                  <p className="mt-2 max-w-md text-sm leading-6 text-slate-400">
                    Supports PDF, Markdown, and TXT. Click anywhere in this panel to choose a file.
                  </p>
                  <div className="mt-5 flex items-center gap-2 rounded-full border border-white/10 bg-white/8 p-1 text-[10px] font-black text-slate-300">
                    <span className="rounded-full bg-white/10 px-3 py-1">PDF</span>
                    <span className="rounded-full bg-white/10 px-3 py-1">MD</span>
                    <span className="rounded-full bg-white/10 px-3 py-1">TXT</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-cyan-200/25 bg-cyan-200/10 p-4 shadow-lg shadow-black/10">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950">
                    <File className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-black text-white">{extractedFile.name}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">{extractedFile.size} • <span className="text-emerald-200">Ready to generate</span></p>
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={clearFile}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-red-400/10 hover:text-red-200"
                  title="Discard uploaded file"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {extractionError && (
            <div className="mt-3 flex items-start gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{extractionError}</span>
            </div>
          )}

          <div className="mt-4 rounded-[1.6rem] border border-white/10 bg-slate-950/20 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.16em] text-slate-400">
              <FileText className="h-4 w-4" />
              Paste notes instead
            </div>
            <textarea
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              placeholder="Paste formulas, chapter notes, lab steps, or exam-review text..."
              className="h-32 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-relaxed text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-200/50 focus:ring-4 focus:ring-cyan-200/10"
              disabled={isLoading}
            />
            <div className="mt-2 flex justify-between text-[10px] font-mono text-slate-500">
              <span>{pastedText.length} characters</span>
              <span>Unicode equations supported</span>
            </div>
          </div>

          <div className="mt-5 flex justify-end">
            <button
              type="button"
              onClick={triggerProcess}
              disabled={isLoading || !activeContentExists}
              className={cn(
                "inline-flex items-center gap-2 rounded-full bg-cyan-200 px-7 py-3 text-sm font-black text-slate-950 shadow-xl shadow-cyan-950/30 transition-all hover:-translate-y-0.5 hover:bg-white disabled:pointer-events-none disabled:opacity-45 disabled:shadow-none",
                isLoading && "animate-pulse"
              )}
            >
              {isLoading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Building...</span>
                </>
              ) : (
                <>
                  <Send className="h-4 w-4" />
                  <span>Generate Juxa Notebook</span>
                </>
              )}
            </button>
          </div>
        </section>

        <section id="history" className="overflow-hidden rounded-[2rem] border border-white/12 bg-slate-950/35 shadow-2xl shadow-black/20 backdrop-blur-xl">
          <div className="border-b border-white/10 bg-white/[0.06] p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-300 text-slate-950">
                  <BookOpen className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-black text-white">Notebook History</h2>
                  <p className="text-xs font-medium text-slate-400">Recently generated notebooks</p>
                </div>
              </div>
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1 text-xs font-black text-slate-200">{recentNotebooks.length}</span>
            </div>

            <div className="relative mt-4">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                placeholder="Search notebook history..."
                value={searchVaultQuery}
                onChange={(e) => setSearchVaultQuery(e.target.value)}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/30 py-3 pl-11 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-200/45 focus:ring-4 focus:ring-violet-200/10"
              />
            </div>
          </div>

          <div className="max-h-[520px] space-y-3 overflow-y-auto p-4">
            {recentNotebooks.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.04] px-6 py-16 text-center">
                <Layers className="mb-3 h-9 w-9 text-slate-500" />
                <h3 className="text-sm font-black text-white">No notebooks yet</h3>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">
                  Generated notebooks will appear here automatically with a clean local history.
                </p>
              </div>
            ) : filteredVault.length === 0 ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] py-12 text-center text-sm font-bold text-slate-400">
                No notebooks matched your search.
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
                    role="button"
                    tabIndex={0}
                    onClick={() => onSelectNotebook?.(notebook)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        onSelectNotebook?.(notebook);
                      }
                    }}
                    className="group w-full cursor-pointer rounded-[1.35rem] border border-white/10 bg-white/[0.06] p-4 text-left transition-all hover:-translate-y-0.5 hover:border-cyan-200/35 hover:bg-white/[0.1] hover:shadow-lg hover:shadow-black/20"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black tracking-tight text-white group-hover:text-cyan-100">
                          {notebook.title}
                        </h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>{dateStr}</span>
                          </span>
                          <span>•</span>
                          <span>{words} words</span>
                        </div>
                      </div>

                      <div className="flex flex-shrink-0 items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotebook(notebook.id, e)}
                          className="rounded-xl p-2 text-slate-500 opacity-0 transition hover:bg-red-400/10 hover:text-red-200 group-hover:opacity-100"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <span className="rounded-xl bg-white/8 p-2 text-slate-400 transition group-hover:bg-cyan-200 group-hover:text-slate-950">
                          <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};
