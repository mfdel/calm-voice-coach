import { ChevronRight, Lock, Bell, Volume2, HelpCircle, LogOut } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function SettingsPage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const settingsGroups = [
    {
      title: "Account",
      items: [
        { icon: Lock, label: user?.email || "Account", desc: "Signed in" },
      ],
    },
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

  return (
    <div className="min-h-screen bg-background safe-top pb-28">
      <div className="mx-auto max-w-md px-6 pt-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">Your trust fortress</p>

        <div className="mt-8 space-y-8">
          {settingsGroups.map((group) => (
            <section key={group.title}>
              <h2 className="text-xs font-display font-bold uppercase tracking-wider text-muted-foreground">{group.title}</h2>
              <div className="mt-3 space-y-1">
                {group.items.map((item) => (
                  <button key={item.label} className="flex w-full items-center gap-4 rounded-2xl bg-secondary p-4 text-left active:scale-[0.98] transition-transform">
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

        <button
          onClick={handleSignOut}
          className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-destructive/10 px-6 py-3.5 font-display text-sm font-bold text-destructive active:scale-[0.98] transition-transform"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>

        <div className="mt-8 text-center">
          <p className="font-body text-xs text-muted-foreground">ParentPilot v1.0</p>
          <p className="font-body text-[10px] text-muted-foreground/60 mt-1">All audio processed on-device. No raw data leaves your phone.</p>
        </div>
      </div>
    </div>
  );
}
