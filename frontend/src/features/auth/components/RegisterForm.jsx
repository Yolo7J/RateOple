import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router-dom";
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

    const validatePassword = (password) => {
        const regex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
        return regex.test(password);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (form.password !== form.confirmPassword) {
            return setError("Passwords do not match");
        }

        if (!validatePassword(form.password)) {
            return setError("Password does not meet requirements");
        }

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
                required
                onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
                type="text"
                placeholder={t("auth.username")}
                required
                onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <Input
                type="password"
                placeholder={t("auth.password")}
                required
                onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <Input
                type="password"
                placeholder={t("auth.confirmPassword")}
                required
                onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                }
            />
            {error && <InlineMessage tone="error">{error}</InlineMessage>}
            <Button type="submit" variant="primary">
                {t("auth.register")}
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
                {t("auth.haveAccount")} <Link to={loginUrl}>{t("auth.login")}</Link>
            </p>
        </form>
    );
};

export default RegisterForm;
