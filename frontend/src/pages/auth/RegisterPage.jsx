import AuthCard from "../../components/auth/AuthCard";
import RegisterForm from "../../components/auth/RegisterForm";
import { useLanguage } from "../../hooks/useLanguage";
import Header from "../../components/layout/Header/Header"

const RegisterPage = () => {
  const { t } = useLanguage();

  return (
    <>
        <Header />
    <AuthCard title={t("auth.register")}>
      <RegisterForm />
    </AuthCard>
    </>
    
  );
};

export default RegisterPage;
