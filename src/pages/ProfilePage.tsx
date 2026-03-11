import { useState } from "react";
import { Shield, Plus, ChevronRight } from "lucide-react";

interface ChildProfile {
  name: string;
  age: string;
  triggers: string[];
}

const SAMPLE_TRIGGERS = ["Loud noises", "Transitions", "Hunger", "Tiredness", "Sharing toys", "New environments"];

export default function ProfilePage() {
  const [children, setChildren] = useState<ChildProfile[]>([
    { name: "Emma", age: "3", triggers: ["Transitions", "Tiredness"] },
  ]);
  const [redLines, setRedLines] = useState<string[]>(["No cry-it-out", "No time-outs"]);

  const RED_LINE_OPTIONS = [
    "No cry-it-out",
    "No time-outs",
    "No physical discipline",
    "No yelling",
    "No screen bribery",
    "No food rewards",
  ];

  const toggleRedLine = (line: string) => {
    setRedLines((prev) =>
      prev.includes(line) ? prev.filter((l) => l !== line) : [...prev, line]
    );
  };

  return (
    <div className="min-h-screen bg-background safe-top pb-28">
      <div className="mx-auto max-w-md px-6 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Profile</h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Manage children & your parenting values
        </p>

        {/* Children */}
        <section className="mt-8">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground">
            Children
          </h2>
          <div className="mt-3 space-y-3">
            {children.map((child, i) => (
              <div key={i} className="rounded-2xl bg-secondary p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-display font-bold text-lg">{child.name}</p>
                    <p className="font-body text-sm text-muted-foreground">Age {child.age}</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {child.triggers.map((t) => (
                    <span
                      key={t}
                      className="rounded-full bg-accent px-3 py-1 font-body text-xs font-medium text-accent-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            ))}
            <button className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-4 font-body text-sm font-medium text-muted-foreground active:scale-[0.98] transition-transform">
              <Plus className="h-4 w-4" />
              Add child
            </button>
          </div>
        </section>

        {/* Red Lines */}
        <section className="mt-10">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground">
              Red Lines
            </h2>
          </div>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            The AI will never suggest these approaches
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {RED_LINE_OPTIONS.map((line) => {
              const active = redLines.includes(line);
              return (
                <button
                  key={line}
                  onClick={() => toggleRedLine(line)}
                  className={`rounded-full px-4 py-2 font-body text-sm font-medium transition-colors active:scale-95 ${
                    active
                      ? "bg-destructive/15 text-destructive border border-destructive/30"
                      : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {line}
                </button>
              );
            })}
          </div>
        </section>

        {/* Village Sync */}
        <section className="mt-10">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground">
            Village Sync
          </h2>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Share your profile with co-parents & caregivers
          </p>
          <button className="mt-4 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-display text-sm font-bold text-primary-foreground active:scale-[0.98] transition-transform">
            <Plus className="h-4 w-4" />
            Invite caregiver
          </button>
        </section>
      </div>
    </div>
  );
}
