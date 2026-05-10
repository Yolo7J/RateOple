import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { AtSign, Lock } from 'lucide-react';
import { useLanguage } from "../../../hooks/useLanguage";
import { useAuth } from "../../../context/AuthContext";
import { getAuthErrorMessage } from "../services/authService";
import {
    buildAuthEntryUrl,
    normalizeLocalReturnUrl,
    startGoogleLogin,
} from "../services/googleAuthService";
import Button from "../../../shared/ui/Button";
import FormField from "../../../shared/ui/FormField";
import Input from "../../../shared/ui/Input";
import InlineMessage from "../../../shared/ui/InlineMessage";

const LoginForm = () => {
    const { t } = useLanguage();
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const returnUrl = normalizeLocalReturnUrl(searchParams.get("returnUrl") || location.state?.from);
    const registerUrl = buildAuthEntryUrl("/register", returnUrl);

    // Pre-fill email if redirected from registration
    const [email, setEmail] = useState(location.state?.email ?? "");
    const [password, setPassword] = useState("");
    const [error, setError] = useState(location.state?.authError ?? "");
    const [startingGoogle, setStartingGoogle] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isBusy = isSubmitting || startingGoogle;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError("");
        setIsSubmitting(true);

        try {
            await login(email, password);
            navigate(returnUrl, { replace: true });
        } catch (err) {
            setError(getAuthErrorMessage(err, "Invalid credentials"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleGoogleLogin = () => {
        setStartingGoogle(true);
        startGoogleLogin(returnUrl);
    };

    return (
        <form onSubmit={handleSubmit} className="auth-form">
            <FormField label={t("auth.email")} id="login-email">
                {({ id }) => (
                    <div className="auth-input-wrap">
                        <AtSign className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        <Input
                            id={id}
                            type="email"
                            placeholder={t("auth.emailPlaceholder")}
                            autoComplete="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={isBusy}
                            required
                        />
                    </div>
                )}
            </FormField>
            <FormField label={t("auth.password")} id="login-password">
                {({ id }) => (
                    <div className="auth-input-wrap">
                        <Lock className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        <Input
                            id={id}
                            type="password"
                            placeholder={t("auth.passwordPlaceholder")}
                            autoComplete="current-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={isBusy}
                            required
                        />
                    </div>
                )}
            </FormField>
            {error && <InlineMessage tone="error">{error}</InlineMessage>}
            <div className="auth-actions">
                <Button type="submit" variant="primary" disabled={isBusy}>
                    {isSubmitting ? t("auth.loginLoading") : t("auth.login")}
                </Button>
            </div>
            <div className="auth-divider">{t("auth.or")}</div>
            <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={isBusy}
            >
                <span className="auth-google-mark" aria-hidden="true">G</span>
                {startingGoogle ? t("auth.googleRedirecting") : t("auth.google")}
            </Button>
            <p className="auth-switch">
                {t("auth.noAccount")} <Link to={registerUrl}>{t("auth.register")}</Link>
            </p>
        </form>
    );
};

export default LoginForm;
