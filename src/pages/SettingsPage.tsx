import { useState } from "react";
import { ChevronRight, Lock, Bell, Volume2, HelpCircle, LogOut, X, Check } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";

type PanelType = "account" | "haptic" | "notifications" | "guide" | null;

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [activePanel, setActivePanel] = useState<PanelType>(null);
  const [hapticIntensity, setHapticIntensity] = useState(50);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const settingsItems: { key: PanelType; icon: typeof Lock; label: string; desc: string; group: string }[] = [
    { key: "account", icon: Lock, label: user?.email || "Account", desc: "Signed in", group: "Account" },
    { key: "haptic", icon: Volume2, label: "Haptic Feedback", desc: hapticEnabled ? `Intensity: ${hapticIntensity}%` : "Disabled", group: "Preferences" },
    { key: "notifications", icon: Bell, label: "Notifications", desc: "Currently off (by design)", group: "Preferences" },
    { key: "guide", icon: HelpCircle, label: "How ParentPilot Works", desc: "Guide & FAQ", group: "Support" },
  ];

  const groups = [...new Set(settingsItems.map((i) => i.group))];

  return (
    <div className="min-h-screen bg-background safe-top pb-28 overflow-y-auto">
      <div className="mx-auto max-w-md px-6 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>

        <div className="mt-8 space-y-8">
          {groups.map((group) => (
            <section key={group}>
              <h2 className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground">{group}</h2>
              <div className="mt-3 space-y-1">
                {settingsItems.filter((i) => i.group === group).map((item) => (
                  <button
                    key={item.key}
                    onClick={() => setActivePanel(activePanel === item.key ? null : item.key)}
                    className="flex w-full items-center gap-4 rounded-2xl bg-secondary p-4 text-left active:scale-[0.98] transition-all"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                      <item.icon className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-bold">{item.label}</p>
                      <p className="font-body text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${activePanel === item.key ? "rotate-90" : ""}`} />
                  </button>
                ))}
              </div>

              {/* Inline panels */}
              <AnimatePresence>
                {settingsItems
                  .filter((i) => i.group === group && activePanel === i.key)
                  .map((item) => (
                    <motion.div
                      key={item.key}
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="mt-1 rounded-2xl border border-border bg-card p-5 space-y-4">
                        {item.key === "account" && <AccountPanel email={user?.email} />}
                        {item.key === "haptic" && (
                          <HapticPanel
                            enabled={hapticEnabled}
                            intensity={hapticIntensity}
                            onToggle={setHapticEnabled}
                            onIntensity={setHapticIntensity}
                          />
                        )}
                        {item.key === "notifications" && <NotificationsPanel />}
                        {item.key === "guide" && <GuidePanel />}
                      </div>
                    </motion.div>
                  ))}
              </AnimatePresence>
            </section>
          ))}
        </div>

        <button
          onClick={handleSignOut}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 px-6 py-3.5 font-display text-sm font-bold text-destructive active:scale-[0.98] transition-transform"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>

        <div className="mt-8 text-center">
          <p className="font-body text-xs text-muted-foreground">ParentPilot v1.0</p>
        </div>
      </div>
    </div>
  );
}

function AccountPanel({ email }: { email?: string | null }) {
  return (
    <div className="space-y-3">
      <div>
        <p className="font-body text-xs text-muted-foreground">Email</p>
        <p className="font-display text-sm font-bold">{email || "—"}</p>
      </div>
      <div>
        <p className="font-body text-xs text-muted-foreground">Account status</p>
        <div className="flex items-center gap-2">
          <Check className="h-4 w-4 text-primary" />
          <p className="font-display text-sm font-bold text-primary">Active</p>
        </div>
      </div>
      <p className="font-body text-xs text-muted-foreground">
        To change your password, sign out and use "Forgot password" on the login screen.
      </p>
    </div>
  );
}

function HapticPanel({
  enabled,
  intensity,
  onToggle,
  onIntensity,
}: {
  enabled: boolean;
  intensity: number;
  onToggle: (v: boolean) => void;
  onIntensity: (v: number) => void;
}) {
  const tryHaptic = () => {
    if (navigator.vibrate) {
      const ms = Math.round((intensity / 100) * 200);
      navigator.vibrate([ms, 80, ms]);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold">Enable haptic pulse</p>
        <Switch checked={enabled} onCheckedChange={onToggle} />
      </div>
      {enabled && (
        <>
          <div className="space-y-2">
            <p className="font-body text-xs text-muted-foreground">Pulse intensity: {intensity}%</p>
            <Slider
              value={[intensity]}
              onValueChange={([v]) => onIntensity(v)}
              min={10}
              max={100}
              step={10}
            />
          </div>
          <button
            onClick={tryHaptic}
            className="rounded-xl bg-accent px-4 py-2 font-display text-xs font-bold text-accent-foreground active:scale-95 transition-transform"
          >
            Test vibration
          </button>
          <p className="font-body text-[11px] text-muted-foreground">
            Haptic feedback helps you pace your breathing during SOS mode. Vibration support depends on your device.
          </p>
        </>
      )}
    </div>
  );
}

function NotificationsPanel() {
  return (
    <div className="space-y-3">
      <p className="font-display text-sm font-bold">Notifications are off by design</p>
      <p className="font-body text-xs text-muted-foreground leading-relaxed">
        ParentPilot is intentionally notification-free. We don't interrupt your day — you come to us when you need help.
        This keeps the experience calm and parent-initiated.
      </p>
    </div>
  );
}

function GuidePanel() {
  const faqs = [
    { q: "What is SOS Mode?", a: "Tap the SOS button when you need immediate help with a parenting challenge. Pick the problem, add an optional note, and get grounded advice in seconds." },
    { q: "How does the advice work?", a: "We combine your child's profile, your parenting preferences, your Red Lines, and a curated knowledge base to generate advice that fits your family." },
    { q: "What are Red Lines?", a: "Methods you never want suggested — like time-outs or cry-it-out. Set them in your Profile and they'll be filtered from every response." },
    { q: "What is the Nightly Debrief?", a: "An evening review of your day's SOS sessions. Mark what worked, flag what didn't, and help the app learn your preferences over time." },
    { q: "Is my data private?", a: "Yes. All input is explicitly triggered by you. No passive listening. Voice notes are transcribed and discarded. Your data is encrypted in transit and at rest." },
  ];

  return (
    <div className="space-y-4">
      {faqs.map((faq) => (
        <div key={faq.q}>
          <p className="font-display text-sm font-bold">{faq.q}</p>
          <p className="font-body text-xs text-muted-foreground leading-relaxed mt-1">{faq.a}</p>
        </div>
      ))}
    </div>
  );
}
