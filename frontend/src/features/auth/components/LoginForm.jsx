import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useLanguage } from "../../../hooks/useLanguage";
import { useAuth } from "../../../context/AuthContext";

const styles = {
    form: 'flex flex-col gap-4',
    input: [
        'rounded-lg border border-[var(--search-border)] bg-[var(--bg-primary)] px-3 py-2',
        'text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]',
    ].join(' '),
    primaryButton: [
        'rounded-lg bg-[var(--primary-color)] px-4 py-2 text-sm font-semibold text-white',
        'transition hover:bg-[var(--secondary-color)]',
    ].join(' '),
    secondaryButton: [
        'rounded-lg border border-[var(--button-border)] bg-[var(--button-bg)] px-4 py-2 text-sm',
        'text-[var(--text-primary)] transition hover:bg-[var(--button-hover-bg)]',
    ].join(' '),
    divider: 'text-center text-sm text-[var(--text-secondary)]',
    error: 'text-sm text-red-500',
    switch: 'text-center text-sm text-[var(--text-secondary)]',
};

const LoginForm = () => {
    const { t } = useLanguage();
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Pre-fill email if redirected from registration
    const [email, setEmail] = useState(location.state?.email ?? "");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        try {
            await login(email, password);
            navigate(location.state?.from || "/");
        } catch (err) {
            setError(err.response?.data || "Invalid credentials");
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <input
                className={styles.input}
                type="email"
                placeholder={t("auth.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
            />
            <input
                className={styles.input}
                type="password"
                placeholder={t("auth.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
            />
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.primaryButton}>
                {t("auth.login")}
            </button>
            <div className={styles.divider}>{t("auth.or")}</div>
            <button type="button" className={styles.secondaryButton}>
                {t("auth.google")}
            </button>
            <p className={styles.switch}>
                {t("auth.noAccount")} <Link to="/register">{t("auth.register")}</Link>
            </p>
        </form>
    );
};

export default LoginForm;
