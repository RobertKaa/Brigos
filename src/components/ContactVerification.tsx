import { useEffect, useRef, useState } from "react";
type Turnstile = {
  render: (element: HTMLElement, options: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: Turnstile;
  }
}
let loading: Promise<Turnstile> | null = null;
function loadTurnstile() {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (!loading)
    loading = new Promise<Turnstile>((resolve, reject) => {
      const script = document.createElement("script");
      script.src =
        "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.onload = () =>
        window.turnstile
          ? resolve(window.turnstile)
          : reject(new Error("unavailable"));
      script.onerror = () => {
        script.remove();
        reject(new Error("unavailable"));
      };
      document.head.append(script);
    }).catch((error) => {
      loading = null;
      throw error;
    });
  return loading;
}
export function ContactVerification({
  siteKey,
  onToken,
}: {
  siteKey: string;
  onToken: (token: string) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let cancelled = false;
    let widget: string | undefined;
    let api: Turnstile | undefined;
    setError(false);
    void loadTurnstile()
      .then((turnstile) => {
        if (cancelled || !container.current) return;
        api = turnstile;
        widget = turnstile.render(container.current, {
          sitekey: siteKey,
          action: "contact",
          theme: "auto",
          size: "flexible",
          language: "fr",
          callback: onToken,
          "expired-callback": () => onToken(""),
          "error-callback": () => {
            onToken("");
            setError(true);
          },
        });
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
      if (widget !== undefined) api?.remove(widget);
    };
  }, [siteKey, onToken, attempt]);
  return (
    <div className="contact-verification">
      <div ref={container} />
      {error && (
        <div role="status">
          <p>La vérification de sécurité n’a pas pu se charger.</p>
          <button
            type="button"
            className="button button-secondary"
            onClick={() => setAttempt((value) => value + 1)}
          >
            Réessayer la vérification
          </button>
        </div>
      )}
    </div>
  );
}
