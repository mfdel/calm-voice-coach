import { Moon, ThumbsUp, ThumbsDown, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useMemo } from "react";
import { useIncidentsByDateRange, useSubmitFeedback } from "@/hooks/useIncidents";
import { PROBLEM_CATEGORIES } from "@/lib/constants";
import { format, subDays, startOfDay } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { MonthlySummaryWidget } from "@/components/MonthlySummaryWidget";

const REASON_TAGS = [
  { code: "too_permissive", label: "Too permissive" },
  { code: "too_strict", label: "Too strict" },
  { code: "not_practical", label: "Not practical" },
  { code: "wrong_tone", label: "Wrong tone" },
  { code: "didnt_match_child", label: "Didn't match my child" },
  { code: "already_tried", label: "Already tried this" },
];

const RANGE_OPTIONS = [
  { label: "Today", days: 0 },
  { label: "7 Days", days: 7 },
  { label: "30 Days", days: 30 },
] as const;

export default function DebriefPage() {
  const [rangeDays, setRangeDays] = useState(0);
  const startDate = useMemo(() => {
    const d = rangeDays === 0 ? new Date() : subDays(new Date(), rangeDays);
    return startOfDay(d);
  }, [rangeDays]);

  const { data: incidents, isLoading } = useIncidentsByDateRange(startDate);
  const submitFeedback = useSubmitFeedback();
  const { toast } = useToast();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedTags, setSelectedTags] = useState<Record<string, string[]>>({});
  const [feedbackNotes, setFeedbackNotes] = useState<Record<string, string>>({});
  const [localOutcomes, setLocalOutcomes] = useState<Record<string, string>>({});

  const feedbackCount = incidents?.filter((i: any) => i.incident_feedback != null).length || 0;
  const alignedCount = incidents?.filter((i: any) => i.incident_feedback?.outcome === "helpful").length || 0;

  const toggleTag = (incidentId: string, tag: string) => {
    setSelectedTags((prev) => {
      const current = prev[incidentId] || [];
      return {
        ...prev,
        [incidentId]: current.includes(tag) ? current.filter((t) => t !== tag) : [...current, tag],
      };
    });
  };

  const getOutcome = (incidentId: string, serverOutcome?: string) =>
    localOutcomes[incidentId] ?? serverOutcome;

  const handleFeedback = (incidentId: string, outcome: string) => {
    setLocalOutcomes((prev) => ({ ...prev, [incidentId]: outcome }));
    submitFeedback.mutate(
      {
        incident_id: incidentId,
        outcome,
        reason_tags: selectedTags[incidentId] || [],
        feedback_note: feedbackNotes[incidentId] || undefined,
      },
      {
        onError: () => {
          setLocalOutcomes((prev) => {
            const next = { ...prev };
            delete next[incidentId];
            return next;
          });
          toast({
            title: "Couldn't save feedback",
            description: "Please try again.",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-28">
      <div className="mx-auto max-w-md px-6 pt-8">
        <div className="flex items-center gap-3">
          <Moon className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">Nightly Debrief</h1>
            <p className="font-body text-sm text-muted-foreground">
              {rangeDays === 0 ? "Today's reflection" : `Last ${rangeDays} days`}
            </p>
          </div>
        </div>

        {/* Range selector */}
        <div className="mt-5 flex gap-2">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.days}
              onClick={() => setRangeDays(opt.days)}
              className={`rounded-full px-4 py-2 font-body text-sm font-medium transition-colors ${
                rangeDays === opt.days ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="mt-5 rounded-2xl bg-secondary p-5">
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
            <p className="font-body text-sm text-muted-foreground">No SOS sessions in this period.</p>
            <p className="font-body text-xs text-muted-foreground mt-1">Use the SOS button when things get tough.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-3">
            {incidents.map((inc: any) => {
              const catLabel = PROBLEM_CATEGORIES.find((c) => c.code === inc.problem_category)?.label || inc.problem_category;
              const feedback = inc.incident_feedback?.[0];
              const effectiveOutcome = getOutcome(inc.id, feedback?.outcome);
              const isSubmittingThis = submitFeedback.isPending && submitFeedback.variables?.incident_id === inc.id;
              const suggestions = inc.incident_suggestions || [];
              const incTags = selectedTags[inc.id] || [];

              return (
                <div key={inc.id} className="rounded-2xl bg-secondary overflow-hidden">
                  <button
                    onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                    className="flex w-full items-center justify-between p-4 text-left"
                  >
                    <div>
                      <p className="font-display text-sm font-bold">{catLabel}</p>
                      {inc.child_profiles?.display_name && (
                        <p className="font-body text-xs text-muted-foreground">{inc.child_profiles.display_name}</p>
                      )}
                      <p className="font-body text-xs text-muted-foreground">{format(new Date(inc.created_at), "h:mm a")}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {effectiveOutcome === "helpful" && (
                        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-body font-medium text-primary">✓ Aligned</span>
                      )}
                      {effectiveOutcome === "misaligned" && (
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

                          <p className="font-body text-xs text-muted-foreground pt-1">Did this feel right?</p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleFeedback(inc.id, "helpful")}
                              disabled={isSubmittingThis}
                              className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-sm font-medium transition-colors active:scale-95 ${
                                effectiveOutcome === "helpful" ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                              }`}
                            >
                              {isSubmittingThis && effectiveOutcome === "helpful" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ThumbsUp className="h-3.5 w-3.5" />
                              )} Yes
                            </button>
                            <button
                              onClick={() => handleFeedback(inc.id, "misaligned")}
                              disabled={isSubmittingThis}
                              className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-sm font-medium transition-colors active:scale-95 ${
                                effectiveOutcome === "misaligned" ? "bg-destructive text-destructive-foreground" : "bg-accent text-accent-foreground"
                              }`}
                            >
                              {isSubmittingThis && effectiveOutcome === "misaligned" ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ThumbsDown className="h-3.5 w-3.5" />
                              )} Recalibrate
                            </button>
                          </div>

                          <AnimatePresence>
                            {(effectiveOutcome === "misaligned" || incTags.length > 0) && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="space-y-3 overflow-hidden"
                              >
                                <p className="font-body text-xs text-muted-foreground">What felt off?</p>
                                <div className="flex flex-wrap gap-2">
                                  {REASON_TAGS.map((tag) => (
                                    <button
                                      key={tag.code}
                                      onClick={() => toggleTag(inc.id, tag.code)}
                                      className={`rounded-full px-3 py-1.5 font-body text-xs font-medium transition-colors active:scale-95 ${
                                        incTags.includes(tag.code)
                                          ? "bg-destructive/15 text-destructive border border-destructive/30"
                                          : "bg-accent text-accent-foreground"
                                      }`}
                                    >
                                      {tag.label}
                                    </button>
                                  ))}
                                </div>
                                <textarea
                                  value={feedbackNotes[inc.id] || ""}
                                  onChange={(e) => setFeedbackNotes((prev) => ({ ...prev, [inc.id]: e.target.value }))}
                                  placeholder="Anything else? (optional)"
                                  rows={2}
                                  className="w-full rounded-xl bg-accent p-3 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
                                  style={{ fontSize: '16px' }}
                                />
                                {incTags.length > 0 && (
                                  <button
                                    onClick={() => handleFeedback(inc.id, "misaligned")}
                                    disabled={submitFeedback.isPending}
                                    className="w-full rounded-full bg-destructive/15 py-2 font-body text-xs font-semibold text-destructive active:scale-95 transition-transform"
                                  >
                                    Submit recalibration
                                  </button>
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        {/* Monthly Summary */}
        <MonthlySummaryWidget />
      </div>
    </div>
  );
}
