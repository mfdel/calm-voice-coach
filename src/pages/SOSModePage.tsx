import { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Send, Loader2, PenLine, Mic, MicOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useChildProfiles, useRedLines, useParentingPreferences } from "@/hooks/useProfile";
import { PROBLEM_CATEGORIES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

type Step = "pick_problem" | "add_note" | "loading" | "result";

interface SOSResponse {
  incident_id: string;
  summary: string;
  suggestions: Array<{title: string;reason: string;script: string;}>;
  safety_note: string | null;
  latency_ms: number;
}

interface CuratedCategory {
  code: string;
  label: string;
  emoji: string;
}

const DEFAULT_CATEGORIES: CuratedCategory[] = [
{ code: "bedtime_resistance", label: "Bedtime resistance", emoji: "🌙" },
{ code: "meal_refusal", label: "Won't eat / food refusal", emoji: "🍽️" },
{ code: "transition_meltdown", label: "Transition meltdown", emoji: "🔄" },
{ code: "hitting_aggression", label: "Hitting / aggression", emoji: "✋" }];


export default function SOSModePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { data: children } = useChildProfiles();
  const { data: redLines } = useRedLines();
  const { data: prefs } = useParentingPreferences();

  const [step, setStep] = useState<Step>("pick_problem");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [freeText, setFreeText] = useState("");
  const [showFreeText, setShowFreeText] = useState(false);
  const [response, setResponse] = useState<SOSResponse | null>(null);
  const [responseStep, setResponseStep] = useState(0);
  const [curatedCategories, setCuratedCategories] = useState<CuratedCategory[]>(DEFAULT_CATEGORIES);

  // Voice note state
  const [isRecording, setIsRecording] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(false);
  const recognitionRef = useRef<any>(null);

  const activeChildId = selectedChild || children?.[0]?.id;

  // Check for Web Speech API support
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    setVoiceSupported(!!SpeechRecognition);
  }, []);

  // Fetch curated categories
  useEffect(() => {
    if (!user || !activeChildId) return;
    const fetchCurated = async () => {
      const { data } = await supabase.
      from("curated_categories").
      select("categories").
      eq("user_id", user.id).
      eq("child_id", activeChildId).
      maybeSingle();
      if (data?.categories && Array.isArray(data.categories) && data.categories.length > 0) {
        setCuratedCategories(data.categories as unknown as CuratedCategory[]);
      } else {
        setCuratedCategories(DEFAULT_CATEGORIES);
      }
    };
    fetchCurated();
  }, [user, activeChildId]);

  const startVoiceNote = useCallback(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast({ title: "Voice unavailable", description: "Your browser doesn't support speech recognition. Use text instead.", variant: "destructive" });
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let transcript = "";
      for (let i = 0; i < event.results.length; i++) {
        transcript += event.results[i][0].transcript;
      }
      setNoteText(transcript);
    };
    recognition.onerror = (event: any) => {
      console.error("Speech error:", event.error);
      setIsRecording(false);
      if (event.error === "not-allowed") {
        toast({ title: "Microphone blocked", description: "Allow microphone access in your browser settings.", variant: "destructive" });
      } else {
        toast({ title: "Voice input failed", description: "Couldn't capture audio. Try typing instead.", variant: "destructive" });
      }
    };
    recognition.onend = () => setIsRecording(false);

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  }, [toast]);

  const stopVoiceNote = useCallback(() => {
    recognitionRef.current?.stop();
    setIsRecording(false);
  }, []);

  const handleSelectProblem = (code: string) => {
    setSelectedCategory(code);
    setStep("add_note");
  };

  const handleFreeTextSubmit = () => {
    if (!freeText.trim()) return;
    setSelectedCategory("other");
    setNoteText(freeText.trim());
    setStep("add_note");
  };

  const handleSend = useCallback(async () => {
    const category = selectedCategory === "other" ? "other" : selectedCategory;
    if (!category) return;
    setStep("loading");

    const child = children?.find((c: any) => c.id === activeChildId) || children?.[0];
    const childSnapshot = child ? {
      age_group: child.age_group,
      known_triggers: child.known_triggers || [],
      calming_preferences: child.calming_preferences || []
    } : undefined;

    const parentingSnapshot = {
      style: prefs?.style || "gentle",
      values: prefs?.parenting_values || ["connection", "clear_boundaries"],
      red_lines: redLines?.map((r: any) => r.code) || []
    };

    try {
      const { data, error } = await supabase.functions.invoke("sos-respond", {
        body: {
          problem_category: category,
          note_text: noteText || null,
          input_mode: noteText ? "voice_plus_text" : "text",
          child_id: child?.id || null,
          child_snapshot: childSnapshot,
          parenting_snapshot: parentingSnapshot
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      setResponse(data);
      setResponseStep(0);
      setStep("result");
    } catch (e: any) {
      toast({ title: "Something went wrong", description: e.message, variant: "destructive" });
      setStep("add_note");
    }
  }, [selectedCategory, noteText, children, activeChildId, redLines, prefs, toast]);

  const handleExit = () => navigate("/");

  // ─── Problem picker ───
  if (step === "pick_problem") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-sos-bg safe-top safe-bottom overflow-auto">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="sos-ambient-blob absolute -top-32 -left-32 h-80 w-80 rounded-full bg-sos-accent/10 blur-3xl" />
          <div className="sos-ambient-blob absolute -bottom-40 -right-20 h-96 w-96 rounded-full bg-[hsl(var(--sos-warm)/0.08)] blur-3xl" style={{ animationDelay: "3s" }} />
        </div>

        <div className="relative flex items-center justify-between px-6 pt-4">
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4 }} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-sos-accent sos-glow" />
            <span className="font-body text-xs font-semibold uppercase tracking-widest text-sos-fg/50">SOS Mode</span>
          </motion.div>
          <button onClick={handleExit} className="flex h-10 w-10 items-center justify-center rounded-full bg-sos-fg/5 backdrop-blur-sm text-sos-fg/60 hover:text-sos-fg/80 transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="relative px-6 pt-8 pb-2">
          <h2 className="font-display text-3xl font-extrabold tracking-tight text-sos-fg">What's happening?</h2>
          <p className="mt-2 font-body text-sm text-sos-fg/40">Tap the closest match</p>
        </motion.div>

        {children && children.length > 1 &&
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="pb-5 overflow-x-auto items-end justify-end flex flex-row px-[24px] gap-[8px]">
            {children.map((c: any) =>
          <button
            key={c.id}
            onClick={() => setSelectedChild(c.id)}
            className={`shrink-0 rounded-full px-5 py-2.5 font-body text-base font-semibold transition-all duration-200 ${
            activeChildId === c.id ? "bg-sos-accent text-sos-fg shadow-lg shadow-sos-accent/20" : "bg-sos-fg/5 text-sos-fg/50 backdrop-blur-sm"}`
            }>
            
                {c.display_name}
              </button>
          )}
          </motion.div>
        }

        <div className="relative grid grid-cols-2 gap-3 px-6">
          {curatedCategories.slice(0, 4).map((cat, i) =>
          <motion.button
            key={cat.code}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.15 + i * 0.08, ease: [0.25, 0.46, 0.45, 0.94] }}
            onClick={() => handleSelectProblem(cat.code)}
            className="sos-card-hover group flex flex-col items-start gap-3 rounded-3xl p-5 text-left active:scale-[0.96] transition-transform">
            
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sos-fg/5 text-2xl group-active:bg-sos-accent/20 transition-colors">{cat.emoji}</span>
              <span className="font-display text-[15px] font-bold leading-snug text-sos-fg">{cat.label}</span>
            </motion.button>
          )}
        </div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.5 }} className="px-6 pt-5 pb-32">
          {!showFreeText ?
          <button onClick={() => setShowFreeText(true)} className="sos-card-hover group flex w-full items-center gap-4 rounded-3xl p-5 text-left active:scale-[0.97] transition-transform">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-sos-fg/5 group-active:bg-sos-accent/20 transition-colors">
                <PenLine className="h-5 w-5 text-sos-fg/40" />
              </span>
              <span className="font-display text-[15px] font-bold text-sos-fg/70">Something else…</span>
            </button> :

          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} transition={{ duration: 0.3 }} className="space-y-3">
              <textarea
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder="Describe what's happening…"
              maxLength={500}
              rows={3}
              autoFocus
              className="w-full rounded-2xl bg-sos-fg/5 border border-sos-fg/8 p-4 font-body text-sm text-sos-fg placeholder:text-sos-fg/25 outline-none resize-none focus:border-sos-accent/30 transition-colors" />
            
              <button
              onClick={handleFreeTextSubmit}
              disabled={!freeText.trim()}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-full bg-sos-accent font-display text-sm font-bold text-sos-fg disabled:opacity-30 active:scale-95 transition-transform shadow-lg shadow-sos-accent/20">
              
                <Send className="h-4 w-4" />
                Get help
              </button>
            </motion.div>
          }
        </motion.div>
      </div>);

  }

  // ─── Note input with voice ───
  if (step === "add_note") {
    const catObj = PROBLEM_CATEGORIES.find((c) => c.code === selectedCategory);
    const catLabel = catObj?.label || (selectedCategory === "other" ? "Other situation" : selectedCategory);
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-sos-bg safe-top safe-bottom">
        <div className="flex items-center justify-between px-6 pt-4">
          <button onClick={() => {setStep("pick_problem");setShowFreeText(false);}} className="font-body text-sm text-sos-fg/60">← Back</button>
          <button onClick={handleExit} className="flex h-10 w-10 items-center justify-center rounded-full bg-sos-muted text-sos-fg/80">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col px-6 pt-6">
          <p className="rounded-full bg-sos-muted px-4 py-1.5 self-start font-body text-sm text-sos-fg/70 mb-4">{catLabel}</p>
          <h2 className="font-display text-xl font-extrabold text-sos-fg mb-2">Any quick details?</h2>
          <p className="font-body text-sm text-sos-fg/50 mb-6">Optional — type or use voice</p>

          <div className="relative">
            <textarea
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="E.g. Skipped nap and screaming about pajamas…"
              maxLength={500}
              rows={4}
              className="w-full rounded-2xl bg-sos-muted p-4 pr-14 font-body text-sm text-sos-fg placeholder:text-sos-fg/30 outline-none resize-none" />
            
            {voiceSupported &&
            <button
              onClick={isRecording ? stopVoiceNote : startVoiceNote}
              className={`absolute right-3 top-3 flex h-10 w-10 items-center justify-center rounded-full transition-colors ${
              isRecording ?
              "bg-destructive text-destructive-foreground animate-pulse" :
              "bg-sos-fg/10 text-sos-fg/50 active:bg-sos-accent/20"}`
              }>
              
                {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </button>
            }
          </div>
          {isRecording &&
          <p className="mt-2 font-body text-xs text-sos-accent animate-pulse">Listening… tap mic to stop</p>
          }
          {!voiceSupported &&
          <p className="mt-2 font-body text-xs text-sos-fg/30">Voice input not available on this device</p>
          }
        </div>

        <div className="flex flex-col gap-3 px-6 pb-8">
          <button
            onClick={handleSend}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-sos-accent font-display text-base font-bold text-sos-fg active:scale-95 transition-transform">
            
            <Send className="h-5 w-5" />
            Get guidance
          </button>
          <button
            onClick={() => {setNoteText("");handleSend();}}
            className="font-body text-sm text-sos-fg/40 text-center">
            
            Skip — just get help
          </button>
        </div>
      </div>);

  }

  // ─── Loading ───
  if (step === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sos-bg safe-top safe-bottom">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="h-4 w-4 rounded-full bg-sos-accent mb-6" />
        
        <Loader2 className="h-8 w-8 text-sos-accent animate-spin mb-4" />
        <p className="font-display text-lg font-bold text-sos-fg">Getting personalized guidance…</p>
        <p className="font-body text-sm text-sos-fg/40 mt-2">Breathe with the pulse</p>
      </div>);

  }

  // ─── Result — PRD format: summary → actions with ONE prominent script ───
  if (step === "result" && response) {
    const suggestions = response.suggestions || [];
    // Best script = first suggestion's script
    const bestScript = suggestions[0]?.script;

    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-sos-bg safe-top safe-bottom overflow-auto">
        <div className="flex items-center justify-between px-6 pt-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-sos-accent sos-glow" />
            <span className="font-body text-xs font-medium text-sos-fg/60">
              {response.latency_ms ? `${(response.latency_ms / 1000).toFixed(1)}s` : "GUIDANCE"}
            </span>
          </div>
          <button onClick={handleExit} className="flex h-10 w-10 items-center justify-center rounded-full bg-sos-muted text-sos-fg/80">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col px-6 pt-6 pb-8 space-y-6">
          {/* Summary */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="font-display text-2xl font-extrabold leading-tight tracking-tight text-sos-fg">
            
            {response.summary}
          </motion.p>

          {/* Prominent script — SAY THIS */}
          {bestScript &&
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="rounded-3xl bg-sos-accent/10 border border-sos-accent/20 p-6">
            
              <p className="font-body text-xs font-semibold uppercase tracking-widest text-sos-accent mb-3">Say this</p>
              <p className="font-display text-2xl font-bold text-sos-fg leading-relaxed">
                "{bestScript}"
              </p>
            </motion.div>
          }

          {/* Action cards */}
          <div className="space-y-3">
            {suggestions.map((s, i) =>
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
              className="rounded-2xl bg-sos-muted p-4">
              
                <p className="font-display text-sm font-bold text-sos-fg">{s.title}</p>
                <p className="font-body text-xs text-sos-fg/50 mt-1">{s.reason}</p>
              </motion.div>
            )}
          </div>

          {/* Safety note */}
          {response.safety_note &&
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="rounded-2xl bg-destructive/10 border border-destructive/20 p-4">
            
              <p className="font-body text-sm text-destructive">{response.safety_note}</p>
            </motion.div>
          }
        </div>

        {/* Bottom action */}
        <div className="flex flex-col items-center gap-4 px-6 pb-8">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="h-3 w-3 rounded-full bg-sos-accent" />
          
          <button
            onClick={handleExit}
            className="flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-sos-muted font-display text-base font-bold text-sos-fg active:scale-95 transition-transform">
            
            Done
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>);

  }

  return null;
}