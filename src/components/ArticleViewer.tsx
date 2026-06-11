import React, { useState, useEffect } from 'react';
import parse, { HTMLReactParserOptions, Element } from 'html-react-parser';
import { InlineMath, BlockMath } from 'react-katex';
import { MCQComponent } from './MCQComponent';
import { EnhancedNote, generateExamQuestions, MCQ } from '../services/geminiService';
import { SYLLABUS } from '../data/syllabus';
import { 
  Printer, FileDown, RefreshCw, GraduationCap, Award, 
  ChevronRight, ArrowLeft, Brain, Check, X, CheckSquare, 
  Play, BookOpen, AlertCircle, HelpCircle, Trophy, BarChart2,
  ChevronLeft, FastForward
} from 'lucide-react';

interface ArticleViewerProps {
  note: EnhancedNote;
}

const EXAM_SECTIONS = [
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

export const ArticleViewer: React.FC<ArticleViewerProps> = ({ note }) => {
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

  // Load persistent progress on note change
  useEffect(() => {
    const storageKey = `juxa_exam_v2_${note.title}`;
    const savedData = localStorage.getItem(storageKey);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        setSectionQuestions(parsed.questions || {});
        setSectionScores(parsed.scores || {});
        setAnswers(parsed.answers || {});
      } catch (e) {
        console.error("Failed to load saved progress:", e);
      }
    } else {
      setSectionQuestions({});
      setSectionScores({});
      setAnswers({});
    }
    // Reset view states
    setIsExamMode(false);
    setActiveSection(null);
    setErrorMessage(null);
  }, [note.title]);

  const saveProgress = (
    newQuestions: { [key: number]: MCQ[] },
    newScores: { [key: number]: { correct: number, completed: boolean } },
    newAnswers: { [key: number]: { [key: number]: { selectedIndex: number, isChecked: boolean, isCorrect: boolean } } }
  ) => {
    const storageKey = `juxa_exam_v2_${note.title}`;
    localStorage.setItem(storageKey, JSON.stringify({
      questions: newQuestions,
      scores: newScores,
      answers: newAnswers
    }));
  };

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
    if (sectionQuestions[sectionNum] && sectionQuestions[sectionNum].length === 10) {
      setActiveSection(sectionNum);
      setCurrentQuestionIdx(0);
      return;
    }

    setLoadingSection(sectionNum);
    try {
      const generated = await generateExamQuestions(note.title, note.htmlContent, sectionNum, sectionTitle);
      if (generated && generated.length === 10) {
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

  // Math-Logic / LaTeX parsing inside the questions and answers text
  const parseLaTeXText = (text: string) => {
    if (!text) return "";
    const parts = text.split(/(\$[^\$]+\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        const math = part.slice(1, -1);
        return <span key={index} className="inline-block mx-0.5 font-semibold text-indigo-600 dark:text-indigo-400 font-sans"><InlineMath math={math} /></span>;
      }
      return part;
    });
  };

  // Convert special interactive markers back to placeholder nodes
  let processedHtml = note.htmlContent.replace(/\[\[MCQ:([\w-]+)\]\]/g, '<mcq-placeholder data-id="$1"></mcq-placeholder>');

  const finalOptions: HTMLReactParserOptions = {
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
            return (
              <div className="d101 flex justify-center py-4 text-center">
                <BlockMath math={textContent.trim()} />
              </div>
            );
          }
        }

        if (domNode.attribs && domNode.attribs.class && domNode.attribs.class.includes('katex')) {
          const textContent = getTextFromNode(domNode);
          if (textContent.trim()) {
            return (
              <span className="katex mx-1">
                <InlineMath math={textContent.trim()} />
              </span>
            );
          }
        }
      }
    }
  };

  // Exam global metrics
  const scoreValues = Object.values(sectionScores) as { correct: number; completed: boolean }[];
  const totalCompletedQuestions = scoreValues.filter(s => s.completed).length * 10;
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
                    <Trophy className="w-10 h-10 text-yellow-450 animate-bounce" />
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
                    {EXAM_SECTIONS.map((sec) => {
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
                {EXAM_SECTIONS.map((sec) => {
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
                              <span>{score.correct} / 10 CORRECT</span>
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
                          Rigorous {sec.num * 10 - 9}–{sec.num * 10} syllabus milestone questions authoring mathematical complexity testing.
                        </p>
                      </div>

                      <div className="mt-6 pt-4 border-t border-slate-105/60 dark:border-slate-800 flex items-center justify-between">
                        {score?.completed ? (
                          <div className="text-[11px] font-bold text-slate-550 font-mono">
                            Accuracy Rate: <span className={score.correct >= 8 ? 'text-emerald-600' : score.correct >= 5 ? 'text-amber-600' : 'text-rose-600'}>{score.correct * 10}%</span>
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
                    Section {activeSection}: {EXAM_SECTIONS.find(s => s.num === activeSection)?.title}
                  </h4>
                </div>

                <div className="flex gap-4 items-center">
                  <div className="text-center bg-slate-850 border border-slate-800 px-3.5 py-1.5 rounded-xl">
                    <span className="block text-[8px] text-slate-400 font-bold uppercase">QUESTION PROGRESS</span>
                    <span className="text-sm font-black text-indigo-400">{currentQuestionIdx + 1} / 10</span>
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
                {Array.from({ length: 10 }).map((_, i) => {
                  const state = answers[activeSection]?.[i];
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
                  <span className="text-[10px] font-black uppercase tracking-wider font-mono text-slate-400">Question {currentQuestionIdx + 1} of 10</span>
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

                    {currentQuestionIdx < 9 ? (
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
  return (
    <div id="juxa-printable-article" className="d16 bg-white dark:bg-slate-950 transition-all duration-300">
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

        {/* Dynamic Action Header Panel */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-6 mb-8 no-print">
          <div className="max-w-xl">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 dark:bg-slate-900 px-2 py-1 rounded">Study Notebook Entry</span>
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

        {/* Notebook Body Content */}
        <div className="juxa-note-container prose prose-slate dark:prose-invert max-w-none">
          {parse(processedHtml, finalOptions)}
        </div>

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
