import AuthCard from "../../components/auth/AuthCard";
import LoginForm from "../../components/auth/LoginForm";
import { useLanguage } from "../../hooks/useLanguage";
import Header from "../../components/layout/Header/Header"

const LoginPage = () => {
  const { t } = useLanguage();

  return (
    <>
        <Header />
    <AuthCard title={t("auth.login")}>
      <LoginForm />
    </AuthCard>
    </>
  );
};

export default LoginPage;
