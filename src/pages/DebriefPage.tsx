import { Moon, ThumbsUp, ThumbsDown, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useTodayIncidents, useSubmitFeedback } from "@/hooks/useIncidents";
import { PROBLEM_CATEGORIES } from "@/lib/constants";
import { format } from "date-fns";

export default function DebriefPage() {
  const { data: incidents, isLoading } = useTodayIncidents();
  const submitFeedback = useSubmitFeedback();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const feedbackCount = incidents?.filter((i: any) => i.incident_feedback?.length > 0).length || 0;
  const alignedCount = incidents?.filter((i: any) =>
    i.incident_feedback?.some((f: any) => f.outcome === "helpful")
  ).length || 0;

  return (
    <div className="min-h-screen bg-background safe-top pb-28">
      <div className="mx-auto max-w-md px-6 pt-8">
        <div className="flex items-center gap-3">
          <Moon className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Nightly Debrief</h1>
            <p className="font-body text-sm text-muted-foreground">Today's reflection</p>
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-secondary p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-display font-bold">{incidents?.length || 0}</p>
              <p className="text-xs font-body text-muted-foreground">Sessions</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{feedbackCount}</p>
              <p className="text-xs font-body text-muted-foreground">Reviewed</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold">
                {feedbackCount > 0 ? `${Math.round((alignedCount / feedbackCount) * 100)}%` : "—"}
              </p>
              <p className="text-xs font-body text-muted-foreground">Aligned</p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center p-12"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
        ) : !incidents?.length ? (
          <div className="mt-12 text-center">
            <p className="font-body text-sm text-muted-foreground">No SOS sessions today.</p>
            <p className="font-body text-xs text-muted-foreground mt-1">Use the SOS button when things get tough.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {incidents.map((inc: any) => {
              const catLabel = PROBLEM_CATEGORIES.find((c) => c.code === inc.problem_category)?.label || inc.problem_category;
              const feedback = inc.incident_feedback?.[0];
              const suggestions = inc.incident_suggestions || [];

              return (
                <div key={inc.id} className="rounded-2xl bg-secondary overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div>
                      <p className="font-display text-sm font-bold">{catLabel}</p>
                      <p className="font-body text-xs text-muted-foreground">{format(new Date(inc.created_at), "h:mm a")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {feedback?.outcome === "helpful" && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-body font-medium text-primary">✓ Aligned</span>
                      )}
                      {feedback?.outcome === "misaligned" && (
                        <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-body font-medium text-destructive">Recalibrate</span>
                      )}
                      <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expandedId === inc.id ? "rotate-180" : ""}`} />
                    </div>
                  </button>

                  <AnimatePresence>
                    {expandedId === inc.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.25 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                          {inc.summary_text && (
                            <p className="font-body text-sm text-foreground">{inc.summary_text}</p>
                          )}
                          {suggestions.map((s: any) => (
                            <div key={s.id} className="rounded-xl bg-accent p-3">
                              <p className="font-display text-sm font-bold">{s.title}</p>
                              <p className="font-body text-xs text-muted-foreground mt-1">{s.reason}</p>
                              {s.script && (
                                <p className="font-body text-sm text-primary mt-2">"{s.script}"</p>
                              )}
                            </div>
                          ))}
                          <p className="font-body text-xs text-muted-foreground">Did this feel right?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => submitFeedback.mutate({ incident_id: inc.id, outcome: "helpful" })}
                              disabled={submitFeedback.isPending}
                              className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-sm font-medium transition-colors active:scale-95 ${
                                feedback?.outcome === "helpful" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                              }`}
                            >
                              <ThumbsUp className="h-3.5 w-3.5" /> Yes
                            </button>
                            <button
                              onClick={() => submitFeedback.mutate({ incident_id: inc.id, outcome: "misaligned" })}
                              disabled={submitFeedback.isPending}
                              className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-sm font-medium transition-colors active:scale-95 ${
                                feedback?.outcome === "misaligned" ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground"
                              }`}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" /> Recalibrate
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
