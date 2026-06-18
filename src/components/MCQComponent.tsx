import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { MCQ } from '../services/geminiService';
import { cn } from '../lib/utils';

interface MCQComponentProps {
  mcq: MCQ;
}

export const MCQComponent: React.FC<MCQComponentProps> = ({ mcq }) => {
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleOptionClick = (index: number) => {
    if (selectedOption !== null) return;
    setSelectedOption(index);
    setShowExplanation(true);
  };

  const isCorrect = selectedOption === mcq.correctAnswerIndex;

  return (
    <div className="mcq-container my-8 p-6 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm" id={`mcq-${mcq.id}`}>
      <h3 className="mcq-question text-lg font-semibold mb-4 text-slate-800 dark:text-slate-100">
        {mcq.question}
      </h3>
      <div className="space-y-3">
        {mcq.options.map((option, index) => {
          const isSelected = selectedOption === index;
          const isCorrectOption = index === mcq.correctAnswerIndex;
          
          let optionClass = "mcq-option w-full text-left p-4 rounded-lg border transition-all duration-200 bg-white hover:bg-slate-50 border-slate-200 dark:bg-slate-850 dark:border-slate-750 dark:hover:bg-slate-800 dark:text-slate-200";
          
          if (selectedOption !== null) {
            if (isCorrectOption) {
              optionClass = "mcq-option correct w-full text-left p-4 rounded-lg border bg-green-50 dark:bg-emerald-950/40 border-green-500 dark:border-emerald-600 text-green-700 dark:text-emerald-300 font-medium";
            } else if (isSelected && !isCorrectOption) {
              optionClass = "mcq-option incorrect w-full text-left p-4 rounded-lg border bg-red-50 dark:bg-rose-950/40 border-red-500 dark:border-rose-600 text-red-700 dark:text-rose-300";
            } else {
              optionClass = "mcq-option w-full text-left p-4 rounded-lg border bg-white dark:bg-slate-850 border-slate-200 dark:border-slate-750 opacity-40 dark:text-slate-400";
            }
          }

          return (
            <button
              key={index}
              onClick={() => handleOptionClick(index)}
              disabled={selectedOption !== null}
              className={optionClass}
            >
              <div className="flex items-center justify-between">
                <span>{option}</span>
                {selectedOption !== null && isCorrectOption && (
                  <CheckCircle2 className="w-5 h-5 text-green-650 dark:text-emerald-400" />
                )}
                {selectedOption !== null && isSelected && !isCorrectOption && (
                  <XCircle className="w-5 h-5 text-red-650 dark:text-rose-450" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {showExplanation && (
        <div className={cn(
          "mt-6 p-4 rounded-lg border animate-in fade-in slide-in-from-top-2 duration-300",
          isCorrect 
            ? "bg-green-50 dark:bg-emerald-950/20 text-green-800 dark:text-emerald-300 border-green-200 dark:border-emerald-800/40" 
            : "bg-red-50 dark:bg-rose-950/20 text-red-800 dark:text-rose-300 border-red-200 dark:border-rose-800/40"
        )}>
          <p className="font-extrabold mb-1">{isCorrect ? "Correct!" : "Incorrect"}</p>
          <p className="text-sm opacity-90 leading-relaxed">{mcq.explanation}</p>
        </div>
      )}
    </div>
  );
};
