import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Shield, Mail, Lock, ArrowRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/");
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: import.meta.env.VITE_EMAIL_REDIRECT_URL ?? window.location.origin },
        });
        if (error) throw error;
        toast({
          title: "Check your email",
          description: "We sent you a confirmation link to verify your account.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">ParentPilot</h1>
            <p className="text-xs font-body text-muted-foreground">Your calm in the storm</p>
          </div>
        </div>

        <h2 className="text-xl font-display font-bold mb-6">
          {isLogin ? "Welcome back" : "Create your account"}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-2xl bg-secondary px-4 py-3.5 pl-11 font-body text-base outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="relative">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full rounded-2xl bg-secondary px-4 py-3.5 pl-11 font-body text-base outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-display text-sm font-bold text-primary-foreground active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {loading ? "Please wait…" : isLogin ? "Sign in" : "Create account"}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        <p className="mt-6 text-center font-body text-sm text-muted-foreground">
          {isLogin ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="font-medium text-primary underline-offset-2 hover:underline"
          >
            {isLogin ? "Sign up" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
