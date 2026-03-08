import AuthCard from "../components/AuthCard";
import LoginForm from "../components/LoginForm";
import { useLanguage } from "../../../hooks/useLanguage";

const LoginPage = () => {
  const { t } = useLanguage();

  return (
    <>
    <AuthCard title={t("auth.login")}>
      <LoginForm />
    </AuthCard>
    </>
  );
};

export default LoginPage;
