import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Shield, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Beta namespace typing — the installed supabase-js client exposes these at runtime.
type OAuthResult = {
  data?: { redirect_url?: string; redirect_to?: string; client?: { name?: string; redirect_uris?: string[] }; scope?: string } | null;
  error?: { message: string } | null;
};
type OAuthNamespace = {
  getAuthorizationDetails: (id: string) => Promise<OAuthResult>;
  approveAuthorization: (id: string) => Promise<OAuthResult>;
  denyAuthorization: (id: string) => Promise<OAuthResult>;
};
const authOAuth = (supabase.auth as unknown as { oauth: OAuthNamespace }).oauth;

export default function OAuthConsentPage() {
  const [params] = useSearchParams();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<OAuthResult["data"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) return setError("Missing authorization_id");
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        const next = window.location.pathname + window.location.search;
        window.location.href = "/auth?next=" + encodeURIComponent(next);
        return;
      }
      const { data, error } = await authOAuth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (error) return setError(error.message);
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data ?? null);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error } = approve
      ? await authOAuth.approveAuthorization(authorizationId)
      : await authOAuth.denyAuthorization(authorizationId);
    if (error) {
      setBusy(false);
      return setError(error.message);
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      return setError("No redirect returned by the authorization server.");
    }
    window.location.href = target;
  }

  if (error) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 safe-top safe-bottom">
        <div className="w-full max-w-sm text-center">
          <h1 className="text-xl font-display font-bold mb-2">Authorization error</h1>
          <p className="font-body text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }
  if (!details) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <p className="font-body text-sm text-muted-foreground">Loading…</p>
      </main>
    );
  }

  const clientName = details.client?.name ?? "an external app";
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 safe-top safe-bottom">
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Shield className="h-6 w-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight">ParentPilot</h1>
            <p className="text-xs font-body text-muted-foreground">Authorize connection</p>
          </div>
        </div>

        <h2 className="text-lg font-display font-bold mb-3">
          Connect {clientName} to your account
        </h2>
        <p className="font-body text-sm text-muted-foreground mb-6">
          This lets {clientName} use ParentPilot as you. It can read your children's profiles, your recent SOS incidents, and coaching suggestions. It cannot bypass ParentPilot's permissions.
        </p>

        <div className="space-y-3">
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary px-6 py-3.5 font-display text-sm font-bold text-primary-foreground active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <Check className="h-4 w-4" /> Approve
          </button>
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-secondary px-6 py-3.5 font-display text-sm font-bold active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            <X className="h-4 w-4" /> Cancel connection
          </button>
        </div>
      </div>
    </main>
  );
}
