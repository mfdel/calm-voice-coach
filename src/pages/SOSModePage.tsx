import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronRight } from "lucide-react";

const MOCK_PROMPTS = [
  "TAKE A BREATH.\nYOU ARE SAFE.",
  "SIT LOW.\nGET ON THEIR LEVEL.",
  "SAY: \"I SEE\nYOU ARE UPSET.\"",
  "WAIT 10 SECONDS\nBEFORE SPEAKING.",
  "SAY: \"I'M HERE.\nWE'LL FIGURE\nTHIS OUT.\"",
  "YOU DID GREAT.\nSESSION COMPLETE.",
];

export default function SOSModePage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);

  const isComplete = step >= MOCK_PROMPTS.length - 1;

  const handleNext = useCallback(() => {
    if (isComplete) {
      navigate("/");
      return;
    }
    setDirection(1);
    setStep((s) => s + 1);
  }, [isComplete, navigate]);

  const handleExit = useCallback(() => {
    navigate("/");
  }, [navigate]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-sos-bg safe-top safe-bottom"
      onClick={handleNext}
    >
      {/* Top bar */}
      <div className="flex items-center justify-between px-6 pt-4">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-sos-accent sos-glow" />
          <span className="font-body text-xs font-medium text-sos-fg/60">LISTENING</span>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleExit();
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-sos-muted text-sos-fg/80 active:scale-90 transition-transform"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* Progress dots */}
      <div className="flex items-center justify-center gap-2 px-6 pt-6">
        {MOCK_PROMPTS.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 rounded-full transition-all duration-500 ${
              i === step
                ? "w-8 bg-sos-accent"
                : i < step
                ? "w-1.5 bg-sos-fg/40"
                : "w-1.5 bg-sos-muted"
            }`}
          />
        ))}
      </div>

      {/* Main prompt area */}
      <div className="flex flex-1 items-center justify-center px-8">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.p
            key={step}
            custom={direction}
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -40 }}
            transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="text-center font-display text-4xl font-extrabold leading-tight tracking-tight text-sos-fg whitespace-pre-line"
          >
            {MOCK_PROMPTS[step]}
          </motion.p>
        </AnimatePresence>
      </div>

      {/* Bottom area */}
      <div className="flex flex-col items-center gap-4 px-8 pb-8">
        {/* Haptic breath indicator */}
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            opacity: [0.3, 0.7, 0.3],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
          className="h-3 w-3 rounded-full bg-sos-accent"
        />
        <p className="font-body text-xs text-sos-fg/40">Breathe with the pulse</p>

        <button
          onClick={(e) => {
            e.stopPropagation();
            handleNext();
          }}
          className="flex h-14 w-full max-w-xs items-center justify-center gap-2 rounded-full bg-sos-muted font-display text-base font-bold text-sos-fg active:scale-95 transition-transform"
        >
          {isComplete ? "Done" : "Next"}
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
