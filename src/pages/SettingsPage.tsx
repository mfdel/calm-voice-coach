import { ChevronRight, Lock, Bell, Volume2, HelpCircle } from "lucide-react";

const settingsGroups = [
  {
    title: "Privacy & Security",
    items: [
      { icon: Lock, label: "Data & Privacy", desc: "On-device processing, encryption" },
    ],
  },
  {
    title: "Preferences",
    items: [
      { icon: Volume2, label: "Haptic Feedback", desc: "Breathing pulse intensity" },
      { icon: Bell, label: "Notifications", desc: "Currently off (by design)" },
    ],
  },
  {
    title: "Support",
    items: [
      { icon: HelpCircle, label: "How ParentPilot Works", desc: "Guide & FAQ" },
    ],
  },
];

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-background safe-top pb-28">
      <div className="mx-auto max-w-md px-6 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Your trust fortress
        </p>

        <div className="mt-8 space-y-8">
          {settingsGroups.map((group) => (
            <section key={group.title}>
              <h2 className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground">
                {group.title}
              </h2>
              <div className="mt-3 space-y-1">
                {group.items.map((item) => (
                  <button
                    key={item.label}
                    className="flex w-full items-center gap-4 rounded-2xl bg-secondary p-4 text-left active:scale-[0.98] transition-transform"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent">
                      <item.icon className="h-5 w-5 text-accent-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-display text-sm font-bold">{item.label}</p>
                      <p className="font-body text-xs text-muted-foreground">{item.desc}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="font-body text-xs text-muted-foreground">ParentPilot v1.0</p>
          <p className="font-body text-[10px] text-muted-foreground/60 mt-1">
            All audio processed on-device. No raw data leaves your phone.
          </p>
        </div>
      </div>
    </div>
  );
}
