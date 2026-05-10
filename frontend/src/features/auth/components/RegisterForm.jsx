import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
import { AtSign, Lock, UserRound } from 'lucide-react';
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

const RegisterForm = () => {
    const { t } = useLanguage();
    const { register } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const returnUrl = normalizeLocalReturnUrl(searchParams.get("returnUrl") || location.state?.from);
    const loginUrl = buildAuthEntryUrl("/login", returnUrl);

    const [form, setForm] = useState({
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState(location.state?.authError ?? "");
    const [startingGoogle, setStartingGoogle] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const isBusy = isSubmitting || startingGoogle;

    const validatePassword = (password) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
        return regex.test(password);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setError("");

        if (form.password !== form.confirmPassword) {
            return setError(t("auth.passwordMismatch"));
        }

        if (!validatePassword(form.password)) {
            return setError(t("auth.passwordRequirementError"));
        }

        setIsSubmitting(true);

        try {
            await register({
                email: form.email,
                username: form.username,
                password: form.password,
            });

            // Redirect to login and pre-fill email so the user can sign in immediately
            navigate(loginUrl, { state: { email: form.email } });
        } catch (err) {
            setError(getAuthErrorMessage(err, "Registration failed"));
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
            <FormField label={t("auth.email")} id="register-email">
                {({ id }) => (
                    <div className="auth-input-wrap">
                        <AtSign className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        <Input
                            id={id}
                            type="email"
                            placeholder={t("auth.emailPlaceholder")}
                            autoComplete="email"
                            value={form.email}
                            disabled={isBusy}
                            required
                            onChange={(e) => setForm({ ...form, email: e.target.value })}
                        />
                    </div>
                )}
            </FormField>
            <FormField label={t("auth.username")} id="register-username">
                {({ id }) => (
                    <div className="auth-input-wrap">
                        <UserRound className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        <Input
                            id={id}
                            type="text"
                            placeholder={t("auth.usernamePlaceholder")}
                            autoComplete="username"
                            value={form.username}
                            disabled={isBusy}
                            required
                            onChange={(e) => setForm({ ...form, username: e.target.value })}
                        />
                    </div>
                )}
            </FormField>
            <FormField label={t("auth.password")} id="register-password">
                {({ id }) => (
                    <div className="auth-input-wrap">
                        <Lock className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        <Input
                            id={id}
                            type="password"
                            placeholder={t("auth.passwordPlaceholder")}
                            autoComplete="new-password"
                            value={form.password}
                            disabled={isBusy}
                            required
                            onChange={(e) => setForm({ ...form, password: e.target.value })}
                        />
                    </div>
                )}
            </FormField>
            <FormField label={t("auth.confirmPassword")} id="register-confirm-password" hint={t("auth.passwordRequirements")}>
                {({ id }) => (
                    <div className="auth-input-wrap">
                        <Lock className="h-4 w-4" strokeWidth={2.25} aria-hidden="true" />
                        <Input
                            id={id}
                            type="password"
                            placeholder={t("auth.confirmPasswordPlaceholder")}
                            autoComplete="new-password"
                            value={form.confirmPassword}
                            disabled={isBusy}
                            required
                            onChange={(e) =>
                                setForm({ ...form, confirmPassword: e.target.value })
                            }
                        />
                    </div>
                )}
            </FormField>
            {error && <InlineMessage tone="error">{error}</InlineMessage>}
            <div className="auth-actions">
                <Button type="submit" variant="primary" disabled={isBusy}>
                    {isSubmitting ? t("auth.registerLoading") : t("auth.register")}
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
                {t("auth.haveAccount")} <Link to={loginUrl}>{t("auth.login")}</Link>
            </p>
        </form>
    );
};

export default RegisterForm;
