import { useNavigate } from "react-router-dom";
import { Shield, Heart, Sparkles, Lock, ArrowRight } from "lucide-react";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";

export default function LandingPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  return (
    <div className="relative min-h-[100dvh] w-full overflow-hidden bg-background">
      {/* Ambient background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(60% 50% at 80% 0%, hsl(var(--primary) / 0.18), transparent 60%), radial-gradient(50% 40% at 0% 100%, hsl(var(--primary) / 0.12), transparent 70%)",
        }}
      />

      <div className="relative mx-auto flex min-h-[100dvh] w-full max-w-6xl flex-col px-6 py-6 safe-top safe-bottom md:px-10 md:py-10">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
              <Shield className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold tracking-tight">ParentPilot</h1>
              <p className="text-[11px] font-body text-muted-foreground">Your calm in the storm</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/auth")}
            className="hidden rounded-full px-4 py-2 font-body text-sm text-foreground/70 hover:text-foreground md:inline-flex"
          >
            Sign in
          </button>
        </header>

        {/* Main */}
        <main className="flex flex-1 flex-col justify-center py-8 md:grid md:grid-cols-2 md:gap-12 md:py-12">
          {/* Hero copy */}
          <div className="flex flex-col justify-center">
            <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-border bg-secondary/60 px-3 py-1 font-body text-xs text-muted-foreground">
              <span className="h-1.5 w-1.5 rounded-full bg-primary" />
              Private AI co-pilot for parents
            </span>
            <h2 className="font-display text-4xl font-extrabold leading-[1.05] tracking-tight md:text-6xl">
              Calm guidance,
              <br />
              right when you
              <br />
              <span className="text-primary">need it most.</span>
            </h2>
            <p className="mt-5 max-w-[440px] font-body text-base text-muted-foreground leading-relaxed md:text-lg">
              Tap once during a tough moment and get short, grounded coaching — aligned with your
              values, your child, and your red lines.
            </p>

            {/* CTAs */}
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <button
                onClick={() => navigate("/auth")}
                className="group inline-flex items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-display text-sm font-bold text-primary-foreground shadow-lg shadow-primary/20 active:scale-[0.98] transition-transform"
              >
                Get started
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </button>
              <button
                onClick={() => navigate("/auth")}
                className="rounded-2xl border border-border bg-background px-6 py-3.5 font-display text-sm font-bold text-foreground/80 hover:text-foreground md:hidden"
              >
                I already have an account
              </button>
            </div>

            <p className="mt-4 font-body text-xs text-muted-foreground">
              No passive listening. Your context stays yours.
            </p>
          </div>

          {/* Feature card */}
          <div className="mt-10 md:mt-0 md:flex md:items-center">
            <div className="w-full rounded-3xl border border-border bg-card/60 p-6 shadow-xl shadow-foreground/[0.03] backdrop-blur md:p-8">
              <p className="mb-5 font-display text-xs font-bold uppercase tracking-wider text-muted-foreground">
                What you get
              </p>
              <ul className="space-y-5">
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
                  desc="No background listening. Minimal data sent."
                />
              </ul>
            </div>
          </div>
        </main>

        <footer className="pt-4 text-center font-body text-xs text-muted-foreground">
          © {new Date().getFullYear()} ParentPilot
        </footer>
      </div>
    </div>
  );
}

function Feature({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <p className="font-display text-base font-bold">{title}</p>
        <p className="font-body text-sm text-muted-foreground leading-snug">{desc}</p>
      </div>
    </li>
  );
}
