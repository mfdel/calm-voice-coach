import { useNavigate } from "react-router-dom";
import { Shield, Heart, Sparkles, Lock } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background safe-top safe-bottom px-6 py-6 overflow-hidden">
      <header className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
          <Shield className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <h1 className="text-lg font-extrabold tracking-tight">ParentPilot</h1>
          <p className="text-[11px] font-body text-muted-foreground">Your calm in the storm</p>
        </div>
      </header>

      <main className="flex flex-1 flex-col justify-center py-4">
        <h2 className="font-display text-3xl font-extrabold leading-tight tracking-tight">
          Calm guidance,
          <br />
          right when you
          <br />
          need it most.
        </h2>
        <p className="mt-3 font-body text-sm text-muted-foreground leading-relaxed max-w-[300px]">
          ParentPilot is a private AI co-pilot for parents. Tap once during a tough moment and get short, grounded coaching aligned with your values.
        </p>

        <ul className="mt-6 space-y-3">
          <Feature
            icon={<Sparkles className="h-4 w-4" />}
            title="Instant SOS coaching"
            desc="2–3 actionable tips and a script in seconds."
          />
          <Feature
            icon={<Heart className="h-4 w-4" />}
            title="Aligned with your style"
            desc="Honors your red lines and parenting preferences."
          />
          <Feature
            icon={<Lock className="h-4 w-4" />}
            title="Private by design"
            desc="No passive listening. Your context stays yours."
          />
        </ul>
      </main>

      <footer className="space-y-2">
        <button
          onClick={() => navigate("/auth")}
          className="w-full rounded-2xl bg-primary px-6 py-3.5 font-display text-sm font-bold text-primary-foreground active:scale-[0.98] transition-transform"
        >
          Get started
        </button>
        <button
          onClick={() => navigate("/auth")}
          className="w-full rounded-2xl px-6 py-3 font-body text-sm text-muted-foreground"
        >
          I already have an account
        </button>
      </footer>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-secondary text-primary">
        {icon}
      </div>
      <div>
        <p className="font-display text-sm font-bold">{title}</p>
        <p className="font-body text-xs text-muted-foreground leading-snug">{desc}</p>
      </div>
    </li>
  );
}
