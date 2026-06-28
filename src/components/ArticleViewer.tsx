import React, { useState, useEffect, useMemo } from 'react';
import { HTMLReactParserOptions, Element } from 'html-react-parser';
import parse from 'html-react-parser';
import katex from 'katex';
import { SafeMath } from './SafeMath';
import { MCQComponent } from './MCQComponent';
import { EnhancedNote, generateExamQuestions, MCQ, generateBespokeExamSections, BespokeSection, fixAllLaTeXInDocument, healDocumentFormulaWithAI, fixLaTeXEquation, continueNote } from '../services/geminiService';
import { saveNotebook, EnhancedNotebook } from '../services/db';
import { SYLLABUS } from '../data/syllabus';
import { NoteViewerErrorBoundary } from './NoteViewerErrorBoundary';
import { 
  Printer, FileDown, RefreshCw, GraduationCap, Award, 
  ChevronRight, ArrowLeft, Brain, Check, X, CheckSquare, 
  Play, BookOpen, AlertCircle, HelpCircle, Trophy, BarChart2,
  ChevronLeft, FastForward, Clock, Sparkles
} from 'lucide-react';

function getHeaderSectionsFromHtml(html: string, fallbackTitle: string): BespokeSection[] {
  // Extract content of <h2 ...>Something</h2>
  const h2Regex = /<h2[^>]*>(.*?)<\/h2>/gi;
  const headings: string[] = [];
  let match;
  while ((match = h2Regex.exec(html)) !== null) {
    const cleanHeading = match[1].replace(/<[^>]*>/g, "").trim();
    if (cleanHeading) {
      headings.push(cleanHeading);
    }
  }
  
  if (headings.length === 0) {
    // If no h2, try h3
    const h3Regex = /<h3[^>]*>(.*?)<\/h3>/gi;
    let matchH3;
    while ((matchH3 = h3Regex.exec(html)) !== null) {
      const cleanHeading = matchH3[1].replace(/<[^>]*>/g, "").trim();
      if (cleanHeading && !headings.includes(cleanHeading)) {
        headings.push(cleanHeading);
      }
    }
  }

  const staticDefault = [
    { num: 1, title: "Qualitative Foundations & Core Frameworks" },
    { num: 2, title: "Mathematical Bounds & Analytical Proofs" },
    { num: 3, title: "Quantitative Problem-Solving & Dimensionality" },
    { num: 4, title: "First-Principles Logic & Edge Axioms" },
    { num: 5, title: "Systemic Interaction & Kinetic Modeling" },
    { num: 6, title: "Logical Fallacies & Misconception Sieve" },
    { num: 7, title: "Integrated Synthesis & Case Investigations" },
    { num: 8, title: "Algorithmic Rigor & Boundary Restraints" },
    { num: 9, title: "Multi-Disciplinary Core Extensions" },
    { num: 10, title: "Grandmaster Comprehensive Retrospective" }
  ];

  if (headings.length === 0) {
    return staticDefault.map(item => ({
      num: item.num,
      title: item.title,
      desc: `Rigorous milestone questions authoring mathematical complexity testing on ${fallbackTitle}.`
    }));
  }
  
  const sections: BespokeSection[] = [];
  for (let i = 1; i <= 10; i++) {
    // Distribute map onto headings
    const headingIndex = Math.floor(((i - 1) / 10) * headings.length);
    const heading = headings[headingIndex];
    
    let title = heading;
    let desc = `Syllabus milestone questions testing deep analytical mechanics of "${heading}".`;
    
    const occurrencesCount = sections.filter(s => s.title.startsWith(heading)).length;
    if (occurrencesCount > 0) {
      const partNum = occurrencesCount + 1;
      title = `${heading} (Advanced Phase ${partNum})`;
      desc = `Advanced Part ${partNum} targeting rigorous logical deductions and formulas of "${heading}".`;
    } else {
      title = `${heading}`;
      desc = `Mastery milestone evaluating central principles of "${heading}".`;
    }
    
    sections.push({ num: i, title, desc });
  }
  
  return sections;
}

function isNoteIncomplete(htmlContent: string): boolean {
  if (!htmlContent) return false;
  const trimmed = htmlContent.trim();
  
  // 1. Ends with alphabet letters, numbers, spaces, commas, hyphens or unclosed bracket symbols (not punctuation like .?! or closing tag >)
  const matchesAbruptEnd = /[A-Za-z0-9,\-\(\s]$/.test(trimmed);
  
  // 2. Ends inside an HTML tag structure
  const matchesUnclosedTag = /<[a-zA-Z0-9\-\s"=':]+$/.test(trimmed);
  
  // 3. Unbalanced open elements, but only if they are significantly unbalanced at the end, typical of truncated outputs
  const hasMultipleOpenDivs = (trimmed.match(/<div/gi) || []).length > (trimmed.match(/<\/div/gi) || []).length;
  const hasMultipleOpenParagraphs = (trimmed.match(/<p/gi) || []).length > (trimmed.match(/<\/p/gi) || []).length;
  
  return matchesAbruptEnd || matchesUnclosedTag || hasMultipleOpenDivs || hasMultipleOpenParagraphs;
}

interface ArticleViewerProps {
  note: EnhancedNotebook;
  onUpdateNote?: (note: EnhancedNotebook) => void;
}

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ note, onUpdateNote }) => {
  const [exporting, setExporting] = useState(false);
  
  // 100 MCQ Exam States
  const [isExamMode, setIsExamMode] = useState(false);
  const [activeSection, setActiveSection] = useState<number | null>(null);
  const [sectionQuestions, setSectionQuestions] = useState<{ [key: number]: MCQ[] }>({});
  const [sectionScores, setSectionScores] = useState<{ [key: number]: { correct: number, completed: boolean } }>({});
  const [answers, setAnswers] = useState<{ [key: number]: { [key: number]: { selectedIndex: number, isChecked: boolean, isCorrect: boolean } } }>({});
  const [loadingSection, setLoadingSection] = useState<number | null>(null);
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Bespoke Sections state
  const [examSections, setExamSections] = useState<BespokeSection[]>([]);
  const [isGeneratingBespoke, setIsGeneratingBespoke] = useState(false);
  const [customRoadmapSuccess, setCustomRoadmapSuccess] = useState<string | null>(null);

  // Batch Generator States
  const [isBatchGenerating, setIsBatchGenerating] = useState(false);
  const [batchProgress, setBatchProgress] = useState(0);
  const [batchStatusText, setBatchStatusText] = useState("");

  // Editor and folding states
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(note.title);
  const [editContent, setEditContent] = useState(note.htmlContent);
  const [isFolded, setIsFolded] = useState(false);
  const [historyStack, setHistoryStack] = useState<string[]>([]);
  const [isContinuing, setIsContinuing] = useState(false);

  // Load persistent progress on note change
  useEffect(() => {
    const storageKey = `juxa_exam_v2_${note.title}`;
    const savedData = localStorage.getItem(storageKey);
    let loadedSections: BespokeSection[] = [];
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setSectionQuestions(parsed.questions || {});
        setSectionScores(parsed.scores || {});
        setAnswers(parsed.answers || {});
        loadedSections = parsed.customSections || [];
      } catch (e) {
        console.error("Failed to load saved progress:", e);
      }
    } else {
      setSectionQuestions({});
      setSectionScores({});
      setAnswers({});
    }

    if (loadedSections && loadedSections.length > 0) {
      setExamSections(loadedSections);
    } else {
      const derived = getHeaderSectionsFromHtml(note.htmlContent, note.title);
      setExamSections(derived);
    }

    // Reset view states
    setIsExamMode(false);
    setActiveSection(null);
    setErrorMessage(null);
    setCustomRoadmapSuccess(null);
    setIsEditing(false);
    setEditTitle(note.title);
    setEditContent(note.htmlContent);
    setIsFolded(false);
  }, [note.title, note.htmlContent]);

  const saveProgress = (
    newQuestions: { [key: number]: MCQ[] },
    newScores: { [key: number]: { correct: number, completed: boolean } },
    newAnswers: { [key: number]: { [key: number]: { selectedIndex: number, isChecked: boolean, isCorrect: boolean } } },
    customSects?: BespokeSection[]
  ) => {
    const storageKey = `juxa_exam_v2_${note.title}`;
    localStorage.setItem(storageKey, JSON.stringify({
      questions: newQuestions,
      scores: newScores,
      answers: newAnswers,
      customSections: customSects || examSections
    }));
  };


  // Keyboard Shortcuts handling
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + Shift + D -> Toggle edit mode
      if (e.altKey && e.shiftKey && e.code === "KeyD") {
        e.preventDefault();
        setIsEditing(prev => !prev);
      }
      
      // Ctrl + Shift + F -> Fold headings
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyF") {
        e.preventDefault();
        setIsFolded(true);
      }
      
      // Ctrl + Shift + U -> Unfold headings
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "KeyU") {
        e.preventDefault();
        setIsFolded(false);
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Global Undo (Ctrl + Z) Event Listener
  useEffect(() => {
    const handleUndoShortcut = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey) {
        // If focusing inside an input/textarea, standard browser undo/redo is active inside the text area
        const target = e.target as HTMLElement;
        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
          return; 
        }
        
        e.preventDefault();
        handleGlobalUndo();
      }
    };

    window.addEventListener("keydown", handleUndoShortcut);
    return () => window.removeEventListener("keydown", handleUndoShortcut);
  }, [historyStack, note, onUpdateNote]);

  // Global Undo state execution
  const handleGlobalUndo = async () => {
    if (historyStack.length === 0) return;
    
    const previousStateString = historyStack[historyStack.length - 1];
    const newHistory = historyStack.slice(0, -1);
    setHistoryStack(newHistory);

    try {
      const parsed = JSON.parse(previousStateString);
      const previousHtml = parsed.htmlContent;
      const previousMcqs = parsed.mcqs;

      const updatedNotebook = {
        ...note,
        htmlContent: previousHtml,
        mcqs: previousMcqs
      } as EnhancedNotebook;

      await saveNotebook(updatedNotebook);

      if (onUpdateNote) {
        onUpdateNote(updatedNotebook);
      }
      
      // Sync local text editor content
      setEditContent(previousHtml);
      
      setCustomRoadmapSuccess("Reverted last edit successfully! (Ctrl+Z applied)");
      setTimeout(() => setCustomRoadmapSuccess(null), 3000);
    } catch (e) {
      console.error("Failed to parse state for Undo:", e);
    }
  };

  // LaTeX Diagnostics states
  const [isFixingAll, setIsFixingAll] = useState(false);

  // Scan note body and MCQs for LaTeX errors dynamically
  const latexErrors = useMemo(() => {
    const errors: { id: string; math: string; displayMode: boolean; errorMsg: string; location: string }[] = [];
    if (!note) return errors;

    // Helper to safely check if LaTeX compiles with KaTeX
    const checkLaTeX = (math: string, displayMode: boolean, location: string, id: string) => {
      const cleaned = cleanLaTeX(math);
      if (!cleaned.trim()) return;
      try {
        katex.renderToString(cleaned, { throwOnError: true, displayMode });
      } catch (err: any) {
        errors.push({
          id,
          math: cleaned,
          displayMode,
          errorMsg: err?.message || "KaTeX formatting error",
          location
        });
      }
    };

    // 1. Scan Note content HTML
    // Find all $$ and $ blocks
    const html = note.htmlContent || "";
    
    // First let's check block equations
    const blocks = html.split(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g);
    blocks.forEach((block, idx) => {
      if (idx % 2 === 1) { // odd indexes are inside double-dollars
        checkLaTeX(block, true, "Note Body text", `block-html-${idx}`);
      } else {
        // even indexes are normal text, search for inline equations
        const parts = block.split(/(?<!\\)\$([^\$]+?)(?<!\\)\$/g);
        parts.forEach((part, idx2) => {
          if (idx2 % 2 === 1) { // odd indexes are inside single-dollars
            checkLaTeX(part, false, "Note Body text", `inline-html-${idx}-${idx2}`);
          }
        });
      }
    });

    // 2. Scan companion questions MCQs
    const mcqsList = note.mcqs || [];
    mcqsList.forEach((mcq, mIdx) => {
      const qNum = mIdx + 1;
      
      // Question field
      const qBlocks = mcq.question.split(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g);
      qBlocks.forEach((qb, idx) => {
        if (idx % 2 === 1) {
          checkLaTeX(qb, true, `Question ${qNum} Prompt`, `mcq-${mcq.id}-q-block-${idx}`);
        } else {
          const qp = qb.split(/(?<!\\)\$([^\$]+?)(?<!\\)\$/g);
          qp.forEach((p, idx2) => {
            if (idx2 % 2 === 1) {
              checkLaTeX(p, false, `Question ${qNum} Prompt`, `mcq-${mcq.id}-q-inline-${idx}-${idx2}`);
            }
          });
        }
      });

      // Explanation field
      const eBlocks = mcq.explanation.split(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g);
      eBlocks.forEach((eb, idx) => {
        if (idx % 2 === 1) {
          checkLaTeX(eb, true, `Question ${qNum} Explanation`, `mcq-${mcq.id}-e-block-${idx}`);
        } else {
          const ep = eb.split(/(?<!\\)\$([^\$]+?)(?<!\\)\$/g);
          ep.forEach((p, idx2) => {
            if (idx2 % 2 === 1) {
              checkLaTeX(p, false, `Question ${qNum} Explanation`, `mcq-${mcq.id}-e-inline-${idx}-${idx2}`);
            }
          });
        }
      });

      // Options
      mcq.options.forEach((opt, oIdx) => {
        const optionLabel = ["A", "B", "C", "D"][oIdx] || String(oIdx + 1);
        const oBlocks = opt.split(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g);
        oBlocks.forEach((ob, idx) => {
          if (idx % 2 === 1) {
            checkLaTeX(ob, true, `Question ${qNum} Option ${optionLabel}`, `mcq-${mcq.id}-opt-${oIdx}-block-${idx}`);
          } else {
            const op = ob.split(/(?<!\\)\$([^\$]+?)(?<!\\)\$/g);
            op.forEach((p, idx2) => {
              if (idx2 % 2 === 1) {
                checkLaTeX(p, false, `Question ${qNum} Option ${optionLabel}`, `mcq-${mcq.id}-opt-${oIdx}-inline-${idx}-${idx2}`);
              }
            });
          }
        });
      });
    });

    return errors;
  }, [note.htmlContent, note.mcqs]);

  // Single live editor formula fixing state
  const [isFixingFormulaId, setIsFixingFormulaId] = useState<string | null>(null);

  // Scan live editor html text area content for LaTeX errors
  const liveEditorLaTeXErrors = useMemo(() => {
    const errors: { id: string; math: string; displayMode: boolean; errorMsg: string; rawBlock: string }[] = [];
    if (!editContent) return errors;

    const checkLaTeX = (math: string, displayMode: boolean, rawBlock: string, id: string) => {
      const cleaned = cleanLaTeX(math);
      if (!cleaned.trim()) return;
      try {
        katex.renderToString(cleaned, { throwOnError: true, displayMode });
      } catch (err: any) {
        errors.push({
          id,
          math: cleaned,
          displayMode,
          errorMsg: err?.message || "KaTeX formatting error",
          rawBlock
        });
      }
    };

    // Split blocks based on double dollars
    const blocks = editContent.split(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g);
    blocks.forEach((block, idx) => {
      if (idx % 2 === 1) { // inside block math
        checkLaTeX(block, true, `$$${block}$$`, `live-block-${idx}`);
      } else {
        const parts = block.split(/(?<!\\)\$([^\$]+?)(?<!\\)\$/g);
        parts.forEach((part, idx2) => {
          if (idx2 % 2 === 1) { // inside inline math
            checkLaTeX(part, false, `$${part}$`, `live-inline-${idx}-${idx2}`);
          }
        });
      }
    });

    return errors;
  }, [editContent]);

  // Handle single formula repair with AI in real-time in the editor textarea
  const handleFixSingleLiveFormulaInEditor = async (id: string, badFormula: string, displayMode: boolean, errMsg: string) => {
    setIsFixingFormulaId(id);
    try {
      setCustomRoadmapSuccess("Calling AI Doctor to correct this specific equation...");
      const fixed = await fixLaTeXEquation(badFormula, errMsg);
      
      // Update editContent
      let updatedContent = editContent;
      const delimiter = displayMode ? "$$" : "$";
      const exactRaw = `${delimiter}${badFormula}${delimiter}`;
      const exactFixed = `${delimiter}${fixed}${delimiter}`;
      
      if (updatedContent.includes(exactRaw)) {
        updatedContent = updatedContent.replace(exactRaw, exactFixed);
      } else if (updatedContent.includes(badFormula)) {
        updatedContent = updatedContent.replace(badFormula, fixed);
      } else {
        // Fallback: simple text replacement via normalization
        const parts = updatedContent.split(exactRaw);
        if (parts.length > 1) {
          updatedContent = parts.join(exactFixed);
        } else {
          // ultra-fuzzy find and replace
          const normalizeStr = (s: string) => s.replace(/[\s\n\r\t\$\\]/g, '').toLowerCase();
          const normalizedBad = normalizeStr(badFormula);
          
          let found = false;
          // Look for matching substring when ignoring spaces/backslashes
          for (let i = 0; i < updatedContent.length; i++) {
            const sliced = updatedContent.substring(i);
            const tryLen = Math.min(sliced.length, badFormula.length * 3 + 20);
            const trySubstr = sliced.substring(0, tryLen);
            if (normalizeStr(trySubstr).startsWith(normalizedBad)) {
              let currentNormalize = "";
              let charCount = 0;
              for (let j = 0; j < trySubstr.length; j++) {
                const c = trySubstr[j];
                if (!/[\s\n\r\t\$\\]/.test(c)) {
                  currentNormalize += c.toLowerCase();
                }
                charCount = j + 1;
                if (currentNormalize === normalizedBad) {
                  break;
                }
              }
              updatedContent = updatedContent.substring(0, i) + fixed + updatedContent.substring(i + charCount);
              found = true;
              break;
            }
          }
          if (!found) {
            throw new Error("Could not automatically locate the equation coordinates. Feel free to copy/paste directly.");
          }
        }
      }
      
      setEditContent(updatedContent);
      setCustomRoadmapSuccess(`✅ Formula corrected to: ${fixed}`);
      setTimeout(() => setCustomRoadmapSuccess(null), 3000);
    } catch (err: any) {
      alert(`Could not automatically edit: ${err?.message || err}`);
    } finally {
      setIsFixingFormulaId(null);
    }
  };

  // Complete clean sweep correction inside the active editing text area
  const handleFixAllLaTeXLoneInEditor = async () => {
    if (isFixingAll) return;
    setIsFixingAll(true);
    setErrorMessage(null);
    try {
      setCustomRoadmapSuccess("Calling AI Math Doctor to scan and correct every single layout error inside the text editor...");
      const result = await fixAllLaTeXInDocument(editTitle, editContent, note.mcqs);
      
      setEditContent(result.htmlContent);
      setCustomRoadmapSuccess("✅ All LaTeX mathematical equations healed inside the editor! Verify and Save changes below.");
      alert("AI has processed the mathematical formulas across your lesson! Review the cleaned formulas, then hit 'Save Changes' to commit.");
      setTimeout(() => setCustomRoadmapSuccess(null), 5000);
    } catch (err: any) {
      console.error("AI automated diagnostics healing failed:", err);
      alert(`AI doctors failed to heal formulas: ${err?.message || err}`);
    } finally {
      setIsFixingAll(false);
    }
  };

  // Convert special interactive preview markers back to placeholder nodes
  const previewProcessedHtml = useMemo(() => {
    let processed = editContent.replace(/\[\[MCQ:([\w-]+)\]\]/g, '<mcq-placeholder data-id="$1"></mcq-placeholder>');
    processed = processed.replace(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g, '<div class="d101">$1</div>');
    processed = processed.replace(/(?<!\\)\$([^\$]+?)(?<!\\)\$/g, '<span class="katex">$1</span>');
    return processed;
  }, [editContent]);

  const handleFixPreviewFormula = async (badFormula: string, fixedFormula: string, isBlock: boolean) => {
    let updatedContent = editContent;
    const delimiter = isBlock ? "$$" : "$";
    const exactRaw = `${delimiter}${badFormula}${delimiter}`;
    const exactFixed = `${delimiter}${fixedFormula}${delimiter}`;

    if (updatedContent.includes(exactRaw)) {
      updatedContent = updatedContent.replace(exactRaw, exactFixed);
    } else if (updatedContent.includes(badFormula)) {
      updatedContent = updatedContent.replace(badFormula, fixedFormula);
    } else {
      const parts = updatedContent.split(exactRaw);
      if (parts.length > 1) {
        updatedContent = parts.join(exactFixed);
      } else {
        updatedContent = updatedContent.replaceAll(badFormula, fixedFormula);
      }
    }
    setEditContent(updatedContent);
    setCustomRoadmapSuccess(`✅ Healed and replaced formula in preview: ${fixedFormula}`);
    setTimeout(() => setCustomRoadmapSuccess(null), 3000);
  };

  const previewFinalOptions: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        if (domNode.name === 'mcq-placeholder') {
          const id = domNode.attribs['data-id'];
          const mcq = note.mcqs.find(m => m.id === id);
          if (mcq) {
            return <MCQComponent mcq={mcq} />;
          }
        }

        if (domNode.attribs && domNode.attribs.class && domNode.attribs.class.includes('d101')) {
          const textContent = getTextFromNode(domNode);
          if (textContent.trim()) {
            const cleanMath = cleanLaTeX(textContent);
            return (
              <div className="d101 flex justify-center py-4 text-center w-full">
                <SafeMath 
                  math={cleanMath} 
                  displayMode={true} 
                  onFix={async (fixedMath) => {
                    await handleFixPreviewFormula(cleanMath, fixedMath, true);
                  }}
                />
              </div>
            );
          }
        }

        if (domNode.attribs && domNode.attribs.class && domNode.attribs.class.includes('katex')) {
          const textContent = getTextFromNode(domNode);
          if (textContent.trim()) {
            const cleanMath = cleanLaTeX(textContent);
            return (
              <span className="katex mx-1">
                <SafeMath 
                  math={cleanMath} 
                  displayMode={false} 
                  onFix={async (fixedMath) => {
                    await handleFixPreviewFormula(cleanMath, fixedMath, false);
                  }}
                />
              </span>
            );
          }
        }
      }
    }
  };

  const handleContinueNote = async () => {
    if (isContinuing) return;
    setIsContinuing(true);
    setErrorMessage(null);

    try {
      let unitContext: any = undefined;
      const savedUnitId = note.unitId;
      if (savedUnitId) {
        for (const subj of SYLLABUS) {
          for (const theme of subj.themes) {
            const matchedUnit = theme.units.find(u => u.id === savedUnitId);
            if (matchedUnit) {
              unitContext = {
                subjectName: subj.name,
                themeName: theme.name,
                unitName: matchedUnit.name
              };
              break;
            }
          }
          if (unitContext) break;
        }
      }

      // Record state for UNDO historical stack, so user can roll back if needed
      const currentStateString = JSON.stringify({
        htmlContent: note.htmlContent,
        mcqs: note.mcqs
      });
      setHistoryStack(prev => [...prev, currentStateString]);

      // Call continuation API service
      const result = await continueNote(note.title, note.htmlContent, unitContext);

      // Append HTML and new MCQs correctly
      const mergedHtml = note.htmlContent.trim() + " " + result.htmlContinuation.trim();
      const mergedMcqs = [...note.mcqs, ...result.newMcqs];

      const updatedNotebook = {
        ...note,
        htmlContent: mergedHtml,
        mcqs: mergedMcqs
      } as EnhancedNotebook;

      // Persist inside storage / indexed DB
      await saveNotebook(updatedNotebook);

      if (onUpdateNote) {
        onUpdateNote(updatedNotebook);
      }

      setCustomRoadmapSuccess("Note continuation generated and appended successfully!");
      setTimeout(() => setCustomRoadmapSuccess(null), 3500);

    } catch (err: any) {
      console.error("Failed to continue note:", err);
      setErrorMessage(err?.message || "There was an error attempting to resume notes generation. Please try again.");
    } finally {
      setIsContinuing(false);
    }
  };

  // Master command to fix all LaTeX syntax anomalies on note content and questions
  const handleFixAllLaTeX = async () => {
    if (isFixingAll) return;
    setIsFixingAll(true);
    setErrorMessage(null);
    try {
      // Save original state to history stack for instant Ctrl+Z support
      setHistoryStack(prev => [...prev, JSON.stringify({ htmlContent: note.htmlContent, mcqs: note.mcqs })]);
      
      setCustomRoadmapSuccess("Activating AI Math Doctor to scan and heal all LaTeX equations...");
      const result = await fixAllLaTeXInDocument(note.title, note.htmlContent, note.mcqs);
      
      const updatedNotebook = {
        ...note,
        htmlContent: result.htmlContent,
        mcqs: result.mcqs
      } as EnhancedNotebook;

      await saveNotebook(updatedNotebook);
      
      if (onUpdateNote) {
        onUpdateNote(updatedNotebook);
      }
      
      // Update local text editor text
      setEditContent(result.htmlContent);
      
      setCustomRoadmapSuccess("✅ All LaTeX mathematical equations healed successfully! Press Ctrl+Z to undo.");
      setTimeout(() => setCustomRoadmapSuccess(null), 5000);
    } catch (err: any) {
      console.error("AI automated diagnostics healing failed:", err);
      setErrorMessage(`AI doctor failed to heal formulas: ${err?.message || err}`);
    } finally {
      setIsFixingAll(false);
    }
  };

  // Automated Formula fixing handler
  const handleFixFormula = async (badFormula: string, fixedFormula: string, displayMode: boolean) => {
    // Fuzzy search and replace helper
    const replaceFuzzy = (sourceStr: string, bad: string, replacement: string): { success: boolean; result: string } => {
      // 1. Direct replacement of exact match
      if (sourceStr.includes(bad)) {
        return { success: true, result: sourceStr.replace(bad, replacement) };
      }
      const trimmedBad = bad.trim();
      if (sourceStr.includes(trimmedBad)) {
        return { success: true, result: sourceStr.replace(trimmedBad, replacement) };
      }

      // 2. Normalized comparison replacement
      const normalize = (s: string) => s.replace(/[\s\n\r\t\$]/g, '').toLowerCase();
      const normalizedBad = normalize(bad);
      if (!normalizedBad) return { success: false, result: sourceStr };

      const originalIndices: number[] = [];
      let normalizedOriginal = "";
      for (let i = 0; i < sourceStr.length; i++) {
        const char = sourceStr[i];
        if (!/[\s\n\r\t\$]/.test(char)) {
          normalizedOriginal += char.toLowerCase();
          originalIndices.push(i);
        }
      }

      const matchIdx = normalizedOriginal.indexOf(normalizedBad);
      if (matchIdx !== -1) {
        const start = originalIndices[matchIdx];
        const end = originalIndices[matchIdx + normalizedBad.length - 1] + 1;
        const substituted = sourceStr.substring(0, start) + replacement + sourceStr.substring(end);
        return { success: true, result: substituted };
      }

      // 3. Ultra-fuzzy comparison (ignoring backslashes to resolve escaping level conflicts)
      const normalizeMore = (s: string) => s.replace(/[\s\n\r\t\$\\]/g, '').toLowerCase();
      const normalizedBadMore = normalizeMore(bad);
      if (!normalizedBadMore) return { success: false, result: sourceStr };

      const originalMoreIndices: number[] = [];
      let normalizedOriginalMore = "";
      for (let i = 0; i < sourceStr.length; i++) {
        const char = sourceStr[i];
        if (!/[\s\n\r\t\$\\]/.test(char)) {
          normalizedOriginalMore += char.toLowerCase();
          originalMoreIndices.push(i);
        }
      }

      const matchIdxMore = normalizedOriginalMore.indexOf(normalizedBadMore);
      if (matchIdxMore !== -1) {
        const start = originalMoreIndices[matchIdxMore];
        const end = originalMoreIndices[matchIdxMore + normalizedBadMore.length - 1] + 1;
        const substituted = sourceStr.substring(0, start) + replacement + sourceStr.substring(end);
        return { success: true, result: substituted };
      }

      return { success: false, result: sourceStr };
    };

    let currentHtml = note.htmlContent;
    const resHtml = replaceFuzzy(currentHtml, badFormula, fixedFormula);
    let foundAndReplaced = resHtml.success;
    if (foundAndReplaced) {
      currentHtml = resHtml.result;
    }

    // Replace also in questions context if appropriate
    let foundInMcqs = false;
    const updatedMcqs = note.mcqs.map(mcq => {
      let changed = false;
      
      const qRes = replaceFuzzy(mcq.question, badFormula, fixedFormula);
      let q = mcq.question;
      if (qRes.success) {
        q = qRes.result;
        changed = true;
      }
      
      const opts = mcq.options.map(opt => {
        const optRes = replaceFuzzy(opt, badFormula, fixedFormula);
        if (optRes.success) {
          changed = true;
          return optRes.result;
        }
        return opt;
      });

      const expRes = replaceFuzzy(mcq.explanation, badFormula, fixedFormula);
      let exp = mcq.explanation;
      if (expRes.success) {
        exp = expRes.result;
        changed = true;
      }

      if (changed) {
        foundInMcqs = true;
        return {
          ...mcq,
          question: q,
          options: opts,
          explanation: exp
        };
      }
      return mcq;
    });

    // Fallback: If local string replacement completely missed or was corrupted,
    // let's run contextual AI healing over the entire note content dynamically!
    if (!foundAndReplaced && !foundInMcqs) {
      try {
        setCustomRoadmapSuccess("Regex matching missed. Healing via contextual AI synthesis...");
        const healedHtml = await healDocumentFormulaWithAI(note.title, currentHtml, badFormula, fixedFormula);
        if (healedHtml && healedHtml.trim() !== currentHtml.trim()) {
          currentHtml = healedHtml;
          foundAndReplaced = true;
        }
      } catch (e: any) {
        console.error("AI contextual healing fallback failed:", e);
      }
    }

    if (foundAndReplaced || foundInMcqs) {
      // Save previously existing state to undo stack first (allows Ctrl+Z afterward!)
      setHistoryStack(prev => [...prev, JSON.stringify({ htmlContent: note.htmlContent, mcqs: note.mcqs })]);

      const updatedNotebook = {
        ...note,
        htmlContent: currentHtml,
        mcqs: updatedMcqs
      } as EnhancedNotebook;

      await saveNotebook(updatedNotebook);

      if (onUpdateNote) {
        onUpdateNote(updatedNotebook);
      }

      // Sync local text editor content
      setEditContent(currentHtml);

      setCustomRoadmapSuccess("LaTeX formula fixed and saved successfully!");
      setTimeout(() => setCustomRoadmapSuccess(null), 3500);
    } else {
      // Opening editor workspace where the user / AI has robust controls!
      const confirmOpen = window.confirm(
        "Could not automatically locate this equation within the formatted HTML page.\n\n" +
        "Would you like us to open the Master LaTeX Diagnostics Editor Workspace where you can interactively view, auto-repair, and save all formulas directly?"
      );
      if (confirmOpen) {
        setEditTitle(note.title);
        setEditContent(note.htmlContent);
        setIsEditing(true);
      }
    }
  };

  // Save edits handler
  const handleSaveEdits = async () => {
    try {
      // Back up previous state to history
      setHistoryStack(prev => [...prev, JSON.stringify({ htmlContent: note.htmlContent, mcqs: note.mcqs })]);

      const updatedNotebook = {
        ...note,
        title: editTitle,
        htmlContent: editContent,
      } as EnhancedNotebook;

      // Persist changes offline
      await saveNotebook(updatedNotebook);

      // Trigger re-render / synchronization in App
      if (onUpdateNote) {
        onUpdateNote(updatedNotebook);
      }

      setIsEditing(false);
      setCustomRoadmapSuccess("Edits applied live successfully!");
      setTimeout(() => setCustomRoadmapSuccess(null), 3000);
    } catch (err: any) {
      alert("Failed to save edited note: " + (err?.message || err));
    }
  };

  // Reading time calculator: avg adult reads at ~200 WPM
  const wordsRawCount = note.htmlContent.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  const estimatedReadingTime = Math.max(1, Math.ceil(wordsRawCount / 200));

  // Find curriculum context
  const unitId = (note as any).unitId;
  const subject = SYLLABUS.find(s => s.themes.some(t => t.units.some(u => u.id === unitId)));
  const theme = subject?.themes.find(t => t.units.some(u => u.id === unitId));
  const unit = theme?.units.find(u => u.id === unitId);
  const subjectId = subject ? subject.id : 'physics';

  // Standard Export Actions
  const handlePrint = () => {
    window.print();
  };

  const handleExportToPdf = async () => {
    setExporting(true);
    try {
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
      const element = document.getElementById('juxa-printable-article');
      if (!element) return;

      element.classList.add('hide-buttons-canvas');

      const opt = {
        margin: [0.5, 0.5, 0.5, 0.5],
        filename: `${note.title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-notebook.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollY: 0, scrollX: 0 },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
      };

      await html2pdf().set(opt).from(element).save();
      element.classList.remove('hide-buttons-canvas');
    } catch (err) {
      console.error('PDF export failed:', err);
      alert('We were unable to export the PDF. Try using the browser "Print Document" option instead.');
    } finally {
      setExporting(false);
    }
  };

  // Start Section Quiz handling
  const handleStartSection = async (sectionNum: number, sectionTitle: string) => {
    setErrorMessage(null);
    if (sectionQuestions[sectionNum] && sectionQuestions[sectionNum].length > 0) {
      setActiveSection(sectionNum);
      setCurrentQuestionIdx(0);
      return;
    }

    setLoadingSection(sectionNum);
    try {
      const generated = await generateExamQuestions(note.title, note.htmlContent, sectionNum, sectionTitle);
      if (generated && generated.length > 0) {
        const updatedQuestions = { ...sectionQuestions, [sectionNum]: generated };
        setSectionQuestions(updatedQuestions);
        saveProgress(updatedQuestions, sectionScores, answers);
        setActiveSection(sectionNum);
        setCurrentQuestionIdx(0);
      } else {
        throw new Error("Invalid question count generated. Please retry.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Rate limit or connection timeout hit. Please wait a few seconds and try starting again.");
    } finally {
      setLoadingSection(null);
    }
  };

  const handleGenerateBespokeRoadmap = async () => {
    if (isGeneratingBespoke) return;
    setIsGeneratingBespoke(true);
    setErrorMessage(null);
    setCustomRoadmapSuccess(null);
    try {
      const generated = await generateBespokeExamSections(note.title, note.htmlContent);
      if (generated && generated.length === 10) {
        setExamSections(generated);
        // Clear old questions/scores to align with the new bespoke sections
        setSectionQuestions({});
        setSectionScores({});
        setAnswers({});
        saveProgress({}, {}, {}, generated);
        setCustomRoadmapSuccess("Bespoke roadmap successfully formulated! Below are the 10 custom sections tailored specifically to your lesson contents.");
      } else {
        throw new Error("Invalid structure returned for syllabus roadmap.");
      }
    } catch (err: any) {
      console.error(err);
      setErrorMessage(err?.message || "Failed to generate custom syllabus roadmap. Please verify your connection/API details and retry.");
    } finally {
      setIsGeneratingBespoke(false);
    }
  };

  const handleBatchGenerateAll = async () => {
    if (isBatchGenerating) return;
    setErrorMessage(null);
    setIsBatchGenerating(true);
    setBatchProgress(0);
    
    let updatedQuestions = { ...sectionQuestions };
    const tempScores = { ...sectionScores };
    const tempAnswers = { ...answers };
    
    try {
      for (let i = 0; i < examSections.length; i++) {
        const sec = examSections[i];
        
        // Skip if already generated and has questions
        if (updatedQuestions[sec.num] && updatedQuestions[sec.num].length > 0) {
          setBatchProgress(i + 1);
          continue;
        }
        
        setBatchStatusText(`Authoring Section ${sec.num}/10: ${sec.title}...`);
        
        const generated = await generateExamQuestions(note.title, note.htmlContent, sec.num, sec.title);
        if (generated && generated.length > 0) {
          updatedQuestions[sec.num] = generated;
          // save progress state
          setSectionQuestions({ ...updatedQuestions });
          saveProgress(updatedQuestions, tempScores, tempAnswers);
        } else {
          throw new Error(`Failed to generate questions for Section ${sec.num}`);
        }
        
        setBatchProgress(i + 1);
        // Stagger/pause slightly between requests to protect rate limits gently
        await new Promise(r => setTimeout(r, 600));
      }
      
      setBatchStatusText("100-Question Exam Arena fully constructed!");
    } catch (err: any) {
      console.error("Batch generation failed:", err);
      setErrorMessage(`Batch generation was interrupted: ${err?.message || err}. You can resume from this point by clicking 'Generate 100 Questions' again!`);
    } finally {
      setIsBatchGenerating(false);
    }
  };

  // Select Option Handling
  const handleSelectOption = (index: number) => {
    if (!activeSection) return;
    const currentSectionAnswers = answers[activeSection] || {};
    if (currentSectionAnswers[currentQuestionIdx]?.isChecked) return; // already locked

    const updatedSectionAnswers = {
      ...currentSectionAnswers,
      [currentQuestionIdx]: {
        selectedIndex: index,
        isChecked: true, // Auto check upon tap for smooth interaction flow
        isCorrect: index === sectionQuestions[activeSection][currentQuestionIdx].correctAnswerIndex
      }
    };

    const updatedAnswers = {
      ...answers,
      [activeSection]: updatedSectionAnswers
    };

    setAnswers(updatedAnswers);
    saveProgress(sectionQuestions, sectionScores, updatedAnswers);
  };

  const handleFinishSection = () => {
    if (!activeSection) return;
    const currentSectionAnswers = answers[activeSection] || {};
    const questionsList = sectionQuestions[activeSection] || [];
    
    // Calculate Score
    let correctCount = 0;
    questionsList.forEach((_, idx) => {
      if (currentSectionAnswers[idx]?.isCorrect) {
        correctCount++;
      }
    });

    const updatedScores = {
      ...sectionScores,
      [activeSection]: {
        correct: correctCount,
        completed: true
      }
    };

    setSectionScores(updatedScores);
    saveProgress(sectionQuestions, updatedScores, answers);
    setActiveSection(null);
  };

  // Helper to safely strip raw LaTeX delimiters and brackets before sending to KaTeX
  const cleanLaTeX = (math: string): string => {
    let cleaned = math.trim();
    if (cleaned.startsWith('$$') && cleaned.endsWith('$$')) {
      cleaned = cleaned.substring(2, cleaned.length - 2).trim();
    }
    if (cleaned.startsWith('$') && cleaned.endsWith('$')) {
      cleaned = cleaned.substring(1, cleaned.length - 1).trim();
    }
    if (cleaned.startsWith('\\[') && cleaned.endsWith('\\]')) {
      cleaned = cleaned.substring(2, cleaned.length - 2).trim();
    }
    if (cleaned.startsWith('\\(') && cleaned.endsWith('\\)')) {
      cleaned = cleaned.substring(2, cleaned.length - 2).trim();
    }
    return cleaned;
  };

  // Math-Logic / LaTeX parsing inside the questions and answers text
  const parseLaTeXText = (text: string) => {
    if (!text) return "";
    
    // First split on double-dollar $$ block delimiters
    const blocks = text.split(/(\txt\$\$[\s\S]+?\$\$)/g);
    // Actually standard splitting is:
    const normalBlocks = text.split(/(\$\$[\s\S]+?\$\$)/g);
    return normalBlocks.map((block, bIdx) => {
      if (block.startsWith('$$') && block.endsWith('$$')) {
        const math = block.slice(2, -2);
        const cleanMath = cleanLaTeX(math);
        return (
          <div key={`b-${bIdx}`} className="my-3 text-center">
            <SafeMath 
              math={cleanMath} 
              displayMode={true} 
              onFix={async (fixedMath) => {
                await handleFixFormula(cleanMath, fixedMath, true);
              }}
            />
          </div>
        );
      }
      
      // Inside plain text blocks, split on single-dollar $ inline delimiters
      const parts = block.split(/(\$[^\$]+?\$)/g);
      return parts.map((part, index) => {
        if (part.startsWith('$') && part.endsWith('$')) {
          const math = part.slice(1, -1);
          const cleanMath = cleanLaTeX(math);
          return (
            <span key={`i-${bIdx}-${index}`} className="inline-block mx-0.5 font-semibold text-indigo-600 dark:text-indigo-400 font-sans">
              <SafeMath 
                math={cleanMath} 
                displayMode={false} 
                onFix={async (fixedMath) => {
                  await handleFixFormula(cleanMath, fixedMath, false);
                }}
              />
            </span>
          );
        }
        return part;
      });
    });
  };

  // Convert special interactive markers back to placeholder nodes
  let processedHtml = note.htmlContent.replace(/\[\[MCQ:([\w-]+)\]\]/g, '<mcq-placeholder data-id="$1"></mcq-placeholder>');

  // Pre-process raw Math delimiters inside HTML to auto-wrap them in rendering classes 
  processedHtml = processedHtml.replace(/(?<!\\)\$\$([\s\S]+?)(?<!\\)\$\$/g, '<div class="d101">$1</div>');
  processedHtml = processedHtml.replace(/(?<!\\)\$([^\$]+?)(?<!\\)\$/g, '<span class="katex">$1</span>');

  const isIncomplete = useMemo(() => isNoteIncomplete(note.htmlContent), [note.htmlContent]);

  if (isIncomplete) {
    const trimmedHtml = processedHtml.trim();
    if (trimmedHtml.endsWith('</p>')) {
      processedHtml = trimmedHtml.slice(0, -4) + ' <continue-placeholder></continue-placeholder></p>';
    } else {
      processedHtml = trimmedHtml + ' <continue-placeholder></continue-placeholder>';
    }
  }

  const finalOptions: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        if (domNode.name === 'continue-placeholder') {
          return (
            <span className="inline-flex items-center ml-2 select-none align-baseline">
              <button
                type="button"
                onClick={handleContinueNote}
                disabled={isContinuing}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold font-mono text-indigo-650 dark:text-indigo-400 hover:text-indigo-750 dark:hover:text-indigo-300 bg-indigo-50/70 hover:bg-indigo-100/70 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 border border-indigo-200/50 dark:border-indigo-850 rounded-lg hover:scale-[1.01] transition-all cursor-pointer shadow-sm align-middle h-[18px]"
                title="The note appears incomplete due to AI generation limits. Click to seamlessly generate and append the remaining sections."
              >
                {isContinuing ? (
                  <>
                    <RefreshCw className="w-2.5 h-2.5 animate-spin text-indigo-550" />
                    <span>Continuing...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-2.5 h-2.5 text-indigo-555 animate-pulse" />
                    <span>Continue notes</span>
                  </>
                )}
              </button>
            </span>
          );
        }

        if (domNode.name === 'mcq-placeholder') {
          const id = domNode.attribs['data-id'];
          const mcq = note.mcqs.find(m => m.id === id);
          if (mcq) {
            return <MCQComponent mcq={mcq} />;
          }
        }

        if (domNode.attribs && domNode.attribs.class && domNode.attribs.class.includes('d101')) {
          const textContent = getTextFromNode(domNode);
          if (textContent.trim()) {
            const cleanMath = cleanLaTeX(textContent);
            return (
              <div className="d101 flex justify-center py-4 text-center w-full">
                <SafeMath 
                  math={cleanMath} 
                  displayMode={true} 
                  onFix={async (fixedMath) => {
                    await handleFixFormula(cleanMath, fixedMath, true);
                  }}
                />
              </div>
            );
          }
        }

        if (domNode.attribs && domNode.attribs.class && domNode.attribs.class.includes('katex')) {
          const textContent = getTextFromNode(domNode);
          if (textContent.trim()) {
            const cleanMath = cleanLaTeX(textContent);
            return (
              <span className="katex mx-1">
                <SafeMath 
                  math={cleanMath} 
                  displayMode={false} 
                  onFix={async (fixedMath) => {
                    await handleFixFormula(cleanMath, fixedMath, false);
                  }}
                />
              </span>
            );
          }
        }
      }
    }
  };

  // Exam global metrics
  const scoreValues = Object.values(sectionScores) as { correct: number; completed: boolean }[];
  const totalCompletedQuestions = (Object.entries(sectionScores) as [string, { correct: number; completed: boolean }][]).reduce((acc, [secNumStr, s]) => {
    if (s.completed) {
      const qCount = sectionQuestions[Number(secNumStr)]?.length || 10;
      return acc + qCount;
    }
    return acc;
  }, 0);
  const totalCorrectQuestions = scoreValues.reduce((acc, s) => acc + s.correct, 0);

  // If in Exam mode
  if (isExamMode) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 px-4 py-8 md:py-12 transition-colors duration-300">
        <div className="max-w-5xl mx-auto">
          
          {/* Main Top Header Navigation */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-8">
            <button
              onClick={() => {
                if (activeSection !== null) {
                  setActiveSection(null);
                } else {
                  setIsExamMode(false);
                }
              }}
              className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{activeSection !== null ? "Back to Section Deck" : "Exit Exam Arena"}</span>
            </button>
            <div className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 to-pink-500 text-white rounded-full px-4 py-1.5 shadow-sm">
              <GraduationCap className="w-4 h-4" />
              <span className="text-[11px] font-black tracking-wider uppercase font-mono">100 MCQ STAGE</span>
            </div>
          </div>

          {/* Section Selection Dashboard Card */}
          {activeSection === null ? (
            <div className="space-y-8 animate-fadeIn">
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-2xl">
                <div className="absolute -top-12 -right-12 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl"></div>
                <div className="absolute -bottom-16 -left-16 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative">
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded">Elite Challenge Deck</span>
                    <h2 className="text-3xl md:text-4xl font-extrabold tracking-tight text-white mt-3 mb-1">
                      {note.title} Exam
                    </h2>
                    <p className="text-sm text-slate-400 max-w-xl">
                      Each chapter contains exactly 10 high-tier problems requiring multi-stage reasoning, math derivation proofs, and first-principles conceptual validation.
                    </p>
                  </div>
                  
                  <div className="bg-slate-800/80 border border-slate-750 p-5 rounded-2xl flex items-center gap-4 text-left font-mono">
                    <Trophy className="w-10 h-10 text-yellow-455 animate-bounce" />
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400">GRAND TOTAL SCORE</div>
                      <div className="text-2xl font-black text-white">{totalCorrectQuestions} <span className="text-xs text-slate-400">/ 100</span></div>
                      <div className="text-[10px] text-indigo-300 font-semibold">{totalCompletedQuestions}% COMPLETE</div>
                    </div>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-8 pt-6 border-t border-slate-800">
                  <div className="flex justify-between text-xs font-mono text-slate-400 mb-2">
                    <span>GLOBAL PERFORMANCE MATRIX</span>
                    <span>{totalCompletedQuestions} / 100 ANSWERED</span>
                  </div>
                  <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden flex">
                    {examSections.map((sec) => {
                      const compl = sectionScores[sec.num]?.completed;
                      const ratio = (sectionScores[sec.num]?.correct || 0) * 10;
                      return (
                        <div 
                           key={sec.num}
                           title={`${sec.title}: ${sectionScores[sec.num]?.correct || 0}/10 correct`}
                           className={`h-full border-r border-slate-900 transition-all ${
                            compl 
                              ? ratio >= 80 
                                ? 'bg-gradient-to-r from-emerald-500 to-green-500'
                                : ratio >= 50
                                  ? 'bg-amber-500'
                                  : 'bg-rose-500'
                              : 'bg-slate-800'
                          }`}
                          style={{ width: '10%' }}
                        />
                      );
                    })}
                  </div>
                </div>

                {/* Batch Generator Controller */}
                <div className="mt-8 p-5 bg-slate-950/60 border border-slate-800 rounded-2.5xl flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
                  <div className="flex items-center gap-3.5">
                    <div className="p-3 bg-indigo-500/10 text-indigo-400 rounded-2xl">
                      <Brain className={`w-5.5 h-5.5 ${isBatchGenerating ? 'animate-pulse' : ''}`} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black tracking-widest uppercase text-slate-205">Auto Exam Architect</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed max-w-md">
                        {isBatchGenerating 
                          ? batchStatusText 
                          : "Automatically author all missing exam sections sequentially in a single automated pass (approx. 20-30s)."
                        }
                      </p>
                    </div>
                  </div>
                  
                  {isBatchGenerating ? (
                    <div className="flex items-center gap-4 w-full md:w-auto bg-slate-900/80 border border-slate-800/80 px-4 py-2.5 rounded-xl">
                      <span className="text-[10px] font-mono font-bold text-slate-400">AUTHORING:</span>
                      <div className="h-2 w-28 bg-slate-850 rounded-full overflow-hidden relative flex-shrink-0">
                        <div 
                          className="h-full bg-gradient-to-r from-indigo-500 to-pink-500 transition-all duration-300"
                          style={{ width: `${(batchProgress / (examSections.length || 10)) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono font-black text-pink-400">{Math.round((batchProgress / (examSections.length || 10)) * 100)}%</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleBatchGenerateAll}
                      type="button"
                      className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-600 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider shadow hover:shadow-lg cursor-pointer transition-all flex items-center gap-2 whitespace-nowrap active:scale-[0.98]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>{batchProgress > 0 && batchProgress < 10 ? "Resume Exam Generation" : "Generate All 100 Questions"}</span>
                    </button>
                  )}
                </div>

              </div>

              {/* Dynamic Bespoke Section Customizer Banner */}
              <div className="bg-gradient-to-br from-slate-900 to-indigo-950 border border-indigo-500/20 rounded-3xl p-6 text-white relative overflow-hidden shadow-xl">
                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl"></div>
                
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                  <div className="max-w-2xl">
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] font-black uppercase tracking-widest text-pink-400 bg-pink-500/15 px-2.5 py-1 rounded border border-pink-500/10 font-mono">BESPOKE AI CURRICULUM</span>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/15 px-2.5 py-1 rounded border border-emerald-500/10 font-mono">100% PERSONALIZED</span>
                    </div>
                    <h3 className="text-xl font-black mt-3 text-white tracking-tight">Active Lesson Syllabus Roadmap</h3>
                    <p className="text-xs text-slate-355 mt-1.5 leading-relaxed">
                      By default, we automatically analyzed your note's main headings to map out 10 customized review chapters. Click below to run a deep AI analysis on all formulas, edge-case theorems, and proof parameters to structure an even more precise testing blueprint!
                    </p>
                  </div>
                  
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={handleGenerateBespokeRoadmap}
                      disabled={isGeneratingBespoke}
                      className="w-full md:w-auto px-5 py-3.5 bg-white text-indigo-955 hover:bg-slate-50 disabled:bg-slate-800 disabled:text-slate-400 border border-white/10 rounded-2xl font-black text-xs uppercase tracking-wider shadow cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
                    >
                      {isGeneratingBespoke ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Formulating Syllabus...</span>
                        </>
                      ) : (
                        <>
                          <Brain className="w-3.5 h-3.5 text-pink-500" />
                          <span>Re-Architect Bespoke Outline</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {customRoadmapSuccess && (
                  <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-xl flex items-center gap-2 font-semibold font-mono">
                    <Check className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{customRoadmapSuccess}</span>
                  </div>
                )}
              </div>

              {/* Error messages if any */}
              {errorMessage && (
                <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-bold text-sm">Testing Desk Interrupted</h5>
                    <p className="text-xs text-rose-700 mt-0.5">{errorMessage}</p>
                  </div>
                </div>
              )}

              {/* 10 Sections List */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {examSections.map((sec) => {
                  const score = sectionScores[sec.num];
                  const qCount = sectionQuestions[sec.num]?.length || 0;
                  const isLoad = loadingSection === sec.num;
                  
                  return (
                    <div
                      key={sec.num}
                      className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all ${
                        score?.completed
                          ? 'border-emerald-550 dark:border-emerald-900 shadow-emerald-50/20'
                          : qCount > 0
                            ? 'border-indigo-200 dark:border-indigo-900'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-350 dark:hover:border-slate-700'
                      } flex flex-col justify-between`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-400 bg-slate-100 dark:bg-slate-850 px-2.5 py-1 rounded">
                            SECTION 0{sec.num}
                          </span>
                          
                          {score?.completed ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-600 font-mono">
                              <CheckSquare className="w-4 h-4" />
                              <span>{score.correct} / {qCount} CORRECT</span>
                            </span>
                          ) : qCount > 0 ? (
                            <span className="text-[11px] font-bold text-indigo-500 font-mono">
                              IN PROGRESS
                            </span>
                          ) : (
                            <span className="text-[11px] font-bold text-slate-400 font-mono">
                              UNLOCKED
                            </span>
                          )}
                        </div>

                        <h4 className="text-lg font-extrabold text-slate-800 dark:text-slate-100 tracking-tight leading-snug">
                          {sec.title}
                        </h4>
                        
                        <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 leading-relaxed">
                          {sec.desc || `Rigorous questions authoring mathematical complexity testing for section ${sec.num}.`}
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-105/60 dark:border-slate-800 flex items-center justify-between">
                        {score?.completed ? (
                          <div className="text-[11px] font-bold text-slate-550 font-mono">
                            Accuracy Rate: <span className={score.correct >= (qCount * 0.8) ? 'text-emerald-600' : score.correct >= (qCount * 0.5) ? 'text-amber-600' : 'text-rose-600'}>{Math.round((score.correct / (qCount || 10)) * 100)}%</span>
                          </div>
                        ) : (
                          <div className="text-[11px] font-bold text-slate-405 font-mono">
                            Time Value: ~15 mins
                          </div>
                        )}

                        <button
                          onClick={() => handleStartSection(sec.num, sec.title)}
                          disabled={isLoad || loadingSection !== null}
                          className={`px-4 py-2 text-xs font-black tracking-widest uppercase rounded-xl shadow-sm transition-all flex items-center gap-2 cursor-pointer ${
                            isLoad
                              ? 'bg-slate-100 text-slate-400'
                              : score?.completed
                                ? 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 border border-emerald-200'
                                : 'bg-slate-900 border border-slate-900 text-white hover:bg-slate-800'
                          }`}
                        >
                          {isLoad ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>Authoring...</span>
                            </>
                          ) : score?.completed ? (
                            <>
                              <span>RETAKE PAPER</span>
                            </>
                          ) : (
                            <>
                              <Play className="w-3 h-3 fill-current" />
                              <span>START PAPER</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            
            /* activeSection Quiz arena screen */
            <div className="animate-fadeIn">
              
              {/* Question details top scorecard bar */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 mb-8 text-white flex flex-col md:flex-row items-center justify-between gap-4 font-mono shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-2xl"></div>
                
                <div>
                  <div className="text-[10px] text-slate-400 font-extrabold uppercase">ACTIVE PAPER SELECTION</div>
                  <h4 className="text-sm font-black text-slate-100 leading-tight">
                    Section {activeSection}: {examSections.find(s => s.num === activeSection)?.title}
                  </h4>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="text-center bg-slate-850 border border-slate-800 px-3.5 py-1.5 rounded-xl">
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">QUESTION PROGRESS</span>
                    <span className="text-sm font-black text-indigo-400">{currentQuestionIdx + 1} / {sectionQuestions[activeSection || 1]?.length || 10}</span>
                  </div>
                  
                  <button
                    onClick={handleFinishSection}
                    className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-600 hover:to-green-700 text-white rounded-xl font-extrabold text-xs shadow cursor-pointer transition-all"
                  >
                    Finish Section & Commit
                  </button>
                </div>
              </div>

              {/* Progress Bar of active paper */}
              <div className="h-1.5 w-full bg-slate-200 dark:bg-slate-800 rounded-full mb-8 overflow-hidden flex gap-2">
                {Array.from({ length: sectionQuestions[activeSection || 1]?.length || 10 }).map((_, i) => {
                  const state = answers[activeSection || 1]?.[i];
                  return (
                    <div
                      key={i}
                      onClick={() => setCurrentQuestionIdx(i)}
                      className={`h-full flex-grow rounded-full transition-all cursor-pointer ${
                        currentQuestionIdx === i
                          ? 'bg-indigo-600 ring-2 ring-indigo-500/20'
                          : state?.isChecked
                            ? state.isCorrect 
                              ? 'bg-emerald-500' 
                              : 'bg-rose-500'
                            : 'bg-slate-300 dark:bg-slate-800 hover:bg-slate-400'
                      }`}
                    />
                  );
                })}
              </div>

              {/* Question Screen layout */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left side: Question Body */}
                <div className="lg:col-span-7 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-sm">
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-400">Question {currentQuestionIdx + 1} of {sectionQuestions[activeSection || 1]?.length || 10}</span>
                  <div className="text-slate-800 dark:text-slate-150 leading-relaxed text-base font-medium mt-4 whitespace-pre-wrap">
                    {parseLaTeXText(sectionQuestions[activeSection]?.[currentQuestionIdx]?.question)}
                  </div>

                  {/* Math blocks parsed indicator */}
                  <div className="mt-8 bg-slate-50 dark:bg-slate-950 border border-slate-105/60 dark:border-slate-800/80 rounded-2xl p-4 flex gap-3 items-center">
                    <Brain className="w-5 h-5 text-indigo-500 animate-pulse flex-shrink-0" />
                    <span className="text-xs text-slate-500 leading-tight">Apply logical formulas, derivation boundaries, and theoretical paradigms to determine the strict proof choice value.</span>
                  </div>
                </div>

                {/* Right side: Option Choices & Answer Feedback */}
                <div className="lg:col-span-5 space-y-4">
                  {sectionQuestions[activeSection]?.[currentQuestionIdx]?.options.map((opt, i) => {
                    const answeredState = answers[activeSection]?.[currentQuestionIdx];
                    const isSelected = answeredState?.selectedIndex === i;
                    const isCorrectOpt = sectionQuestions[activeSection][currentQuestionIdx].correctAnswerIndex === i;
                    const hasAnswered = !!answeredState;

                    return (
                      <button
                        key={i}
                        onClick={() => handleSelectOption(i)}
                        disabled={hasAnswered}
                        className={`w-full p-4 text-left border rounded-2.5xl transition-all flex justify-between items-center ${
                          isSelected
                            ? isCorrectOpt
                              ? 'border-emerald-500 bg-emerald-50/30 text-slate-800 dark:text-emerald-100 ring-2 ring-emerald-500/20'
                              : 'border-rose-500 bg-rose-50/30 text-slate-800 dark:text-rose-100 ring-2 ring-rose-500/20'
                            : hasAnswered && isCorrectOpt
                              ? 'border-emerald-450 bg-emerald-50/20 text-emerald-800 dark:text-emerald-100'
                              : 'border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 hover:border-indigo-400 hover:bg-slate-50/50 dark:hover:bg-slate-850/50 text-slate-705 dark:text-slate-200'
                        } cursor-pointer disabled:pointer-events-none`}
                      >
                        <span className="text-sm font-bold leading-relaxed pr-3 flex gap-2">
                          <span className="font-mono text-slate-400">{["A", "B", "C", "D"][i]}.</span>
                          <span>{parseLaTeXText(opt)}</span>
                        </span>

                        {hasAnswered && isCorrectOpt && (
                          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                        )}

                        {hasAnswered && isSelected && !isCorrectOpt && (
                          <X className="w-5 h-5 text-rose-600 flex-shrink-0" />
                        )}
                      </button>
                    );
                  })}

                  {/* Comprehensive Explanation reveal card */}
                  {answers[activeSection]?.[currentQuestionIdx]?.isChecked && (
                    <div className="p-6 bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-150/40 dark:border-indigo-900/30 rounded-3xl space-y-3 animate-slideDown">
                      <div className="flex items-center gap-2 text-indigo-750 dark:text-indigo-305">
                        <Award className="w-5 h-5 stroke-[2]" />
                        <h5 className="text-xs font-black uppercase tracking-wider">RIGOROUS SOLUTION PROOF</h5>
                      </div>
                      <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-350 font-medium whitespace-pre-wrap">
                        {parseLaTeXText(sectionQuestions[activeSection][currentQuestionIdx].explanation)}
                      </p>
                    </div>
                  )}

                  {/* Navigation controls */}
                  <div className="flex items-center justify-between pt-4">
                    <button
                      onClick={() => {
                        if (currentQuestionIdx > 0) setCurrentQuestionIdx(currentQuestionIdx - 1);
                      }}
                      disabled={currentQuestionIdx === 0}
                      className="flex items-center gap-1 text-slate-400 hover:text-slate-700 disabled:opacity-30 disabled:pointer-events-none text-xs font-bold uppercase tracking-wider font-mono cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span>Back</span>
                    </button>
                    {currentQuestionIdx < (sectionQuestions[activeSection || 1]?.length || 10) - 1 ? (
                      <button
                        onClick={() => {
                          setCurrentQuestionIdx(currentQuestionIdx + 1);
                        }}
                        className="flex items-center gap-1 text-indigo-600 hover:text-indigo-850 text-xs font-extrabold uppercase tracking-widest font-mono cursor-pointer"
                      >
                        <span>Next Task</span>
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    ) : (
                      <button
                        onClick={handleFinishSection}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-black uppercase tracking-widest font-mono bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow cursor-pointer transition-all"
                      >
                        <span>Finish Paper</span>
                        <FastForward className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                </div>

              </div>

            </div>
          )}

        </div>
      </div>
    );
  }

  // Otherwise, standard view notes
  if (isEditing) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 px-4 py-8 md:py-12 transition-all">
        <div className="max-w-7xl mx-auto bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 md:p-8 shadow-xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-5 mb-6 gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1 px-2.5 text-[10px] font-black uppercase tracking-wider text-rose-500 bg-rose-50 dark:bg-rose-950/40 rounded-full font-mono">
                  Master Workspace
                </span>
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white mt-1">Edit Vault Lesson & Equations</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Modify study content directly and verify KaTeX rendering in real-time with AI diagnostic tools.</p>
            </div>
            <span className="text-[10px] font-mono bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 px-3 py-1.5 rounded-full border border-indigo-150">ALT+SHIFT+D TO CLOSE</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Input Fields / Textarea */}
            <div className="lg:col-span-7 space-y-6">
              <div>
                <label className="block text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider mb-2">Notebook Title</label>
                <input
                  type="text"
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-900 focus:border-indigo-550 border border-transparent dark:border-slate-800 rounded-xl px-4 py-2.5 font-bold text-slate-850 dark:text-slate-100"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-xs font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">Notebook Content (HTML / LaTeX)</label>
                  <span className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold font-mono">Use $x$ for inline and $$x$$ for block math</span>
                </div>
                <textarea
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  rows={18}
                  placeholder="Paste or write raw HTML / LaTeX lesson formulas here..."
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-indigo-505 rounded-2xl px-4 py-3 font-mono text-sm leading-relaxed text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-550"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-150 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-5 py-2.5 bg-slate-100 dark:bg-slate-900 text-slate-700 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  Cancel Edits
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdits}
                  className="px-5 py-2.5 bg-indigo-650 hover:bg-indigo-750 text-white rounded-xl font-extrabold text-xs shadow hover:shadow-md transition-all cursor-pointer"
                >
                  Save Changes (Always)
                </button>
              </div>
            </div>
                        {/* Right Column: Live Render & Direct Comparison */}
            <div className="lg:col-span-5 space-y-6 animate-fadeIn">
              
              {/* Dynamic Toolbar with AI Doctor Button */}
              <div className="bg-slate-55 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800/80 rounded-2.5xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <span className="flex-shrink-0 p-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-xl border border-indigo-100/30">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                  </span>
                  <div className="text-left font-sans">
                    <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      AI LaTeX Doctor
                    </h3>
                    {liveEditorLaTeXErrors.length > 0 ? (
                      <span className="text-[11px] font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1.5 mt-0.5">
                        <span className="inline-block w-1.5 h-1.5 bg-rose-600 rounded-full animate-ping"></span>
                        {liveEditorLaTeXErrors.length} Formatting Error{liveEditorLaTeXErrors.length > 1 ? "s" : ""}
                      </span>
                    ) : (
                      <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mt-0.5">
                        Equations Spotless & Healthy
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleFixAllLaTeXLoneInEditor}
                  disabled={isFixingAll}
                  title="Correct all formula and syntax format errors instantly"
                  className={`px-5 py-2.5 text-xs uppercase tracking-wider font-extrabold rounded-xl transition-all shadow hover:shadow-md cursor-pointer flex items-center justify-center gap-2 ${
                    liveEditorLaTeXErrors.length > 0
                      ? 'bg-gradient-to-r from-red-600 to-rose-650 hover:from-red-700 hover:to-rose-750 text-white animate-pulse'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200'
                  }`}
                >
                  {isFixingAll ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>HEALING...</span>
                    </>
                  ) : (
                    <>
                      <Brain className="w-3.5 h-3.5 text-pink-400" />
                      <span>Heal All Formulas</span>
                    </>
                  )}
                </button>
              </div>

              {customRoadmapSuccess && (
                <div className="text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 p-3 rounded-2xl text-left animate-fadeIn">
                  {customRoadmapSuccess}
                </div>
              )}

              {/* 1:1 Clean Note Preview Container */}
              <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl max-h-[700px] overflow-y-auto shadow-md text-left scrollbar-thin scrollbar-thumb-slate-300 dark:scrollbar-thumb-slate-800">
                <style>{`
                  /* Match exactly standard layout folding effects */
                  .juxa-note-container.is-folded > *:not(h1):not(h2):not(h3) {
                    display: none !important;
                  }
                `}</style>
                <div className="border-b border-slate-105 dark:border-slate-800 pb-4 mb-5">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900/60 px-2.5 py-1 rounded font-mono">
                    Direct Live Preview Comparison
                  </span>
                  <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight mt-2 mb-0">
                    {editTitle || "(Untitled Notebook Title)"}
                  </h1>
                </div>

                {/* Notebook Body Content - Live Parser */}
                <NoteViewerErrorBoundary rawHtml={previewProcessedHtml} onHeal={handleFixAllLaTeXLoneInEditor}>
                  <div className={`juxa-note-container prose prose-slate dark:prose-invert max-w-none ${isFolded ? 'is-folded' : ''}`}>
                    {parse(previewProcessedHtml, previewFinalOptions)}
                  </div>
                </NoteViewerErrorBoundary>
              </div>

            </div>

          </div>
        </div>
      </div>
    );
  }

  return (
    <div id="juxa-printable-article" className="d16 bg-white dark:bg-slate-950 transition-all duration-300">
      <style>{`
        .juxa-note-container.is-folded > *:not(h1):not(h2):not(h3) {
          display: none !important;
        }
        .juxa-note-container.is-folded h2 {
          font-size: 1.25rem !important;
          color: #6366f1 !important;
          margin-top: 1.25rem !important;
          margin-bottom: 0.5rem !important;
          border-left: 4px solid #6366f1;
          padding-left: 0.75rem;
          border-bottom: 1px dashed rgba(99, 102, 241, 0.1);
          padding-bottom: 0.5rem;
        }
        .juxa-note-container.is-folded h3 {
          font-size: 1.05rem !important;
          color: #818cf8 !important;
          margin-top: 0.5rem !important;
          margin-bottom: 0.5rem !important;
          padding-left: 1.5rem;
          border-left: 2px solid rgba(129, 140, 248, 0.2);
        }
      `}</style>
      
      <div className="d0 py-12">
        
        {/* Navigation Breadcrumb */}
        <div className="d71 mb-8 no-print">
          <ul className="d72 flex items-center gap-2 text-sm text-slate-500">
            <li className="d73 cursor-pointer select-none">Notes</li>
            <li className="d73">›</li>
            <li className="d116 text-slate-400 capitalize">{subjectId}</li>
            <li className="d73">›</li>
            <li className="d73 text-slate-900 dark:text-slate-100 font-medium">{note.title}</li>
          </ul>
        </div>

        {/* Floating Outline Mode Banner */}
        {isFolded && (
          <div className="no-print bg-indigo-50 border border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-900 rounded-2xl p-4 mb-6 flex items-center justify-between text-indigo-800 dark:text-indigo-300">
            <div className="flex items-center gap-2.5 text-xs font-bold">
              <span className="animate-pulse">📖</span>
              <span>Compact Outline Mode Active (Heading Outline View)</span>
            </div>
            <button 
              onClick={() => setIsFolded(false)} 
              className="text-xs uppercase font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
            >
              Undo Folding (Ctrl+Shift+U)
            </button>
          </div>
        )}

        {/* Dynamic Action Header Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-8 no-print">
          <div className="max-w-xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">Study Notebook Entry</span>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded flex items-center gap-1 border border-indigo-100 dark:border-indigo-900/60">
                <Clock className="w-3 h-3" />
                <span>{estimatedReadingTime} min read</span>
              </span>
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-slate-50 tracking-tight mt-2 mb-0">
              {note.title}
            </h1>
          </div>
          
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsExamMode(true)}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-750 hover:from-indigo-700 hover:to-indigo-850 text-white rounded-xl font-extrabold text-xs tracking-wide shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
              title="Open the rigorous 100 MCQ exam simulator"
            >
              <GraduationCap className="w-4 h-4" />
              <span>100-MCQ Challenge</span>
            </button>
            <button
              onClick={handlePrint}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-850 text-slate-705 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer"
              title="Open standard browser printing tools"
            >
              <Printer className="w-4 h-4" />
              <span>Print Layout</span>
            </button>
            <button
              onClick={handleExportToPdf}
              disabled={exporting}
              type="button"
              className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-850 text-slate-705 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-55 dark:hover:bg-slate-900 rounded-xl font-bold text-xs tracking-wide transition-all cursor-pointer"
              title="Download clean offline document"
            >
              {exporting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Preparing PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-4 h-4" />
                  <span>Export to PDF</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Printable representation of the title (only shown when printed or in exports) */}
        <div className="hidden hide-buttons-canvas:block print:block mb-8 border-b-2 border-slate-900 pb-4">
          <span className="text-xs uppercase tracking-widest text-slate-400 font-bold block mb-1">Scholastic Juxa Notebook</span>
          <h1 className="text-4xl font-black text-slate-900">
            {note.title}
          </h1>
        </div>

        {/* LaTeX syntax / formatting diagnostics doctor */}
        {latexErrors.length > 0 && (
          <div className="no-print bg-rose-50/80 border border-rose-150 dark:bg-rose-950/20 dark:border-rose-900/40 rounded-3xl p-5 mb-8 flex flex-col md:flex-row items-center justify-between gap-5 relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/5 rounded-full blur-2xl"></div>
            <div className="flex items-start gap-3.5 relative z-10">
              <div className="p-3 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl flex-shrink-0 animate-pulse">
                <Brain className="w-5.5 h-5.5" />
              </div>
              <div className="text-left">
                <span className="text-[9px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2.5 py-0.5 rounded-full font-mono">
                  Diagnostics Engine
                </span>
                <h4 className="text-base font-extrabold text-rose-950 dark:text-rose-200 tracking-tight mt-1 mb-0.5">
                  LaTeX Syntax Anomalies Found
                </h4>
                <p className="text-xs text-rose-700/80 dark:text-rose-400 mt-1 max-w-xl leading-relaxed">
                  We scanned this lesson note and found exactly <strong className="font-extrabold text-rose-950 dark:text-rose-200">{latexErrors.length} formatting error{latexErrors.length > 1 ? "s" : ""}</strong> that will corrupt mathematical rendering. You can easily fix them all automatically using AI.
                </p>
                
                {/* Lists of detected locations inside tooltip or tiny logs */}
                <div className="flex flex-wrap gap-2 mt-2.5">
                  {latexErrors.slice(0, 4).map((err, errIdx) => (
                    <span key={errIdx} className="text-[9px] font-mono font-medium bg-rose-950/10 dark:bg-rose-950/40 text-rose-750 dark:text-rose-450 border border-rose-500/10 px-2 py-0.5 rounded">
                      {err.location}: <code className="font-black bg-rose-950/5 px-1 py-0.5 text-rose-600 dark:text-rose-300">{err.math.slice(0, 15)}{err.math.length > 15 ? "..." : ""}</code>
                    </span>
                  ))}
                  {latexErrors.length > 4 && (
                    <span className="text-[9px] font-mono font-medium text-rose-500 select-none">
                      + {latexErrors.length - 4} more anomalies
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2.5 w-full md:w-auto flex-shrink-0 relative z-10">
              <button
                type="button"
                onClick={handleFixAllLaTeX}
                disabled={isFixingAll}
                className="w-full md:w-auto px-5 py-3 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:text-slate-450 text-white font-extrabold text-xs uppercase tracking-wider rounded-2xl shadow hover:shadow-md cursor-pointer transition-all active:scale-[98%] flex items-center justify-center gap-2 whitespace-nowrap"
              >
                {isFixingAll ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>AI Healing Document...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-rose-300 animate-pulse" />
                    <span>AI Heal All Formulas</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Notebook Body Content */}
        <NoteViewerErrorBoundary rawHtml={processedHtml} onHeal={handleFixAllLaTeX}>
          <div className={`juxa-note-container prose prose-slate dark:prose-invert max-w-none ${isFolded ? 'is-folded' : ''}`}>
            {parse(processedHtml, finalOptions)}
          </div>
        </NoteViewerErrorBoundary>

        {/* 100 MCQ Mastery Challenge grand banner at bottom */}
        <div className="mt-16 p-8 bg-slate-900 border border-slate-800 rounded-3xl relative overflow-hidden text-center max-w-4xl mx-auto no-print shadow-xl">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl"></div>
          <GraduationCap className="w-12 h-12 text-indigo-400 mx-auto mb-4 animate-pulse relative z-10" />
          <h2 className="text-2xl font-black text-white tracking-tight relative z-10">The Ultimate 100-MCQ Mastery Exam</h2>
          <p className="text-slate-400 text-sm mt-2 max-w-xl mx-auto leading-relaxed relative z-10">
            Ready to test your limits? Push your comprehension with 100 masterfully curated, highly rigorous, and mathematically exact logical questions designed by Gemini AI.
          </p>
          <button
            onClick={() => setIsExamMode(true)}
            className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-550 to-pink-550 hover:from-indigo-650 hover:to-pink-650 text-white font-extrabold text-sm rounded-2xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all cursor-pointer inline-flex items-center gap-2 relative z-10"
          >
            <Trophy className="w-4 h-4 text-amber-305" />
            <span>Launch Exam Arena</span>
          </button>
        </div>

      </div>
    </div>
  );
};

function getTextFromNode(node: any): string {
  if (node.type === 'text') return node.data;
  if (!node.children) return '';
  return node.children.map(getTextFromNode).join('');
}
