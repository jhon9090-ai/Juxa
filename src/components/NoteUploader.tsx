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
    <div className="relative px-4 pb-12 pt-6 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.18),transparent_34%),radial-gradient(circle_at_top_right,rgba(124,58,237,0.18),transparent_32%)]" />

      <section className="mx-auto max-w-4xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-xs font-bold text-cyan-100 shadow-sm backdrop-blur">
          <Zap className="h-3.5 w-3.5 text-cyan-200" />
          <span>Interactive academic revision studio</span>
        </div>

        <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-black leading-tight tracking-[-0.04em] text-white sm:text-5xl lg:text-6xl">
          Turn notes into clear study notebooks.
        </h1>

        <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-300 sm:text-base">
          Upload a file or paste text. Juxa keeps the experience focused: structured explanations, clean visuals, equations, and quick checks in one generated notebook.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          <span className="mr-1 text-xs font-semibold text-slate-500">Try a sample:</span>
          <button type="button" onClick={() => triggerSample('maxwell')} className="rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-200/40 hover:bg-white/[0.1]">
            Maxwell
          </button>
          <button type="button" onClick={() => triggerSample('krebs')} className="rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-200/40 hover:bg-white/[0.1]">
            Krebs Cycle
          </button>
          <button type="button" onClick={() => triggerSample('kepler')} className="rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-xs font-bold text-slate-200 transition hover:border-cyan-200/40 hover:bg-white/[0.1]">
            Kepler
          </button>
        </div>
      </section>

      <div className="mx-auto mt-10 grid max-w-6xl grid-cols-1 gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <section id="upload" className="rounded-[2rem] border border-white/10 bg-white/[0.07] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950 shadow-lg shadow-cyan-950/20">
                <Upload className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">Upload or paste notes</h2>
                <p className="mt-1 text-xs font-medium text-slate-400">PDF, Markdown, TXT, or plain text.</p>
              </div>
            </div>
            <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-[11px] font-black text-emerald-200">Ready</span>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".pdf,.txt,.md"
            className="hidden"
          />

          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            {!extractedFile ? (
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={handleTriggerFileInput}
                className={cn(
                  "flex min-h-64 cursor-pointer flex-col items-center justify-center rounded-[1.5rem] border border-dashed p-6 text-center transition-all",
                  isDragging
                    ? "scale-[0.99] border-cyan-200 bg-cyan-200/10"
                    : "border-white/15 bg-slate-950/20 hover:border-cyan-200/40 hover:bg-white/[0.06]",
                  extractorLoading && "pointer-events-none opacity-60"
                )}
              >
                {extractorLoading ? (
                  <div className="flex flex-col items-center">
                    <div className="relative">
                      <div className="h-14 w-14 animate-spin rounded-full border-4 border-cyan-100/10 border-t-cyan-200" />
                      <FileUp className="absolute left-1/2 top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 text-cyan-100" />
                    </div>
                    <h3 className="mt-4 text-sm font-black text-white">Reading your document...</h3>
                    <p className="mt-1 text-xs text-slate-500">Extracting text locally.</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-lg shadow-black/20">
                      <Upload className="h-6 w-6" />
                    </div>
                    <h3 className="text-base font-black text-white">Drop a file here</h3>
                    <p className="mt-2 max-w-xs text-xs leading-5 text-slate-400">Click to browse or drag in a PDF, MD, or TXT note.</p>
                    <div className="mt-4 flex gap-2 text-[10px] font-black text-slate-300">
                      <span className="rounded-full bg-white/10 px-3 py-1">PDF</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">MD</span>
                      <span className="rounded-full bg-white/10 px-3 py-1">TXT</span>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex min-h-64 flex-col justify-between rounded-[1.5rem] border border-cyan-200/20 bg-cyan-200/10 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-cyan-200 text-slate-950">
                      <File className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="truncate text-sm font-black text-white">{extractedFile.name}</h3>
                      <p className="mt-1 text-xs text-slate-400">{extractedFile.size} • <span className="text-emerald-200">Ready</span></p>
                    </div>
                  </div>
                  <button type="button" onClick={clearFile} className="rounded-xl p-2 text-slate-400 transition hover:bg-red-400/10 hover:text-red-200" title="Discard uploaded file">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs leading-5 text-slate-400">Your file is loaded. Generate the notebook below or replace the file.</p>
              </div>
            )}

            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/20 p-4">
              <div className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-slate-400">
                <FileText className="h-4 w-4" />
                Paste text
              </div>
              <textarea
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                placeholder="Paste formulas, chapter notes, lab steps, or exam review text..."
                className="h-44 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.06] p-4 text-sm leading-relaxed text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-cyan-200/45 focus:ring-4 focus:ring-cyan-200/10"
                disabled={isLoading}
              />
              <div className="mt-2 flex justify-between text-[10px] font-mono text-slate-500">
                <span>{pastedText.length} characters</span>
                <span>Equations supported</span>
              </div>
            </div>
          </div>

          {extractionError && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-300/20 bg-rose-300/10 p-4 text-sm text-rose-100">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>{extractionError}</span>
            </div>
          )}

          <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-slate-500">Your notebook history is saved locally in this browser.</p>
            <button
              type="button"
              onClick={triggerProcess}
              disabled={isLoading || !activeContentExists}
              className={cn(
                "inline-flex items-center gap-2 rounded-full bg-cyan-200 px-6 py-3 text-sm font-black text-slate-950 shadow-xl shadow-cyan-950/25 transition hover:bg-white disabled:pointer-events-none disabled:opacity-40 disabled:shadow-none",
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
                  <span>Generate notebook</span>
                </>
              )}
            </button>
          </div>
        </section>

        <section id="history" className="rounded-[2rem] border border-white/10 bg-slate-950/30 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-200 text-slate-950">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-black tracking-tight text-white">Notebook History</h2>
                <p className="mt-1 text-xs font-medium text-slate-400">Clean, searchable, local.</p>
              </div>
            </div>
            <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-xs font-black text-slate-200">{recentNotebooks.length}</span>
          </div>

          <div className="relative mt-5">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search history..."
              value={searchVaultQuery}
              onChange={(e) => setSearchVaultQuery(e.target.value)}
              className="w-full rounded-2xl border border-white/10 bg-white/[0.05] py-3 pl-11 pr-4 text-sm text-slate-100 outline-none transition placeholder:text-slate-500 focus:border-violet-200/45 focus:ring-4 focus:ring-violet-200/10"
            />
          </div>

          <div className="mt-4 max-h-[430px] space-y-3 overflow-y-auto pr-1">
            {recentNotebooks.length === 0 ? (
              <div className="flex min-h-64 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-white/12 bg-white/[0.04] px-6 py-10 text-center">
                <Layers className="mb-3 h-8 w-8 text-slate-500" />
                <h3 className="text-sm font-black text-white">No notebooks yet</h3>
                <p className="mt-2 max-w-xs text-xs leading-5 text-slate-500">Generated notebooks will appear here automatically.</p>
              </div>
            ) : filteredVault.length === 0 ? (
              <div className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] py-10 text-center text-sm font-bold text-slate-400">
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
                    className="group cursor-pointer rounded-2xl border border-white/10 bg-white/[0.05] p-4 transition hover:border-cyan-200/30 hover:bg-white/[0.08]"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-black text-white">{notebook.title}</h3>
                        <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] font-medium text-slate-500">
                          <span className="inline-flex items-center gap-1 text-slate-400">
                            <Clock className="h-3 w-3" />
                            <span>{dateStr}</span>
                          </span>
                          <span>•</span>
                          <span>{words} words</span>
                        </div>
                      </div>
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <button
                          type="button"
                          onClick={(e) => handleDeleteNotebook(notebook.id, e)}
                          className="rounded-xl p-2 text-slate-500 transition hover:bg-red-400/10 hover:text-red-200"
                          title="Delete permanently"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <span className="rounded-xl p-2 text-slate-500 transition group-hover:text-cyan-200">
                          <ArrowRight className="h-4 w-4" />
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
