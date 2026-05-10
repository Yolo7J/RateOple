import AuthCard from "../components/AuthCard";
import LoginForm from "../components/LoginForm";
import { useLanguage } from "../../../hooks/useLanguage";

const LoginPage = () => {
  const { t } = useLanguage();

  return (
    <AuthCard
      eyebrow={t("auth.positioning")}
      title={t("auth.loginTitle")}
      subtitle={t("auth.loginSubtitle")}
    >
      <LoginForm />
    </AuthCard>
  );
};

export default LoginPage;
