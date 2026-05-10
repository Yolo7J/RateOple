import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { useLanguage } from '../../../hooks/useLanguage';
import { useAuth } from '../../../context/AuthContext';
import {
  buildAuthEntryUrl,
  getGoogleAuthErrorMessage,
  normalizeLocalReturnUrl,
} from '../services/googleAuthService';

const styles = {
  stack: 'flex flex-col gap-3 text-center',
  message: 'text-sm text-[var(--text-secondary)]',
};

function ExternalLoginCallbackPage() {
  const { t } = useLanguage();
  const { refreshSession } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [message, setMessage] = useState(t('auth.googleCompleting'));

  const externalLoginResult = searchParams.get('externalLogin');
  const externalLoginError = searchParams.get('error');
  const returnUrl = useMemo(
    () => normalizeLocalReturnUrl(searchParams.get('returnUrl')),
    [searchParams]
  );

  useEffect(() => {
    let active = true;

    const redirectToLogin = (errorMessage) => {
      navigate(buildAuthEntryUrl('/login', returnUrl), {
        replace: true,
        state: { authError: errorMessage },
      });
    };

    if (!externalLoginResult) {
      navigate(buildAuthEntryUrl('/login', returnUrl), { replace: true });
      return () => {
        active = false;
      };
    }

    if (externalLoginResult !== 'success') {
      redirectToLogin(getGoogleAuthErrorMessage(externalLoginError));
      return () => {
        active = false;
      };
    }

    const completeExternalLogin = async () => {
      setMessage(t('auth.googleCompleting'));

      const session = await refreshSession();
      if (!active) return;

      if (session) {
        navigate(returnUrl, { replace: true });
        return;
      }

      redirectToLogin(getGoogleAuthErrorMessage(externalLoginError));
    };

    completeExternalLogin().catch(() => {
      if (!active) return;
      redirectToLogin(getGoogleAuthErrorMessage(externalLoginError));
    });

    return () => {
      active = false;
    };
  }, [externalLoginError, externalLoginResult, navigate, refreshSession, returnUrl, t]);

  return (
    <AuthCard
      eyebrow={t('auth.positioning')}
      title={t('auth.google')}
      subtitle={t('auth.googleCallbackSubtitle')}
    >
      <div className={styles.stack}>
        <p className={styles.message}>{message}</p>
      </div>
    </AuthCard>
  );
}

export default ExternalLoginCallbackPage;
