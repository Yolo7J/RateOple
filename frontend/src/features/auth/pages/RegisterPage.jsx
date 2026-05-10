import AuthCard from "../components/AuthCard";
import RegisterForm from "../components/RegisterForm";
import { useLanguage } from "../../../hooks/useLanguage";

const RegisterPage = () => {
  const { t } = useLanguage();

  return (
    <AuthCard
      eyebrow={t("auth.positioning")}
      title={t("auth.registerTitle")}
      subtitle={t("auth.registerSubtitle")}
    >
      <RegisterForm />
    </AuthCard>
  );
};

export default RegisterPage;
