import "./AuthCard.css";

const AuthCard = ({ title, children }) => {
  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default AuthCard;
