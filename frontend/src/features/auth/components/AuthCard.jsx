import { useId } from 'react';

const AuthCard = ({ eyebrow, title, subtitle, children }) => {
  const titleId = useId();

  return (
      <div className="auth-card" aria-labelledby={titleId}>
        <div className="auth-card__header">
          {eyebrow ? <span className="auth-card__eyebrow">{eyebrow}</span> : null}
          <h2 id={titleId}>{title}</h2>
          {subtitle ? <p className="auth-card__subtitle">{subtitle}</p> : null}
        </div>
        {children}
      </div>
  );
};

export default AuthCard;
