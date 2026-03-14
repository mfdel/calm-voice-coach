import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useSingleChildProfile, useUpdateChild } from "@/hooks/useProfile";
import { AGE_GROUPS, TRIGGER_OPTIONS } from "@/lib/constants";
import { useToast } from "@/hooks/use-toast";

export default function ChildDetailPage() {
  const { childId } = useParams<{ childId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: child, isLoading } = useSingleChildProfile(childId);
  const updateChild = useUpdateChild();

  const [name, setName] = useState("");
  const [ageGroup, setAgeGroup] = useState("toddler");
  const [triggers, setTriggers] = useState<string[]>([]);
  const [devNotes, setDevNotes] = useState("");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (child) {
      setName(child.display_name);
      setAgeGroup(child.age_group);
      setTriggers((child.known_triggers as string[]) || []);
      setDevNotes(child.development_notes || "");
    }
  }, [child]);

  const toggleItem = (list: string[], item: string, setter: (v: string[]) => void) => {
    setter(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);
    setDirty(true);
  };

  const handleSave = async () => {
    if (!childId || !name.trim()) return;
    await updateChild.mutateAsync({
      id: childId,
      display_name: name,
      age_group: ageGroup,
      known_triggers: triggers,
      development_notes: devNotes || undefined,
    });
    setDirty(false);
    toast({ title: "Saved", description: `${name}'s profile updated.` });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!child) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="font-body text-sm text-muted-foreground">Child not found.</p>
        <button onClick={() => navigate("/profile")} className="font-body text-sm text-primary underline">Back to Profile</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background safe-top pb-28">
      <div className="mx-auto max-w-md px-6 pt-6">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button onClick={() => navigate("/profile")} className="rounded-xl p-2 active:bg-accent transition-colors">
            <ArrowLeft className="h-5 w-5 text-foreground" />
          </button>
          <h1 className="text-xl font-extrabold tracking-tight">Edit Child</h1>
        </div>

        <div className="space-y-6">
          {/* Name */}
          <div>
            <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">Name</label>
            <input
              value={name}
              onChange={(e) => { setName(e.target.value); setDirty(true); }}
              className="mt-2 w-full rounded-xl bg-secondary px-4 py-3 font-body text-sm text-foreground outline-none"
              style={{ fontSize: '16px' }}
            />
          </div>

          {/* Age Group */}
          <div>
            <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">Age Group</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {AGE_GROUPS.map((ag) => (
                <button
                  key={ag.value}
                  onClick={() => { setAgeGroup(ag.value); setDirty(true); }}
                  className={`rounded-full px-4 py-2 font-body text-sm font-medium transition-colors ${
                    ageGroup === ag.value ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {ag.label}
                </button>
              ))}
            </div>
          </div>

          {/* Triggers */}
          <div>
            <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">Known Triggers</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {TRIGGER_OPTIONS.map((t) => (
                <button
                  key={t}
                  onClick={() => toggleItem(triggers, t, setTriggers)}
                  className={`rounded-full px-3 py-2 font-body text-xs font-medium transition-colors ${
                    triggers.includes(t) ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Development Notes */}
          <div>
            <label className="font-body text-xs font-medium text-muted-foreground uppercase tracking-wider">Development Notes</label>
            <textarea
              value={devNotes}
              onChange={(e) => { setDevNotes(e.target.value); setDirty(true); }}
              placeholder="Any notes about developmental stage, special needs, etc."
              rows={3}
              className="mt-2 w-full rounded-xl bg-secondary p-4 font-body text-sm text-foreground placeholder:text-muted-foreground outline-none resize-none"
              style={{ fontSize: '16px' }}
            />
          </div>


          {/* Save */}
          <button
            onClick={handleSave}
            disabled={updateChild.isPending || !dirty || !name.trim()}
            className="w-full rounded-xl bg-primary py-3 font-body text-sm font-bold text-primary-foreground disabled:opacity-50 active:scale-[0.98] transition-transform"
          >
            {updateChild.isPending ? "Saving…" : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
}
