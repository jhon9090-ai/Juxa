import React, { useState, useEffect } from 'react';
import { X, Search, Trash2, BookOpen, Clock, AlertCircle, HelpCircle } from 'lucide-react';
import { getAllNotebooks, deleteNotebook, EnhancedNotebook } from '../services/db';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';

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
                            "font-bold text-sm tracking-tight truncate",
                            isActive ? "text-indigo-600" : "text-slate-800"
                          )}>
                            {notebook.title}
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

                        <button
                          type="button"
                          onClick={(e) => handleDelete(notebook.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-400 hover:text-red-500 hover:bg-rose-50 rounded-lg transition-all flex-shrink-0"
                          title="Permanently remove note"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
        </>
      )}
    </AnimatePresence>
  );
};
