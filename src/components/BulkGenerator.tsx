import React, { useState, useRef } from "react";
import { 
  X, Upload, Sparkles, FileText, ChevronRight, Clipboard, 
  CheckCircle, Loader2, AlertCircle, ChevronDown, ChevronUp, FileUp
} from "lucide-react";
import { splitOutlineForUnits, enhanceNote } from "../services/geminiService";
import { saveNotebook } from "../services/db";
import { Unit } from "../data/syllabus";
import { motion, AnimatePresence } from "motion/react";

interface BulkGeneratorProps {
  subjectName: string;
  themeName: string;
  units: Unit[];
  onClose: () => void;
  onComplete: () => Promise<void>;
}

export function BulkGenerator({ 
  subjectName, 
  themeName, 
  units, 
  onClose, 
  onComplete 
}: BulkGeneratorProps) {
  // Staging state
  const [step, setStep] = useState<"input" | "review" | "generating" | "complete">("input");
  
  // Input stage state
  const [outlineText, setOutlineText] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [fileLoading, setFileLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Review stage state
  const [segmentedMap, setSegmentedMap] = useState<Record<string, string>>({});
  const [expandedUnitId, setExpandedUnitId] = useState<string | null>(null);
  
  // Generating stage state
  const [unitStates, setUnitStates] = useState<Record<string, "idle" | "generating" | "completed" | "error">>({});
  const [activeGeneratingUnit, setActiveGeneratingUnit] = useState<string | null>(null);
  const [currentProgressIndex, setCurrentProgressIndex] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load PDFJS library from CDN dynamically
  const loadPdfJS = async (): Promise<any> => {
    if ((window as any).pdfjsLib) {
      return (window as any).pdfjsLib;
    }
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js";
      script.onload = () => {
        const pdfjsLib = (window as any).pdfjsLib;
        // Point to worker
        pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js";
        resolve(pdfjsLib);
      };
      script.onerror = () => {
        reject(new Error("Unable to build cloud PDF.js pipeline from CDN."));
      };
      document.head.appendChild(script);
    });
  };

  // Process selected file
  const handleFileProcess = async (file: File) => {
    setFileLoading(true);
    setErrorMessage(null);
    try {
      const extension = file.name.split(".").pop()?.toLowerCase();
      
      if (extension === "txt" || extension === "md") {
        const reader = new FileReader();
        reader.onload = (e) => {
          const text = e.target?.result as string;
          setOutlineText((prev) => (prev ? prev + "\n\n" + text : text));
          setFileLoading(false);
        };
        reader.onerror = () => {
          throw new Error("Unable to read selected text file.");
        };
        reader.readAsText(file);
      } else if (extension === "pdf") {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await loadPdfJS();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        
        let extractedText = "";
        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum);
          const textContent = await page.getTextContent();
          const pageText = textContent.items
            .map((item: any) => item.str)
            .join(" ");
          extractedText += `[Page ${pageNum}]\n${pageText}\n\n`;
        }
        
        setOutlineText((prev) => (prev ? prev + "\n\n" + extractedText : extractedText));
        setFileLoading(false);
      } else {
        throw new Error("Invalid file type. Please upload a .txt, .md, or .pdf file.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err.message || "An unexpected error occurred reading the document.");
      setFileLoading(false);
    }
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      await handleFileProcess(files[0]);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      await handleFileProcess(files[0]);
    }
  };

  // Analyse and group multi outlines
  const handleAnalyzeSyllabus = async () => {
    if (!outlineText.trim()) {
      setErrorMessage("Please input curriculum text, copy-paste curriculum standards, or attach high-school syllabi file first.");
      return;
    }
    
    setFileLoading(true);
    setErrorMessage(null);
    try {
      const unitsMap = units.map(u => ({ id: u.id, name: u.name }));
      const result = await splitOutlineForUnits(outlineText, unitsMap, themeName);
      
      // Merge keys to ensure every unit has some representation
      const completeMap: Record<string, string> = {};
      units.forEach((unit) => {
        completeMap[unit.id] = result[unit.id] || result[unit.name] || `Curriculum standards for unit: ${unit.name}`;
      });
      
      setSegmentedMap(completeMap);
      setStep("review");
    } catch (err: any) {
      setErrorMessage(err.message || "Gemini was unable to partition the uploaded document outline. Please review API configuration or retry.");
    } finally {
      setFileLoading(false);
    }
  };

  // Launch sequential recursive generation
  const handleLaunchExecution = async () => {
    setStep("generating");
    
    // Initialise unit states
    const initialStates: Record<string, "idle" | "generating" | "completed" | "error"> = {};
    units.forEach(u => {
      initialStates[u.id] = "idle";
    });
    setUnitStates(initialStates);

    for (let i = 0; i < units.length; i++) {
      const unit = units[i];
      setCurrentProgressIndex(i);
      setActiveGeneratingUnit(unit.id);
      setUnitStates(prev => ({ ...prev, [unit.id]: "generating" }));

      try {
        const rawOutline = segmentedMap[unit.id] || `Comprehensive syllabus details for ${unit.name}`;
        
        // Context information
        const unitContext = {
          subjectName,
          themeName,
          unitName: unit.name
        };

        // Call individual generation helper
        const result = await enhanceNote(rawOutline, unitContext);

        // Save local notebook Link
        await saveNotebook({
          ...result,
          unitId: unit.id
        });

        setUnitStates(prev => ({ ...prev, [unit.id]: "completed" }));
      } catch (err) {
        console.error(`Failed executing note generation for unit ${unit.name}:`, err);
        setUnitStates(prev => ({ ...prev, [unit.id]: "error" }));
      }
    }

    setActiveGeneratingUnit(null);
    setStep("complete");
    await onComplete();
  };

  // Counting metrics
  const completedCount = Object.values(unitStates).filter(s => s === "completed").length;
  const errorCount = Object.values(unitStates).filter(s => s === "error").length;
  const progressPercentage = units.length > 0 ? Math.round((completedCount / units.length) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 10, scale: 0.95 }}
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden"
      >
        {/* Modal Header */}
        <div className="border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between bg-slate-50/50 dark:bg-slate-950/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-650 dark:text-indigo-400 rounded-2xl flex items-center justify-center shadow-inner">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono">Bulk Juxa Engine</span>
              <h2 className="text-xl font-black text-slate-850 dark:text-slate-100 tracking-tight leading-none mt-0.5">
                All-in-One Generator • {themeName}
              </h2>
            </div>
          </div>
          {step !== "generating" && (
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Modal Container Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {errorMessage && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-800/50 text-rose-700 dark:text-rose-300 rounded-2xl flex items-start gap-3 text-sm font-semibold">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{errorMessage}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* STAGE 1: INPUT AND FILE ATTACHMENTS */}
            {step === "input" && (
              <motion.div 
                key="step-input"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="bg-gradient-to-r from-indigo-500/10 to-pink-500/10 dark:from-indigo-500/5 dark:to-pink-500/5 p-5 border border-indigo-100/50 dark:border-indigo-950/20 rounded-3xl">
                  <h3 className="text-sm font-extrabold text-indigo-950 dark:text-indigo-200 flex items-center gap-1.5 font-mono uppercase tracking-wider">
                    <Clipboard className="w-4 h-4" /> Academic Specifications
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-2">
                    Generate the course textbook chapters for all <strong>{units.length} units</strong> under {themeName} simultaneously. Simply copy-paste course curriculum guidelines, syllabus outlines, raw text notes, or attach a syllabus index file (.txt, .md, .pdf) containing detailed unit chapters below.
                  </p>
                </div>

                {/* Drag-and-drop zone / Upload */}
                <div 
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all ${
                    isDragging 
                      ? "border-indigo-500 bg-indigo-50/40 dark:bg-indigo-950/15" 
                      : "border-slate-200 dark:border-slate-800 hover:border-slate-450 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-950/10"
                  }`}
                >
                  <input 
                    type="file" 
                    ref={fileInputRef}
                    onChange={handleFileInputChange}
                    accept=".txt,.md,.pdf"
                    className="hidden" 
                  />
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-350 mb-3 group-hover:scale-105 transition-transform">
                    <FileUp className="w-6 h-6" />
                  </div>
                  <h4 className="text-base font-bold text-slate-750 dark:text-slate-200">
                    Drag & Drop academic document file here
                  </h4>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">
                    Accepts text files (.txt), Markdown (.md), or Portable Document formats (.pdf)
                  </p>
                  <button 
                    type="button"
                    className="mt-4 px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:border-indigo-400 text-xs font-bold font-mono text-slate-600 dark:text-slate-350 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl shadow-sm hover:shadow transition-all"
                  >
                    Select Local File
                  </button>
                </div>

                {/* Direct Text Input */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-450 dark:text-slate-500 uppercase tracking-widest font-mono">
                    Direct Syllabus Outline or Reference Content Text
                  </label>
                  <textarea
                    value={outlineText}
                    onChange={(e) => setOutlineText(e.target.value)}
                    placeholder="Provide outlines, lesson index lists, chapter syllabus metrics, or paste notes for all the units of this topic here..."
                    className="w-full h-44 px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm placeholder-slate-400 text-slate-700 dark:text-slate-300 font-sans"
                  />
                </div>
              </motion.div>
            )}

            {/* STAGE 2: PREVIEW SEGMENTED OUTLINES BEFORE GENERATION */}
            {step === "review" && (
              <motion.div 
                key="step-review"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                <div className="bg-emerald-50 dark:bg-emerald-950/15 p-4 border border-emerald-150 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-800 dark:text-emerald-300 font-semibold font-sans">
                  <CheckCircle className="w-5 h-5 text-emerald-600" />
                  <span>Juxa Curriculum Analyzer successfully linked and segmented syllabus content for all {units.length} units! Review outline segments below.</span>
                </div>

                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-950/20 p-4 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-hidden max-h-[460px] overflow-y-auto">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-2">Mapped Outlines per Unit</h4>
                  {units.map((unit) => {
                    const isExpanded = expandedUnitId === unit.id;
                    const contentSnippet = segmentedMap[unit.id] || "";
                    
                    return (
                      <div 
                        key={unit.id}
                        className="bg-white dark:bg-slate-900 border border-slate-150 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm"
                      >
                        <div 
                          onClick={() => setExpandedUnitId(isExpanded ? null : unit.id)}
                          className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-850"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded">
                              {unit.grade || "CORE"}
                            </span>
                            <h5 className="text-sm font-extrabold text-slate-800 dark:text-slate-200 leading-none">
                              {unit.name}
                            </h5>
                          </div>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                        </div>

                        <AnimatePresence>
                          {isExpanded && (
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: "auto" }}
                              exit={{ height: 0 }}
                              className="overflow-hidden border-t border-slate-100 dark:border-slate-800"
                            >
                              <div className="p-4 bg-slate-50/20 dark:bg-slate-950/5">
                                <textarea
                                  value={contentSnippet}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setSegmentedMap(prev => ({ ...prev, [unit.id]: val }));
                                  }}
                                  className="w-full h-32 px-3 py-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-650 dark:text-slate-400 font-sans focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded-xl leading-relaxed"
                                />
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* STAGE 3 & 4: EXECUTION PROGRESS SCREEN */}
            {(step === "generating" || step === "complete") && (
              <motion.div 
                key="step-execution"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Generation Summary bar */}
                <div className="bg-slate-50 dark:bg-slate-950/30 border border-slate-150 dark:border-slate-800 rounded-3xl p-6 shadow-inner flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest font-mono mb-1">
                      {step === "generating" ? "Active Generation Pipeline" : "Generation Completed Successfully"}
                    </div>
                    <h3 className="text-2xl font-black text-indigo-950 dark:text-indigo-300 leading-none">
                      {completedCount} / {units.length} Units Synthesized
                    </h3>
                    {errorCount > 0 && (
                      <p className="text-xs text-rose-500 font-semibold mt-1">
                        ⚠️ High load error encountered on {errorCount} units.
                      </p>
                    )}
                  </div>

                  {/* Circular progress equivalent or bar */}
                  <div className="w-full md:w-48 bg-slate-150 dark:bg-slate-800 h-3 rounded-full overflow-hidden relative">
                    <motion.div 
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-indigo-500 to-pink-500 rounded-full"
                      animate={{ width: `${progressPercentage}%` }}
                      transition={{ duration: 0.3 }}
                    />
                  </div>
                </div>

                {/* Progression steps listings */}
                <div className="bg-white dark:bg-slate-950 rounded-2.5xl border border-slate-150 dark:border-slate-850 p-4 max-h-[340px] overflow-y-auto space-y-2">
                  {units.map((unit, idx) => {
                    const status = unitStates[unit.id] || "idle";
                    const isGenerating = activeGeneratingUnit === unit.id;
                    
                    return (
                      <div 
                        key={unit.id}
                        className={`px-4 py-3 rounded-xl border flex items-center justify-between transition-all ${
                          isGenerating 
                            ? "bg-indigo-50/40 dark:bg-indigo-950/15 border-indigo-200 dark:border-indigo-800 shadow-sm" 
                            : status === "completed" 
                              ? "bg-slate-50/30 dark:bg-slate-950/5 border-slate-100 dark:border-slate-900 opacity-80" 
                              : "bg-white dark:bg-slate-900 border-slate-150 dark:border-slate-800"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-[10px] font-mono font-bold text-slate-400">
                            {String(idx + 1).padStart(2, "0")}
                          </span>
                          <div>
                            <h5 className="text-sm font-bold text-slate-850 dark:text-slate-200">
                              {unit.name}
                            </h5>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {status === "idle" && (
                            <span className="text-xs text-slate-400 font-medium font-mono">
                              Waiting
                            </span>
                          )}
                          {status === "generating" && (
                            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-bold font-mono flex items-center gap-1">
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              <span>Drafting Notes...</span>
                            </span>
                          )}
                          {status === "completed" && (
                            <span className="text-xs text-emerald-600 font-bold font-mono flex items-center gap-1.5">
                              <CheckCircle className="w-4 h-4" />
                              <span>Saved Locally</span>
                            </span>
                          )}
                          {status === "error" && (
                            <span className="text-xs text-rose-500 font-bold font-mono flex items-center gap-1">
                              <AlertCircle className="w-4 h-4" />
                              <span>Failed</span>
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Modal Actions Footer */}
        <div className="border-t border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-end gap-3 bg-slate-50/50 dark:bg-slate-950/20">
          {step === "input" && (
            <>
              <button 
                type="button" 
                onClick={onClose}
                disabled={fileLoading}
                className="px-5 py-2.5 text-xs font-extrabold font-mono text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                type="button"
                onClick={handleAnalyzeSyllabus}
                disabled={fileLoading || !outlineText.trim()}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs font-mono uppercase tracking-wider rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.01] transition-all cursor-pointer flex items-center gap-2 disabled:opacity-50"
              >
                {fileLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Segment Syllabus</span>
                  </>
                )}
              </button>
            </>
          )}

          {step === "review" && (
            <>
              <button 
                type="button" 
                onClick={() => setStep("input")}
                className="px-5 py-2.5 text-xs font-extrabold font-mono text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-2xl cursor-pointer"
              >
                Go Back
              </button>
              <button 
                type="button"
                onClick={handleLaunchExecution}
                className="px-6 py-2.5 bg-indigo-650 hover:bg-indigo-700 text-white font-black text-xs font-mono uppercase tracking-wider rounded-2xl shadow-md hover:shadow-lg hover:scale-[1.02] transition-colors flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                <span>Launch Generation ({units.length} Units)</span>
              </button>
            </>
          )}

          {step === "complete" && (
            <button 
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs font-mono uppercase tracking-wider rounded-2xl shadow hover:shadow-md hover:scale-[1.01] transition-all cursor-pointer"
            >
              Enter Theme Study Vault
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
