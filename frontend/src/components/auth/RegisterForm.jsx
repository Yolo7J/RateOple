import { useState } from "react";
import { authMockService } from "../../services/authMockService";
import { Link } from "react-router-dom";
import { useLanguage } from "../../hooks/useLanguage";

const RegisterForm = () => {
  const { t } = useLanguage();

  const [form, setForm] = useState({
    email: "",
    username: "",
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState("");

  const validatePassword = (password) => {
    const regex =
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[\W_]).{6,}$/;
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
      // TODO: Replace with real API call
      const user = await authMockService.register(form);

      console.log("Registered:", user);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <input
        type="email"
        placeholder={t("auth.email")}
        required
        onChange={(e) => setForm({ ...form, email: e.target.value })}
      />

      <input
        type="text"
        placeholder={t("auth.username")}
        required
        onChange={(e) => setForm({ ...form, username: e.target.value })}
      />

      <input
        type="password"
        placeholder={t("auth.password")}
        required
        onChange={(e) => setForm({ ...form, password: e.target.value })}
      />

      <input
        type="password"
        placeholder={t("auth.confirmPassword")}
        required
        onChange={(e) =>
          setForm({ ...form, confirmPassword: e.target.value })
        }
      />

      {error && <p className="auth-error">{error}</p>}

      <button type="submit" className="auth-primary-btn">
        {t("auth.register")}
      </button>

      <div className="auth-divider">{t("auth.or")}</div>

      <button type="button" className="auth-secondary-btn">
        {t("auth.google")}
      </button>

      <p className="auth-switch">
        {t("auth.haveAccount")} <Link to="/login">{t("auth.login")}</Link>
      </p>
    </form>
  );
};

export default RegisterForm;
