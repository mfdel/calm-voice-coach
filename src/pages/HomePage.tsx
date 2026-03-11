import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";

export default function HomePage() {
  const navigate = useNavigate();
  const [pressing, setPressing] = useState(false);

  return (
    <div className="flex min-h-screen flex-col items-center bg-background safe-top">
      {/* Header */}
      <header className="w-full max-w-md px-6 pt-8 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">ParentPilot</h1>
            <p className="text-xs font-body text-muted-foreground">Your calm in the storm</p>
          </div>
        </div>
      </header>

      {/* Main SOS area */}
      <div className="flex flex-1 flex-col items-center justify-center px-6">
        <p className="mb-8 text-center font-body text-sm text-muted-foreground leading-relaxed max-w-[240px]">
          When things get tough, press the button. We'll guide you through it.
        </p>

        {/* SOS Button with pulse */}
        <div className="relative">
          {/* Pulse rings */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-44 w-44 rounded-full bg-primary/10 sos-pulse-ring" />
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-52 w-52 rounded-full bg-primary/5 sos-pulse-ring" style={{ animationDelay: "1s" }} />
          </div>

          <motion.button
            onPointerDown={() => setPressing(true)}
            onPointerUp={() => setPressing(false)}
            onPointerLeave={() => setPressing(false)}
            onClick={() => navigate("/sos")}
            animate={{ scale: pressing ? 0.92 : 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
            className="relative z-10 flex h-40 w-40 flex-col items-center justify-center rounded-full bg-primary font-display text-primary-foreground shadow-2xl"
          >
            <span className="text-3xl font-extrabold tracking-tight">SOS</span>
            <span className="mt-1 text-xs font-body font-medium opacity-80">Tap for help</span>
          </motion.button>
        </div>

        <p className="mt-10 text-center font-body text-xs text-muted-foreground max-w-[200px]">
          Non-judgmental, style-aligned guidance in seconds
        </p>
      </div>

      {/* Quick status cards */}
      <div className="w-full max-w-md px-6 pb-28">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-secondary p-4">
            <p className="text-xs font-body font-medium text-muted-foreground">Today's Sessions</p>
            <p className="mt-1 text-2xl font-display font-bold">0</p>
          </div>
          <div className="rounded-2xl bg-secondary p-4">
            <p className="text-xs font-body font-medium text-muted-foreground">Alignment Score</p>
            <p className="mt-1 text-2xl font-display font-bold">—</p>
          </div>
        </div>
      </div>
    </div>
  );
}
