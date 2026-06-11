import React, { useState, useEffect } from 'react';
import { 
  X, Check, Key, Search, Sparkles, Brain, Info, AlertCircle, 
  ExternalLink, ArrowRight, Eye, EyeOff, BookOpen, RefreshCw, Cpu
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface ModelSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsSaved?: () => void;
}

export interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
}

const PRESET_MODELS: OpenRouterModel[] = [
  { id: "google/gemini-2.5-pro", name: "Gemini 2.5 Pro", context_length: 2000000, description: "Highly-sophisticated analytical model perfect for complex vector drawings and mathematics." },
  { id: "google/gemini-2.5-flash", name: "Gemini 2.5 Flash", context_length: 1000000, description: "Super fast generation, excellent formatting speed." },
  { id: "deepseek/deepseek-chat", name: "DeepSeek V3", context_length: 64000, description: "High-performance code and logical text formatting." },
  { id: "deepseek/deepseek-r1", name: "DeepSeek R1 (Reasoning)", context_length: 160000, description: "Unmatched scholastic reasoning, perfect for math derivations." },
  { id: "anthropic/claude-3.5-sonnet", name: "Claude 3.5 Sonnet", context_length: 200000, description: "Pristine visual designs and beautifully-written textbook articles." },
  { id: "meta-llama/llama-3.3-70b-instruct", name: "Llama 3.3 70B", context_length: 128000, description: "Versatile open-source standard for diverse learning tasks." },
  { id: "openai/gpt-4o-mini", name: "GPT-4o Mini", context_length: 128000, description: "Balanced performance, ideal for rapid general note summaries." }
];

export const ModelSettingsModal: React.FC<ModelSettingsModalProps> = ({ 
  isOpen, 
  onClose,
  onSettingsSaved
}) => {
  const [source, setSource] = useState<"builtin" | "openrouter">("builtin");
  const [apiKey, setApiKey] = useState("");
  const [selectedModel, setSelectedModel] = useState("google/gemini-2.5-pro");
  const [showKey, setShowKey] = useState(false);
  
  // OpenRouter models state
  const [allModels, setAllModels] = useState<OpenRouterModel[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [fetchingModels, setFetchingModels] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    // Load config from LocalStorage on mount/open
    if (isOpen) {
      const savedSource = localStorage.getItem("juxa_api_source") as "builtin" | "openrouter" || "builtin";
      const savedKey = localStorage.getItem("juxa_openrouter_key") || "";
      const savedModel = localStorage.getItem("juxa_openrouter_model") || "google/gemini-2.5-pro";

      setSource(savedSource);
      setApiKey(savedKey);
      setSelectedModel(savedModel);

      // Fetch dynamic models list from OpenRouter API (public endpoint)
      fetchOpenRouterModels();
    }
  }, [isOpen]);

  const fetchOpenRouterModels = async () => {
    setFetchingModels(true);
    setFetchError(null);
    try {
      const res = await fetch("https://openrouter.ai/api/v1/models");
      if (!res.ok) {
        throw new Error("Failed to contact OpenRouter model catalog router.");
      }
      const data = await res.json();
      if (data && Array.isArray(data.data)) {
        // Map elements to standard structure
        const mapped: OpenRouterModel[] = data.data.map((m: any) => ({
          id: m.id,
          name: m.name || m.id,
          description: m.description,
          context_length: m.context_length
        }));
        setAllModels(mapped);
      }
    } catch (err: any) {
      console.warn("Could not retrieve dynamic OpenRouter models list:", err);
      setFetchError("Unable to fetch complete live catalog. Falling back to presets.");
    } finally {
      setFetchingModels(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem("juxa_api_source", source);
    localStorage.setItem("juxa_openrouter_key", apiKey.trim());
    localStorage.setItem("juxa_openrouter_model", selectedModel);
    
    if (onSettingsSaved) {
      onSettingsSaved();
    }
    onClose();
  };

  // Combine live models and presets in a clean way (de-duplicate presets)
  const displayedModels = (() => {
    let sourceList = allModels.length > 0 ? allModels : PRESET_MODELS;
    
    // If not matching search, we still display presets + matched search
    if (!searchQuery.trim()) {
      // Return combination where presets are at the top, followed by other models if we have them
      const combined = [...PRESET_MODELS];
      sourceList.forEach(m => {
        if (!combined.some(preset => preset.id === m.id)) {
          combined.push(m);
        }
      });
      return combined;
    }

    const query = searchQuery.toLowerCase();
    return sourceList.filter(m => 
      m.name.toLowerCase().includes(query) || 
      m.id.toLowerCase().includes(query) ||
      (m.description && m.description.toLowerCase().includes(query))
    );
  })();

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay background with slight dark tint and blur */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal Container */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", damping: 30, stiffness: 350 }}
            className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden z-10 flex flex-col max-h-[85vh]"
          >
            {/* Header of Modal */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-inner">
                  <Brain className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-800 text-base">Model Customization Console</h3>
                  <p className="text-xs text-slate-400 font-medium leading-tight">Configure elite models & custom API triggers</p>
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                title="Discard configuration"
              >
                <X className="w-4.5 h-4.5" />
              </button>
            </div>

            {/* Scrollable Form Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Selector Option: Builtin vs OpenRouter */}
              <div className="space-y-2">
                <label className="block text-xs font-black uppercase tracking-wider text-slate-400">Select Processing Engine Source</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  
                  {/* Built-in choice */}
                  <div 
                    onClick={() => setSource("builtin")}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all duration-200",
                      source === "builtin" 
                        ? "border-indigo-600 bg-indigo-50/10 ring-2 ring-indigo-600/5 shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-350"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className={cn("w-4 h-4", source === "builtin" ? "text-indigo-600" : "text-slate-400")} />
                        <span className="font-bold text-sm text-slate-800">Gemini (Default)</span>
                      </div>
                      {source === "builtin" && (
                        <div className="w-4.5 h-4.5 rounded-full bg-indigo-650 flex items-center justify-center text-white">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-450 mt-2.5 leading-relaxed">
                      Instant cloud processing via Juxa's default Gemini 1.5/3.1 architecture. Zero configuration needed.
                    </p>
                  </div>

                  {/* OpenRouter choice */}
                  <div 
                    onClick={() => setSource("openrouter")}
                    className={cn(
                      "p-4 rounded-2xl border cursor-pointer flex flex-col justify-between transition-all duration-200",
                      source === "openrouter" 
                        ? "border-indigo-650 bg-indigo-50/10 ring-2 ring-indigo-650/5 shadow-md"
                        : "border-slate-200 bg-white hover:border-slate-350"
                    )}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <BookOpen className={cn("w-4 h-4", source === "openrouter" ? "text-indigo-600" : "text-slate-400")} />
                        <span className="font-bold text-sm text-slate-800">OpenRouter</span>
                      </div>
                      {source === "openrouter" && (
                        <div className="w-4.5 h-4.5 rounded-full bg-indigo-650 flex items-center justify-center text-white">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-450 mt-2.5 leading-relaxed">
                      Custom cloud pipeline. Select DeepSeek, Llama, Claude, or GPT models directly in client-side runtime.
                    </p>
                  </div>

                </div>
              </div>

              {/* Conditional options for OpenRouter API */}
              <AnimatePresence mode="wait">
                {source === "openrouter" && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="space-y-6 overflow-hidden pt-1"
                  >
                    {/* API Key Enter Area */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                          <Key className="w-3.5 h-3.5 text-slate-400" />
                          <span>OpenRouter API Key</span>
                        </label>
                        <a 
                          href="https://openrouter.ai/keys" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[11px] text-indigo-600 hover:underline flex items-center gap-1 font-semibold"
                        >
                          <span>Get Key</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>

                      <div className="relative">
                        <input 
                          type={showKey ? "text" : "password"} 
                          placeholder="sk-or-v1-..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100 rounded-xl transition-all outline-none text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => setShowKey(!showKey)}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-450 hover:text-slate-600 p-1"
                        >
                          {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400">
                        🔑 Your API Key remains strictly local of client-side storage, bypassing custom database caching.
                      </p>
                    </div>

                    {/* Model Browser / Search Portal */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-black uppercase tracking-wider text-slate-400">Search & Choose Model ID</label>
                        {fetchingModels && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 animate-pulse">
                            <RefreshCw className="w-3 h-3 animate-spin text-indigo-500" />
                            Catalog synchronizing...
                          </span>
                        )}
                      </div>

                      {/* Searching Input */}
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
                        <input
                          type="text"
                          placeholder="Search e.g. claude-3.5, deepseek-r1, llama-3.3..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 focus:border-indigo-450 focus:ring-2 focus:ring-indigo-100 rounded-xl outline-none text-xs"
                        />
                      </div>

                      {/* Models List viewport */}
                      <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[190px] overflow-y-auto bg-slate-50/35">
                        
                        {displayedModels.length === 0 ? (
                          <div className="text-center py-8 text-xs text-slate-400">
                            🔍 No parameters matched. Insert a completely custom ID below?
                          </div>
                        ) : (
                          displayedModels.map((m) => {
                            const isSelected = selectedModel === m.id;
                            return (
                              <div
                                key={m.id}
                                onClick={() => setSelectedModel(m.id)}
                                className={cn(
                                  "p-3 border-b border-slate-100 last:border-0 cursor-pointer hover:bg-indigo-50/15 flex items-start justify-between gap-3 transition-colors",
                                  isSelected ? "bg-indigo-50/20" : "bg-white"
                                )}
                              >
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className={cn(
                                      "font-bold text-xs",
                                      isSelected ? "text-indigo-700 font-extrabold" : "text-slate-800"
                                    )}>
                                      {m.name}
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                                      {m.id}
                                    </span>
                                  </div>
                                  
                                  {m.description && (
                                    <p className="text-[10px] text-slate-400 leading-normal mt-0.5 mt-1 truncate max-w-lg">
                                      {m.description}
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 flex-shrink-0">
                                  {m.context_length && (
                                    <span className="text-[9px] text-slate-400 font-medium">
                                      {(m.context_length / 1000).toFixed(0)}kctx
                                    </span>
                                  )}
                                  <div className={cn(
                                    "w-4 h-4 rounded-full border flex items-center justify-center transition-all",
                                    isSelected 
                                      ? "border-indigo-600 bg-indigo-650 text-white" 
                                      : "border-slate-300"
                                  )}>
                                    {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}

                      </div>

                      {/* Manual/Custom Model Input */}
                      <div className="p-4 bg-slate-50 border border-slate-205 rounded-xl space-y-2">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                          <Info className="w-3.5 h-3.5 text-indigo-500" />
                          <span>Use a Custom Model ID?</span>
                        </div>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          If you want a model not matched in search list, enter its official identifier code manually (e.g. <code>mistralai/mistral-large-2411</code>):
                        </p>
                        <input
                          type="text"
                          placeholder="custom-org/custom-model-identifier"
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="w-full px-3 py-2 bg-white border border-slate-200 focus:border-indigo-400 outline-none rounded-lg text-xs font-mono"
                        />
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

            </div>

            {/* Bottom Actions footer */}
            <div className="p-6 bg-slate-50/90 border-t border-slate-100 flex items-center justify-end gap-3">
              <button 
                type="button" 
                onClick={onClose}
                className="px-5 py-2.5 text-xs font-bold text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              >
                Cancel
              </button>
              
              <button
                type="button"
                onClick={handleSave}
                className="px-6 py-2.5 bg-indigo-650 text-white font-bold text-xs uppercase tracking-wider rounded-xl hover:bg-indigo-700 shadow-md transition-all flex items-center gap-1.5"
              >
                <span>Apply & Save Config</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
