import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import InlineMessage from "../../../shared/ui/InlineMessage";

const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise;

function loadTurnstileScript() {
    if (window.turnstile) {
        return Promise.resolve(window.turnstile);
    }

    if (!scriptPromise) {
        scriptPromise = new Promise((resolve, reject) => {
            const existing = document.querySelector(`script[src="${SCRIPT_SRC}"]`);
            if (existing) {
                existing.addEventListener("load", () => resolve(window.turnstile));
                existing.addEventListener("error", reject);
                return;
            }

            const script = document.createElement("script");
            script.src = SCRIPT_SRC;
            script.async = true;
            script.defer = true;
            script.onload = () => resolve(window.turnstile);
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    return scriptPromise;
}

const TurnstileCaptcha = forwardRef(function TurnstileCaptcha(
    { siteKey, action, disabled = false, onTokenChange, onError },
    ref
) {
    const containerRef = useRef(null);
    const widgetIdRef = useRef(null);
    const [loadError, setLoadError] = useState("");

    useImperativeHandle(ref, () => ({
        reset() {
            onTokenChange("");
            if (window.turnstile && widgetIdRef.current !== null) {
                window.turnstile.reset(widgetIdRef.current);
            }
        }
    }), [onTokenChange]);

    useEffect(() => {
        let cancelled = false;

        if (!siteKey || !containerRef.current) {
            return undefined;
        }

        loadTurnstileScript()
            .then((turnstile) => {
                if (cancelled || !turnstile || !containerRef.current || widgetIdRef.current !== null) {
                    return;
                }

                widgetIdRef.current = turnstile.render(containerRef.current, {
                    sitekey: siteKey,
                    action,
                    callback: (token) => {
                        setLoadError("");
                        onTokenChange(token);
                    },
                    "expired-callback": () => {
                        onTokenChange("");
                    },
                    "error-callback": () => {
                        onTokenChange("");
                        onError?.("CAPTCHA verification failed. Please try again.");
                    }
                });
            })
            .catch(() => {
                if (!cancelled) {
                    setLoadError("CAPTCHA could not load. Please refresh and try again.");
                    onTokenChange("");
                }
            });

        return () => {
            cancelled = true;
            if (window.turnstile && widgetIdRef.current !== null) {
                window.turnstile.remove?.(widgetIdRef.current);
                widgetIdRef.current = null;
            }
        };
    }, [action, onError, onTokenChange, siteKey]);

    return (
        <div className="auth-captcha" aria-disabled={disabled}>
            <div ref={containerRef} data-testid={`${action}-turnstile`} />
            {loadError ? <InlineMessage tone="error">{loadError}</InlineMessage> : null}
        </div>
    );
});

export default TurnstileCaptcha;
