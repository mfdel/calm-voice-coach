import { useState, useMemo } from "react";
import { Clock, ChevronDown, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useIncidentsByDateRange } from "@/hooks/useIncidents";
import { PROBLEM_CATEGORIES } from "@/lib/constants";
import { format, subDays, startOfDay } from "date-fns";

const RANGE_OPTIONS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "All", days: 365 },
] as const;

export default function HistoryPage() {
  const [rangeDays, setRangeDays] = useState(7);
  const startDate = useMemo(() => startOfDay(subDays(new Date(), rangeDays)), [rangeDays]);
  const { data: incidents, isLoading } = useIncidentsByDateRange(startDate);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Group by date
  const grouped = useMemo(() => {
    if (!incidents) return [];
    const map = new Map<string, typeof incidents>();
    for (const inc of incidents) {
      const key = format(new Date(inc.created_at), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(inc);
    }
    return Array.from(map.entries()).map(([date, items]) => ({
      date,
      label: format(new Date(date), "EEEE, MMM d"),
      items,
    }));
  }, [incidents]);

  return (
    <div className="min-h-screen bg-background safe-top pb-28">
      <div className="mx-auto max-w-md px-6 pt-8">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-muted-foreground" />
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">History</h1>
            <p className="font-body text-sm text-muted-foreground">Past SOS sessions</p>
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

        {isLoading ? (
          <div className="flex justify-center p-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : !incidents?.length ? (
          <div className="mt-12 text-center">
            <p className="font-body text-sm text-muted-foreground">No sessions in this period.</p>
          </div>
        ) : (
          <div className="mt-6 space-y-6">
            {grouped.map((group) => (
              <div key={group.date}>
                <p className="font-display text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                  {group.label}
                </p>
                <div className="space-y-2">
                  {group.items.map((inc: any) => {
                    const cat = PROBLEM_CATEGORIES.find((c) => c.code === inc.problem_category);
                    const feedback = inc.incident_feedback?.[0];
                    const suggestions = inc.incident_suggestions || [];

                    return (
                      <div key={inc.id} className="rounded-2xl bg-secondary overflow-hidden">
                        <button
                          onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                          className="flex w-full items-center justify-between p-4 text-left"
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{cat?.emoji || "📝"}</span>
                            <div>
                              <p className="font-display text-sm font-bold">{cat?.label || inc.problem_category}</p>
                              <p className="font-body text-xs text-muted-foreground">{format(new Date(inc.created_at), "h:mm a")}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {feedback?.outcome === "helpful" && (
                              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-body font-medium text-primary">✓</span>
                            )}
                            {feedback?.outcome === "misaligned" && (
                              <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-body font-medium text-destructive">✗</span>
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
                              transition={{ duration: 0.2 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
                                {inc.summary_text && (
                                  <p className="font-body text-sm text-foreground">{inc.summary_text}</p>
                                )}
                                {suggestions.map((s: any) => (
                                  <div key={s.id} className="rounded-xl bg-accent p-3">
                                    <p className="font-display text-sm font-bold">{s.title}</p>
                                    {s.reason && <p className="font-body text-xs text-muted-foreground mt-1">{s.reason}</p>}
                                    {s.script && <p className="font-body text-sm text-primary mt-2">"{s.script}"</p>}
                                  </div>
                                ))}
                                {feedback && (
                                  <div className="pt-1">
                                    <p className="font-body text-xs text-muted-foreground">
                                      Feedback: <span className={feedback.outcome === "helpful" ? "text-primary" : "text-destructive"}>{feedback.outcome}</span>
                                    </p>
                                    {feedback.feedback_note && (
                                      <p className="font-body text-xs text-muted-foreground mt-1">"{feedback.feedback_note}"</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
