import { useState } from "react";
import { Moon, ThumbsUp, ThumbsDown, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Incident {
  id: number;
  time: string;
  trigger: string;
  suggestion: string;
  accepted: boolean | null;
}

const MOCK_INCIDENTS: Incident[] = [
  {
    id: 1,
    time: "8:15 AM",
    trigger: "Morning routine — wrong socks",
    suggestion: "Sit low, validate feelings, offer two choices",
    accepted: true,
  },
  {
    id: 2,
    time: "12:30 PM",
    trigger: "Lunchtime — refused to eat",
    suggestion: "Remove pressure, eat together, try again in 20 min",
    accepted: null,
  },
  {
    id: 3,
    time: "6:45 PM",
    trigger: "Bedtime resistance",
    suggestion: "Acknowledge transition, give 5-min warning, use routine chart",
    accepted: null,
  },
];

export default function DebriefPage() {
  const [incidents, setIncidents] = useState(MOCK_INCIDENTS);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const handleFeedback = (id: number, accepted: boolean) => {
    setIncidents((prev) =>
      prev.map((inc) => (inc.id === id ? { ...inc, accepted } : inc))
    );
  };

  const acceptedCount = incidents.filter((i) => i.accepted === true).length;
  const reviewedCount = incidents.filter((i) => i.accepted !== null).length;

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

        {/* Summary card */}
        <div className="mt-6 rounded-2xl bg-secondary p-5">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-display font-bold">{incidents.length}</p>
              <p className="text-xs font-body text-muted-foreground">Sessions</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold">{reviewedCount}</p>
              <p className="text-xs font-body text-muted-foreground">Reviewed</p>
            </div>
            <div>
              <p className="text-2xl font-display font-bold">
                {reviewedCount > 0 ? Math.round((acceptedCount / reviewedCount) * 100) : "—"}
                {reviewedCount > 0 && <span className="text-sm">%</span>}
              </p>
              <p className="text-xs font-body text-muted-foreground">Aligned</p>
            </div>
          </div>
        </div>

        {/* Incidents */}
        <div className="mt-6 space-y-3">
          {incidents.map((inc) => (
            <div key={inc.id} className="rounded-2xl bg-secondary overflow-hidden">
              <button
                onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                className="flex w-full items-center justify-between p-4 text-left"
              >
                <div>
                  <p className="font-display text-sm font-bold">{inc.trigger}</p>
                  <p className="font-body text-xs text-muted-foreground">{inc.time}</p>
                </div>
                <div className="flex items-center gap-2">
                  {inc.accepted === true && (
                    <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-body font-medium text-primary">
                      ✓ Aligned
                    </span>
                  )}
                  {inc.accepted === false && (
                    <span className="rounded-full bg-destructive/15 px-2 py-0.5 text-xs font-body font-medium text-destructive">
                      Recalibrate
                    </span>
                  )}
                  <ChevronDown
                    className={`h-4 w-4 text-muted-foreground transition-transform ${
                      expandedId === inc.id ? "rotate-180" : ""
                    }`}
                  />
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
                    <div className="border-t border-border px-4 pb-4 pt-3">
                      <p className="font-body text-sm text-foreground leading-relaxed">
                        <span className="font-medium">AI suggested: </span>
                        {inc.suggestion}
                      </p>
                      <p className="mt-3 font-body text-xs text-muted-foreground">
                        Did this feel right?
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => handleFeedback(inc.id, true)}
                          className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-sm font-medium transition-colors active:scale-95 ${
                            inc.accepted === true
                              ? "bg-primary text-primary-foreground"
                              : "bg-accent text-accent-foreground"
                          }`}
                        >
                          <ThumbsUp className="h-3.5 w-3.5" />
                          Yes
                        </button>
                        <button
                          onClick={() => handleFeedback(inc.id, false)}
                          className={`flex items-center gap-1.5 rounded-full px-4 py-2 font-body text-sm font-medium transition-colors active:scale-95 ${
                            inc.accepted === false
                              ? "bg-destructive text-destructive-foreground"
                              : "bg-accent text-accent-foreground"
                          }`}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                          Recalibrate
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
