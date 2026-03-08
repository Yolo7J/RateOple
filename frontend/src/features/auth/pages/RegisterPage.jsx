import AuthCard from "../components/AuthCard";
import RegisterForm from "../components/RegisterForm";
import { useLanguage } from "../../../hooks/useLanguage";

const RegisterPage = () => {
  const { t } = useLanguage();

  return (
    <>
    <AuthCard title={t("auth.register")}>
      <RegisterForm />
    </AuthCard>
    </>
    
  );
};

export default RegisterPage;
