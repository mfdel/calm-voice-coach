import { useState } from "react";
import { Shield, Plus, ChevronRight, Loader2 } from "lucide-react";
import { useChildProfiles, useAddChild, useRedLines, useToggleRedLine, useParentingPreferences, useUpsertPreferences } from "@/hooks/useProfile";
import { RED_LINE_OPTIONS, TRIGGER_OPTIONS, AGE_GROUPS } from "@/lib/constants";
import { useAuth } from "@/contexts/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: children, isLoading: childrenLoading } = useChildProfiles();
  const { data: redLines, isLoading: redLinesLoading } = useRedLines();
  const { data: prefs } = useParentingPreferences();
  const addChild = useAddChild();
  const toggleRedLine = useToggleRedLine();
  const upsertPrefs = useUpsertPreferences();

  const [showAddChild, setShowAddChild] = useState(false);
  const [newName, setNewName] = useState("");
  const [newAgeGroup, setNewAgeGroup] = useState("toddler");
  const [newTriggers, setNewTriggers] = useState<string[]>([]);

  const handleAddChild = async () => {
    if (!newName.trim()) return;
    await addChild.mutateAsync({
      display_name: newName,
      age_group: newAgeGroup,
      known_triggers: newTriggers,
    });
    setShowAddChild(false);
    setNewName("");
    setNewTriggers([]);
  };

  const activeRedLineCodes = redLines?.map((r: any) => r.code) || [];

  return (
    <div className="min-h-screen bg-background safe-top pb-28">
      <div className="mx-auto max-w-md px-6 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Profile</h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Manage children & your parenting values
        </p>

        {/* Children */}
        <section className="mt-8">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground">Children</h2>
          <div className="mt-3 space-y-3">
            {childrenLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            ) : (
              <>
                {children?.map((child: any) => (
                  <div key={child.id} className="rounded-2xl bg-secondary p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-display font-bold text-lg">{child.display_name}</p>
                        <p className="font-body text-sm text-muted-foreground">
                          {AGE_GROUPS.find((a) => a.value === child.age_group)?.label || child.age_group}
                        </p>
                      </div>
                      <ChevronRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                    {child.known_triggers?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(child.known_triggers as string[]).map((t) => (
                          <span key={t} className="rounded-full bg-accent px-3 py-1 font-body text-xs font-medium text-accent-foreground">{t}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}

                {showAddChild ? (
                  <div className="rounded-2xl bg-secondary p-4 space-y-3">
                    <input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Child's name"
                      className="w-full rounded-xl bg-accent px-4 py-2.5 font-body text-sm outline-none"
                    />
                    <div className="flex flex-wrap gap-2">
                      {AGE_GROUPS.map((ag) => (
                        <button
                          key={ag.value}
                          onClick={() => setNewAgeGroup(ag.value)}
                          className={`rounded-full px-3 py-2.5 font-body text-xs font-medium transition-colors ${
                            newAgeGroup === ag.value ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                          }`}
                        >
                          {ag.label}
                        </button>
                      ))}
                    </div>
                    <p className="font-body text-xs text-muted-foreground">Known triggers:</p>
                    <div className="flex flex-wrap gap-2">
                      {TRIGGER_OPTIONS.map((t) => (
                        <button
                          key={t}
                          onClick={() => setNewTriggers((prev) => prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t])}
                          className={`rounded-full px-3 py-2.5 font-body text-xs font-medium transition-colors ${
                            newTriggers.includes(t) ? "bg-primary text-primary-foreground" : "bg-accent text-accent-foreground"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => setShowAddChild(false)} className="flex-1 rounded-xl bg-accent py-2.5 font-body text-sm font-medium text-accent-foreground">Cancel</button>
                      <button
                        onClick={handleAddChild}
                        disabled={addChild.isPending || !newName.trim()}
                        className="flex-1 rounded-xl bg-primary py-2.5 font-body text-sm font-bold text-primary-foreground disabled:opacity-50"
                      >
                        {addChild.isPending ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowAddChild(true)}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border p-4 font-body text-sm font-medium text-muted-foreground active:scale-[0.98] transition-transform"
                  >
                    <Plus className="h-4 w-4" />
                    Add child
                  </button>
                )}
              </>
            )}
          </div>
        </section>

        {/* Red Lines */}
        <section className="mt-10">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-destructive" />
            <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground">Red Lines</h2>
          </div>
          <p className="mt-1 font-body text-xs text-muted-foreground">The AI will never suggest these approaches</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {redLinesLoading ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              RED_LINE_OPTIONS.map((line) => {
                const active = activeRedLineCodes.includes(line.code);
                return (
                  <button
                    key={line.code}
                    onClick={() => toggleRedLine.mutate({ code: line.code, label: line.label, severity: line.severity, isActive: active })}
                    disabled={toggleRedLine.isPending}
                    className={`rounded-full px-4 py-2 font-body text-sm font-medium transition-colors active:scale-95 ${
                      active
                        ? "bg-destructive/15 text-destructive border border-destructive/30"
                        : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {line.label}
                  </button>
                );
              })
            )}
          </div>
        </section>

        {/* Parenting Style */}
        <section className="mt-10">
          <h2 className="text-sm font-display font-bold uppercase tracking-wider text-muted-foreground">Parenting Style</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {["gentle", "structured", "balanced"].map((style) => (
              <button
                key={style}
                onClick={() => upsertPrefs.mutate({ style })}
                className={`rounded-full px-4 py-2 font-body text-sm font-medium capitalize transition-colors ${
                  (prefs?.style || "gentle") === style
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {style}
              </button>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
