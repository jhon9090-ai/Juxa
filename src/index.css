import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, BookOpen, Clock, AlertCircle, HelpCircle, Pin, FileDown, Printer, Loader2 } from 'lucide-react';
import { getAllNotebooks, deleteNotebook, saveNotebook, EnhancedNotebook } from '../services/db';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { NoteContentExportRenderer } from './ArticleViewer';

interface LibraryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotebook: (notebook: EnhancedNotebook) => void;
  currentNoteId?: string;
}

export const LibraryDrawer: React.FC<LibraryDrawerProps> = ({
  isOpen,
  onClose,
  onSelectNotebook,
  currentNoteId
}) => {
  const [notebooks, setNotebooks] = useState<EnhancedNotebook[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exportingNote, setExportingNote] = useState<EnhancedNotebook | null>(null);
  const [isPdfExporting, setIsPdfExporting] = useState<string | null>(null);

  const fetchNotebooks = async () => {
    setLoading(true);
    try {
      const data = await getAllNotebooks();
      setNotebooks(data);
    } catch (err: any) {
      setError(err?.message || "Failed to load library items.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotebooks();
    }
  }, [isOpen]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering notebook selection
    if (confirm("Are you sure you want to permanently delete this notebook from your history?")) {
      try {
        await deleteNotebook(id);
        setNotebooks(prev => prev.filter(notebook => notebook.id !== id));
      } catch (err: any) {
        alert(err?.message || "Could not delete the notebook.");
      }
    }
  };

  const handleTogglePin = async (notebook: EnhancedNotebook, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const updated = { ...notebook, pinned: !notebook.pinned };
      await saveNotebook(updated);
      setNotebooks(prev => {
        const mapped = prev.map(nb => nb.id === notebook.id ? updated : nb);
        return mapped.sort((a, b) => {
          const pinA = a.pinned ? 1 : 0;
          const pinB = b.pinned ? 1 : 0;
          if (pinB !== pinA) return pinB - pinA;
          return b.createdAt - a.createdAt;
        });
      });
    } catch (err: any) {
      alert(err?.message || "Failed to toggle pin state");
    }
  };

  const handleSidebarDownloadPdf = async (nb: EnhancedNotebook, e: React.MouseEvent) => {
    e.stopPropagation();
    if (isPdfExporting) return;
    setIsPdfExporting(nb.id);
    setExportingNote(nb);

    try {
      await new Promise(resolve => setTimeout(resolve, 200));

      await new Promise<void>((resolve, reject) => {
        if ((window as any).html2pdf) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Failed to load html2pdf.js library'));
        document.body.appendChild(script);
      });

      const html2pdf = (window as any).html2pdf;
      const element = document.getElementById('juxa-sidebar-printable-article');
      if (!element) return;

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${nb.title?.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'notebook'}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0, scrollX: 0 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
    } catch (err) {
      console.error('Sidebar PDF export failed:', err);
      alert('We were unable to generate the PDF automatically. Try using the Print button next to it instead.');
    } finally {
      setIsPdfExporting(null);
      setExportingNote(null);
    }
  };

  const handleSidebarPrint = async (nb: EnhancedNotebook, e: React.MouseEvent) => {
    e.stopPropagation();
    setExportingNote(nb);
    document.body.classList.add('is-sidebar-printing');

    setTimeout(() => {
      window.print();
      setTimeout(() => {
        document.body.classList.remove('is-sidebar-printing');
        setExportingNote(null);
      }, 500);
    }, 200);
  };

  const getWordCount = (html: string) => {
    const text = html.replace(/<[^>]*>/g, ' ');
    return text.split(/\s+/).filter(Boolean).length;
  };

  // Filter based on search query
  const filteredNotebooks = notebooks.filter(notebook => {
    const query = searchQuery.toLowerCase();
    const titleMatch = notebook.title?.toLowerCase().includes(query);
    const contentMatch = notebook.htmlContent?.toLowerCase().includes(query);
    return titleMatch || contentMatch;
  });

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Invisible background overlay close trigger */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.3 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black z-40"
          />

          {/* Sliding drawer bar */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white border-l border-slate-200/80 shadow-2xl z-50 flex flex-col"
          >
            {/* Drawer Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                  <BookOpen className="w-5 h-5" />
                </div>
                <h3 className="font-extrabold text-slate-800 text-lg">Notebook History</h3>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
                title="Close drawer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sticky Search bar */}
            <div className="p-4 border-b border-slate-100 bg-white">
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Query notebooks, equations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl transition-all outline-none text-sm placeholder-slate-400"
                />
              </div>
            </div>

            {/* Scrollable Notes List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/40">
              {loading && notebooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mb-3"></div>
                  <span className="text-sm font-medium">Checking IndexedDB store...</span>
                </div>
              ) : error ? (
                <div className="p-4 bg-red-50 text-red-700 rounded-xl flex items-start gap-2 text-sm">
                  <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ) : filteredNotebooks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 px-6 text-center text-slate-400">
                  <BookOpen className="w-10 h-10 mb-3 text-slate-300 stroke-[1.5]" />
                  <span className="font-bold text-slate-700 text-sm">No notebooks found</span>
                  <p className="text-xs text-slate-400 max-w-xs mt-1">
                    {searchQuery ? "Try altering search terms or clean filter criteria." : "Parsed results will save directly to offline library storage."}
                  </p>
                </div>
              ) : (
                filteredNotebooks.map((notebook) => {
                  const isActive = notebook.id === currentNoteId;
                  const wordCount = getWordCount(notebook.htmlContent);
                  const parsedDate = new Date(notebook.createdAt).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });

                  return (
                    <div
                      key={notebook.id}
                      onClick={() => onSelectNotebook(notebook)}
                      className={cn(
                        "p-4 rounded-2xl border bg-white cursor-pointer group transition-all duration-200 hover:shadow-md",
                        isActive
                          ? "border-indigo-500 ring-2 ring-indigo-500/10"
                          : "border-slate-200/80 hover:border-slate-300"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <h4 className={cn(
                            "font-bold text-sm tracking-tight truncate flex items-center gap-1.5",
                            isActive ? "text-indigo-600" : "text-slate-800"
                          )}>
                            {notebook.pinned && <Pin className="w-3.5 h-3.5 text-amber-500 fill-current rotate-45 flex-shrink-0" />}
                            <span className="truncate">{notebook.title}</span>
                          </h4>
                          
                          <div className="flex items-center gap-2.5 mt-1.5 text-xs text-slate-400">
                            <span className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{parsedDate}</span>
                            </span>
                            <span>•</span>
                            <span>{wordCount} words</span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-3.5">
                            <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-2 py-0.5 rounded">
                              {notebook.mcqs?.length || 0} Questions
                            </span>
                            {notebook.htmlContent.includes('<svg') && (
                              <span className="text-[10px] bg-indigo-50 text-indigo-600 font-bold px-2 py-0.5 rounded">
                                Vector Demo
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          <button
                            type="button"
                            onClick={(e) => handleSidebarDownloadPdf(notebook, e)}
                            disabled={isPdfExporting === notebook.id}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer disabled:opacity-100"
                            title="Download as PDF"
                          >
                            {isPdfExporting === notebook.id ? (
                              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            ) : (
                              <FileDown className="w-4 h-4" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleSidebarPrint(notebook, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer"
                            title="Print note layout"
                          >
                            <Printer className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleTogglePin(notebook, e)}
                            className={cn(
                              "p-1.5 rounded-lg transition-all cursor-pointer",
                              notebook.pinned
                                ? "opacity-100 text-amber-500 bg-amber-50"
                                : "opacity-0 group-hover:opacity-100 text-slate-400 hover:text-amber-500 hover:bg-amber-50"
                            )}
                            title={notebook.pinned ? "Unpin notebook" : "Pin notebook to top"}
                          >
                            <Pin className="w-4 h-4 fill-current rotate-45" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => handleDelete(notebook.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="Permanently remove note"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick stats footer inside Sidebar */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-400 flex items-center justify-between">
              <span>Saved offline: <span className="font-bold text-slate-600">{notebooks.length}</span> documents</span>
              <span className="flex items-center gap-1">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Supports IndexedDB</span>
              </span>
            </div>
          </motion.div>

          {/* Hidden offscreen container for PDF generation and Sidebar Print */}
          {exportingNote && (
            <div 
              id="juxa-sidebar-printable-article" 
              className="fixed left-[-9999px] top-0 w-[800px] bg-white text-slate-900 p-12 z-[-1] print:left-0 print:top-0 print:w-full print:z-[99999]"
            >
              <div className="mb-8 border-b-2 border-slate-900 pb-4">
                <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-1">Scholastic Juxa Notebook</span>
                <h1 className="text-4xl font-black text-slate-900">{exportingNote.title}</h1>
              </div>
              <NoteContentExportRenderer note={exportingNote} />
            </div>
          )}
        </>
      )}
    </AnimatePresence>
  );
};
