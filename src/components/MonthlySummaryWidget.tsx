import { useMonthlyIncidentsSummary } from "@/hooks/useIncidents";
import { PROBLEM_CATEGORIES } from "@/lib/constants";
import { Loader2, TrendingUp } from "lucide-react";

interface MonthlySummaryWidgetProps {
  childId?: string | null;
}

export function MonthlySummaryWidget({ childId }: MonthlySummaryWidgetProps) {
  const { data, isLoading } = useMonthlyIncidentsSummary(childId);

  if (isLoading) {
    return (
      <div className="mt-8 flex justify-center p-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data || data.totalSessions === 0) return null;

  const maxCount = data.topCategories[0]?.[1] || 1;

  return (
    <div className="mt-8">
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="h-4 w-4 text-muted-foreground" />
        <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground">
          30-Day Summary
        </h2>
      </div>

      <div className="rounded-2xl bg-secondary p-5 space-y-5">
        <div className="grid grid-cols-2 gap-4 text-center">
          <div>
            <p className="text-2xl font-display font-bold">{data.totalSessions}</p>
            <p className="text-xs font-body text-muted-foreground">Sessions</p>
          </div>
          <div>
            <p className="text-2xl font-display font-bold">
              {data.alignmentPct !== null ? `${data.alignmentPct}%` : "—"}
            </p>
            <p className="text-xs font-body text-muted-foreground">Alignment</p>
          </div>
        </div>

        {data.topCategories.length > 0 && (
          <div>
            <p className="font-body text-xs font-medium text-muted-foreground mb-3">Top Problem Areas</p>
            <div className="space-y-2">
              {data.topCategories.map(([code, count]) => {
                const cat = PROBLEM_CATEGORIES.find((c) => c.code === code);
                const pct = Math.round(((count as number) / (maxCount as number)) * 100);
                return (
                  <div key={code}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-body text-xs font-medium text-foreground">
                        {cat?.emoji} {cat?.label || code}
                      </span>
                      <span className="font-body text-xs text-muted-foreground">{count as number}</span>
                    </div>
                    <div className="h-2 rounded-full bg-accent overflow-hidden">
                      <div
                        className="h-full rounded-full bg-primary transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
