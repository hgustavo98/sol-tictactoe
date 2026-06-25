import { useCallback, useEffect, useState } from "react";
import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";
import { useWallet } from "@solana/wallet-adapter-react";
import bs58 from "bs58";
import { Check, Mail, Shield, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { getApiBase } from "../config/apiBase";
import { useWalletModal } from "../components/wallet/WalletModalContext";
import { cn } from "@/lib/utils";
import "./admin.css";

const GATE_FLOW_KEY = "sol-ttt-admin-gate-flow";

type GateStep = 1 | 2 | 3;

interface AdminGateLoginProps {
  onComplete: (token: string) => void;
}

function StepBadge({
  n,
  label,
  done,
  active,
}: {
  n: number;
  label: string;
  done: boolean;
  active: boolean;
}) {
  return (
    <div
      className={cn(
        "admin-gate-step",
        done && "admin-gate-step--done",
        active && "admin-gate-step--active",
      )}
    >
      <span className="admin-gate-step-num">
        {done ? <Check className="size-3.5" /> : n}
      </span>
      <span className="admin-gate-step-label">{label}</span>
    </div>
  );
}

function shortenWallet(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function AdminGateLoginForm({ onComplete }: AdminGateLoginProps) {
  const { t } = useTranslation();
  const wallet = useWallet();
  const { openWalletModal } = useWalletModal();
  const [step, setStep] = useState<GateStep>(1);
  const [email, setEmail] = useState("");
  const [flowToken, setFlowToken] = useState<string | null>(() =>
    sessionStorage.getItem(GATE_FLOW_KEY),
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleConfigured, setGoogleConfigured] = useState(
    Boolean(import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()),
  );

  useEffect(() => {
    fetch(`${getApiBase()}/api/admin/auth/gate/config`)
      .then((r) => r.json())
      .then((data: { googleClientId?: string | null }) => {
        if (data.googleClientId) setGoogleConfigured(true);
        else if (!import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()) {
          setGoogleConfigured(false);
        }
      })
      .catch(() => {
        if (!import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim()) {
          setGoogleConfigured(false);
        }
      });
  }, []);

  useEffect(() => {
    if (flowToken && step === 1) setStep(2);
  }, [flowToken, step]);

  useEffect(() => {
    if (step !== 3 || wallet.connected) return;
    const id = window.setTimeout(() => openWalletModal(), 150);
    return () => window.clearTimeout(id);
  }, [step, wallet.connected, openWalletModal]);

  const persistFlow = useCallback((token: string, nextStep: GateStep) => {
    sessionStorage.setItem(GATE_FLOW_KEY, token);
    setFlowToken(token);
    setStep(nextStep);
  }, []);

  const resetFlow = useCallback(() => {
    sessionStorage.removeItem(GATE_FLOW_KEY);
    setFlowToken(null);
    setStep(1);
    setError(null);
  }, []);

  const submitEmail = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/auth/gate/email`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "E-mail inválido");
      }
      const data = (await res.json()) as { flowToken: string; step: 2 };
      persistFlow(data.flowToken, 2);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const submitGoogle = async (idToken: string) => {
    if (!flowToken) {
      setError(t("admin.gate.sessionExpired"));
      resetFlow();
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${getApiBase()}/api/admin/auth/gate/google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowToken, idToken }),
      });
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Google inválido");
      }
      persistFlow(flowToken, 3);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  const submitWallet = async () => {
    if (!flowToken) {
      setError(t("admin.gate.sessionExpired"));
      resetFlow();
      return;
    }
    if (!wallet.publicKey) {
      setError(t("admin.gate.walletRequired"));
      return;
    }

    const signMessage =
      wallet.signMessage ??
      (wallet.wallet?.adapter && "signMessage" in wallet.wallet.adapter
        ? wallet.wallet.adapter.signMessage?.bind(wallet.wallet.adapter)
        : undefined);

    if (!signMessage) {
      setError(t("admin.gate.walletSignUnsupported"));
      return;
    }

    const address = wallet.publicKey.toBase58();
    setLoading(true);
    setError(null);
    try {
      const challengeRes = await fetch(`${getApiBase()}/api/admin/auth/gate/challenge`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flowToken, wallet: address }),
      });
      if (!challengeRes.ok) {
        const body = (await challengeRes.json()) as { error?: string };
        throw new Error(body.error ?? "Falha no challenge");
      }
      const challenge = (await challengeRes.json()) as {
        nonce: string;
        message: string;
      };

      const signed = await signMessage(
        new TextEncoder().encode(challenge.message),
      );
      const signature = bs58.encode(signed);

      const loginRes = await fetch(`${getApiBase()}/api/admin/auth/gate/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          flowToken,
          wallet: address,
          signature,
          nonce: challenge.nonce,
        }),
      });
      if (!loginRes.ok) {
        const body = (await loginRes.json()) as { error?: string };
        throw new Error(body.error ?? "Login falhou");
      }
      const data = (await loginRes.json()) as { token: string };
      sessionStorage.removeItem(GATE_FLOW_KEY);
      onComplete(data.token);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-shell admin-gate-center">
      <div className="admin-gate-card">
        <h1>{t("admin.gate.title")}</h1>
        <p className="admin-muted">{t("admin.gate.subtitle")}</p>

        <div className="admin-gate-steps">
          <StepBadge
            n={1}
            label={t("admin.gate.stepEmail")}
            done={step > 1}
            active={step === 1}
          />
          <StepBadge
            n={2}
            label={t("admin.gate.stepGoogle")}
            done={step > 2}
            active={step === 2}
          />
          <StepBadge
            n={3}
            label={t("admin.gate.stepWallet")}
            done={false}
            active={step === 3}
          />
        </div>

        {step === 1 && (
          <section className="admin-gate-panel">
            <div className="admin-gate-panel-head">
              <Mail className="size-5 text-primary" />
              <h2>{t("admin.gate.emailTitle")}</h2>
            </div>
            <label className="admin-field">
              <span>{t("admin.gate.emailLabel")}</span>
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
              />
            </label>
            <button
              type="button"
              className="admin-btn admin-btn--primary w-full"
              disabled={loading || !email.trim()}
              onClick={() => void submitEmail()}
            >
              {t("admin.gate.continue")}
            </button>
          </section>
        )}

        {step === 2 && (
          <section className="admin-gate-panel">
            <div className="admin-gate-panel-head">
              <Shield className="size-5 text-primary" />
              <h2>{t("admin.gate.googleTitle")}</h2>
            </div>
            <p className="admin-muted text-sm">{t("admin.gate.googleHint")}</p>
            {googleConfigured && (
              <p className="admin-muted text-xs leading-relaxed">
                {t("admin.gate.googleOriginHint", {
                  origin: typeof window !== "undefined" ? window.location.origin : "",
                })}
              </p>
            )}
            {googleConfigured ? (
              <div className="admin-gate-google">
                <GoogleLogin
                  onSuccess={(cred) => {
                    if (cred.credential) void submitGoogle(cred.credential);
                  }}
                  onError={() =>
                    setError(
                      t("admin.gate.googleOriginMismatch", {
                        origin: window.location.origin,
                      }),
                    )
                  }
                  theme="filled_black"
                  size="large"
                  width="320"
                  text="signin_with"
                  shape="pill"
                />
              </div>
            ) : (
              <p className="admin-warning">{t("admin.gate.googleNotConfigured")}</p>
            )}
            <button
              type="button"
              className="admin-btn w-full"
              onClick={resetFlow}
              disabled={loading}
            >
              {t("admin.gate.back")}
            </button>
          </section>
        )}

        {step === 3 && (
          <section className="admin-gate-panel">
            <div className="admin-gate-panel-head">
              <Wallet className="size-5 text-primary" />
              <h2>{t("admin.gate.walletTitle")}</h2>
            </div>
            <p className="admin-muted text-sm">{t("admin.gate.walletHint")}</p>
            <div className="admin-wallet-login">
              {wallet.connected && wallet.publicKey ? (
                <div className="admin-wallet-connected">
                  <span className="admin-wallet-connected-label">
                    {t("profile.connected")}
                  </span>
                  <span className="admin-wallet-connected-addr">
                    {shortenWallet(wallet.publicKey.toBase58())}
                  </span>
                  <button
                    type="button"
                    className="admin-btn"
                    onClick={() => void wallet.disconnect()}
                  >
                    {t("wallet.disconnect")}
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="admin-btn admin-btn--primary w-full admin-wallet-connect-btn"
                  onClick={() => openWalletModal()}
                >
                  <Wallet className="size-4 shrink-0" aria-hidden />
                  {t("wallet.connect")}
                </button>
              )}
              {!wallet.connected && (
                <p className="admin-muted text-center text-xs">
                  {t("admin.gate.walletModalHint")}
                </p>
              )}
            </div>
            <button
              type="button"
              className="admin-btn admin-btn--primary w-full"
              disabled={loading || !wallet.connected}
              onClick={() => void submitWallet()}
            >
              {t("admin.gate.signAndEnter")}
            </button>
            <button
              type="button"
              className="admin-btn w-full"
              onClick={() => {
                setStep(2);
                setError(null);
              }}
            >
              {t("admin.gate.back")}
            </button>
          </section>
        )}

        {error && <p className="admin-error">{error}</p>}
      </div>
    </div>
  );
}

function resolveGoogleClientId(serverId: string | null | undefined): string {
  const viteId = import.meta.env.VITE_GOOGLE_CLIENT_ID?.trim();
  if (viteId) return viteId;
  return serverId?.trim() ?? "";
}

export function AdminGateLogin(props: AdminGateLoginProps) {
  const { t } = useTranslation();
  const [clientId, setClientId] = useState(() =>
    resolveGoogleClientId(import.meta.env.VITE_GOOGLE_CLIENT_ID),
  );
  const [loadingConfig, setLoadingConfig] = useState(!clientId);

  useEffect(() => {
    if (clientId) {
      setLoadingConfig(false);
      return;
    }
    fetch(`${getApiBase()}/api/admin/auth/gate/config`)
      .then((r) => r.json())
      .then((data: { googleClientId?: string | null }) => {
        setClientId(resolveGoogleClientId(data.googleClientId));
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, [clientId]);

  if (loadingConfig) {
    return (
      <div className="admin-shell admin-gate-center">
        <div className="admin-gate-card">
          <p className="admin-muted">{t("admin.loading")}</p>
        </div>
      </div>
    );
  }

  if (!clientId) {
    return <AdminGateLoginForm {...props} />;
  }

  return (
    <GoogleOAuthProvider clientId={clientId}>
      <AdminGateLoginForm {...props} />
    </GoogleOAuthProvider>
  );
}
