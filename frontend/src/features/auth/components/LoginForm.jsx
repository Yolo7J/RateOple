import { useState } from "react";
import { Link, useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useLanguage } from "../../../hooks/useLanguage";
import { useAuth } from "../../../context/AuthContext";
import { getAuthErrorMessage } from "../services/authService";
import {
    buildAuthEntryUrl,
    normalizeLocalReturnUrl,
    startGoogleLogin,
} from "../services/googleAuthService";
import Button from "../../../shared/ui/Button";
import Input from "../../../shared/ui/Input";
import InlineMessage from "../../../shared/ui/InlineMessage";

const styles = {
    form: 'flex flex-col gap-4',
    divider: 'text-center text-sm text-[var(--text-secondary)]',
    switch: 'text-center text-sm text-[var(--text-secondary)]',
};

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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            await login(email, password);
            navigate(returnUrl, { replace: true });
        } catch (err) {
            setError(getAuthErrorMessage(err, "Invalid credentials"));
        }
    };

    const handleGoogleLogin = () => {
        setStartingGoogle(true);
        startGoogleLogin(returnUrl);
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <Input
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <Input
                type="password"
                placeholder={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            {error && <InlineMessage tone="error">{error}</InlineMessage>}
            <Button type="submit" variant="primary">
                {t("auth.login")}
            </Button>
            <div className={styles.divider}>{t("auth.or")}</div>
            <Button
                type="button"
                onClick={handleGoogleLogin}
                disabled={startingGoogle}
            >
                {startingGoogle ? t("auth.googleRedirecting") : t("auth.google")}
            </Button>
            <p className={styles.switch}>
                {t("auth.noAccount")} <Link to={registerUrl}>{t("auth.register")}</Link>
            </p>
        </form>
    );
};

export default LoginForm;
