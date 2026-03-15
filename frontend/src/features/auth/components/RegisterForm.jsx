import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
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

const RegisterForm = () => {
    const { t } = useLanguage();
    const { register } = useAuth();
    const navigate = useNavigate();

    const [form, setForm] = useState({
        email: "",
        username: "",
        password: "",
        confirmPassword: "",
    });
    const [error, setError] = useState("");

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
            navigate("/login", { state: { email: form.email } });
        } catch (err) {
            const errors = err.response?.data;
            if (Array.isArray(errors)) {
                setError(errors.map((e) => e.description).join(" "));
            } else {
                setError("Registration failed");
            }
        }
    };

    return (
        <form onSubmit={handleSubmit} className={styles.form}>
            <input
                className={styles.input}
                type="email"
                placeholder={t("auth.email")}
                required
                onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
                className={styles.input}
                type="text"
                placeholder={t("auth.username")}
                required
                onChange={(e) => setForm({ ...form, username: e.target.value })}
            />
            <input
                className={styles.input}
                type="password"
                placeholder={t("auth.password")}
                required
                onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
            <input
                className={styles.input}
                type="password"
                placeholder={t("auth.confirmPassword")}
                required
                onChange={(e) =>
                    setForm({ ...form, confirmPassword: e.target.value })
                }
            />
            {error && <p className={styles.error}>{error}</p>}
            <button type="submit" className={styles.primaryButton}>
                {t("auth.register")}
            </button>
            <div className={styles.divider}>{t("auth.or")}</div>
            <button type="button" className={styles.secondaryButton}>
                {t("auth.google")}
            </button>
            <p className={styles.switch}>
                {t("auth.haveAccount")} <Link to="/login">{t("auth.login")}</Link>
            </p>
        </form>
    );
};

export default RegisterForm;
