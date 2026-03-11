import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight, Send, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useChildProfiles, useRedLines, useParentingPreferences } from "@/hooks/useProfile";
import { PROBLEM_CATEGORIES } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

type Step = "pick_problem" | "add_note" | "loading" | "result";

interface SOSResponse {
  incident_id: string;
  summary: string;
  suggestions: Array<{ title: string; reason: string; script: string }>;
  safety_note: string | null;
  latency_ms: number;
}

export default function SOSModePage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: children } = useChildProfiles();
  const { data: redLines } = useRedLines();
  const { data: prefs } = useParentingPreferences();

  const [step, setStep] = useState<Step>("pick_problem");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [noteText, setNoteText] = useState("");
  const [response, setResponse] = useState<SOSResponse | null>(null);
  const [responseStep, setResponseStep] = useState(0);

  const handleSelectProblem = (code: string) => {
    setSelectedCategory(code);
    setStep("add_note");
  };

  const handleSend = useCallback(async () => {
    if (!selectedCategory) return;
    setStep("loading");

    const child = children?.find((c: any) => c.id === selectedChild) || children?.[0];
    const childSnapshot = child ? {
      age_group: child.age_group,
      known_triggers: child.known_triggers || [],
      calming_preferences: child.calming_preferences || [],
    } : undefined;

    const parentingSnapshot = {
      style: prefs?.style || "gentle",
      values: prefs?.parenting_values || ["connection", "clear_boundaries"],
      red_lines: redLines?.map((r: any) => r.code) || [],
    };

    try {
      const { data, error } = await supabase.functions.invoke("sos-respond", {
        body: {
          problem_category: selectedCategory,
          note_text: noteText || null,
          child_id: child?.id || null,
          child_snapshot: childSnapshot,
          parenting_snapshot: parentingSnapshot,
        },
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
  }, [selectedCategory, noteText, children, selectedChild, redLines, prefs, toast]);

  const handleExit = () => navigate("/");

  // Problem picker
  if (step === "pick_problem") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-sos-bg safe-top safe-bottom overflow-auto">
        <div className="flex items-center justify-between px-6 pt-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-sos-accent sos-glow" />
            <span className="font-body text-xs font-medium text-sos-fg/60">SOS MODE</span>
          </div>
          <button onClick={handleExit} className="flex h-10 w-10 items-center justify-center rounded-full bg-sos-muted text-sos-fg/80">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pt-6 pb-2">
          <h2 className="font-display text-2xl font-extrabold text-sos-fg">What's happening?</h2>
          <p className="mt-1 font-body text-sm text-sos-fg/50">Pick the closest match</p>
        </div>

        {children && children.length > 1 && (
          <div className="flex gap-2 px-6 pb-4 overflow-x-auto">
            {children.map((c: any) => (
              <button
                key={c.id}
                onClick={() => setSelectedChild(c.id)}
                className={`shrink-0 rounded-full px-4 py-2 font-body text-sm font-medium transition-colors ${
                  selectedChild === c.id ? "bg-sos-accent text-sos-fg" : "bg-sos-muted text-sos-fg/60"
                }`}
              >
                {c.display_name}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 px-6 pb-32">
          {PROBLEM_CATEGORIES.map((cat) => (
            <button
              key={cat.code}
              onClick={() => handleSelectProblem(cat.code)}
              className="flex flex-col items-start gap-1 rounded-2xl bg-sos-muted p-4 text-left active:scale-[0.97] transition-transform"
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="font-display text-sm font-bold text-sos-fg">{cat.label}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Note input
  if (step === "add_note") {
    const catLabel = PROBLEM_CATEGORIES.find((c) => c.code === selectedCategory)?.label || "";
    return (
      <div className="fixed inset-0 z-50 flex flex-col bg-sos-bg safe-top safe-bottom">
        <div className="flex items-center justify-between px-6 pt-4">
          <button onClick={() => setStep("pick_problem")} className="font-body text-sm text-sos-fg/60">← Back</button>
          <button onClick={handleExit} className="flex h-10 w-10 items-center justify-center rounded-full bg-sos-muted text-sos-fg/80">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-1 flex-col px-6 pt-6">
          <p className="rounded-full bg-sos-muted px-4 py-1.5 self-start font-body text-sm text-sos-fg/70 mb-4">{catLabel}</p>
          <h2 className="font-display text-xl font-extrabold text-sos-fg mb-2">Any quick details?</h2>
          <p className="font-body text-sm text-sos-fg/50 mb-6">Optional — skip if you're in a rush</p>

          <textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="E.g. Skipped nap and screaming about pajamas…"
            maxLength={500}
            rows={4}
            className="w-full rounded-2xl bg-sos-muted p-4 font-body text-sm text-sos-fg placeholder:text-sos-fg/30 outline-none resize-none"
          />
        </div>

        <div className="flex flex-col gap-3 px-6 pb-8">
          <button
            onClick={handleSend}
            className="flex h-14 w-full items-center justify-center gap-2 rounded-full bg-sos-accent font-display text-base font-bold text-sos-fg active:scale-95 transition-transform"
          >
            <Send className="h-5 w-5" />
            Get guidance
          </button>
          <button
            onClick={() => { setNoteText(""); handleSend(); }}
            className="font-body text-sm text-sos-fg/40 text-center"
          >
            Skip — just get help
          </button>
        </div>
      </div>
    );
  }

  // Loading
  if (step === "loading") {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-sos-bg safe-top safe-bottom">
        <motion.div
          animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
          className="h-4 w-4 rounded-full bg-sos-accent mb-6"
        />
        <Loader2 className="h-8 w-8 text-sos-accent animate-spin mb-4" />
        <p className="font-display text-lg font-bold text-sos-fg">Getting personalized guidance…</p>
        <p className="font-body text-sm text-sos-fg/40 mt-2">Breathe with the pulse</p>
      </div>
    );
  }

  // Result display
  if (step === "result" && response) {
    const items = [
      response.summary,
      ...(response.suggestions || []).map((s) => s),
      ...(response.safety_note ? [response.safety_note] : []),
    ];
    const currentItem = items[responseStep];
    const isComplete = responseStep >= items.length - 1;

    return (
      <div
        className="fixed inset-0 z-50 flex flex-col bg-sos-bg safe-top safe-bottom"
        onClick={() => {
          if (isComplete) { navigate("/"); return; }
          setResponseStep((s) => s + 1);
        }}
      >
        <div className="flex items-center justify-between px-6 pt-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-sos-accent sos-glow" />
            <span className="font-body text-xs font-medium text-sos-fg/60">
              {response.latency_ms ? `${(response.latency_ms / 1000).toFixed(1)}s` : "GUIDANCE"}
            </span>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); handleExit(); }}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-sos-muted text-sos-fg/80"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex items-center justify-center gap-2 px-6 pt-6">
          {items.map((_, i) => (
            <div key={i} className={`h-1.5 rounded-full transition-all duration-500 ${
              i === responseStep ? "w-8 bg-sos-accent" : i < responseStep ? "w-1.5 bg-sos-fg/40" : "w-1.5 bg-sos-muted"
            }`} />
          ))}
        </div>

        <div className="flex flex-1 items-center justify-center px-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={responseStep}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -40 }}
              transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="text-center"
            >
              {typeof currentItem === "string" ? (
                <p className="font-display text-3xl font-extrabold leading-tight tracking-tight text-sos-fg">
                  {currentItem}
                </p>
              ) : (
                <div className="space-y-4">
                  <p className="font-display text-2xl font-extrabold text-sos-fg">{currentItem.title}</p>
                  <p className="font-body text-base text-sos-fg/60">{currentItem.reason}</p>
                  <div className="mt-6 rounded-2xl bg-sos-muted p-6">
                    <p className="font-body text-xs text-sos-fg/40 mb-2">SAY THIS:</p>
                    <p className="font-display text-xl font-bold text-sos-accent leading-relaxed">
                      "{currentItem.script}"
                    </p>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>

        <div className="flex flex-col items-center gap-4 px-8 pb-8">
          <motion.div
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.7, 0.3] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="h-3 w-3 rounded-full bg-sos-accent"
          />
          <p className="font-body text-xs text-sos-fg/40">Breathe with the pulse</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (isComplete) navigate("/");
              else setResponseStep((s) => s + 1);
            }}
            className="flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-sos-muted font-display text-base font-bold text-sos-fg active:scale-95 transition-transform"
          >
            {isComplete ? "Done" : "Next"}
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>
    );
  }

  return null;
}
