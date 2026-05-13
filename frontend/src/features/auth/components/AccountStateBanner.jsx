import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MailWarning, ShieldAlert } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { authService, getAuthErrorMessage } from '../services/authService';
import Button from '../../../shared/ui/Button';

const AccountStateBanner = () => {
  const { user } = useAuth();
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);

  if (!user || user.accountState === 'confirmed') return null;

  const resend = async () => {
    if (!user.email || isSending) return;
    setIsSending(true);
    setMessage('');
    setError('');
    try {
      await authService.resendConfirmation(user.email);
      setMessage('Confirmation email sent.');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Could not send confirmation email.'));
    } finally {
      setIsSending(false);
    }
  };

  if (user.isSuspended) {
    return (
      <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-[var(--text-primary)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
          <ShieldAlert className="h-4 w-4 shrink-0 text-amber-400" aria-hidden="true" />
          <span className="font-medium">Your account is suspended. You can browse read-only and submit a suspension appeal.</span>
          <Button as={Link} to="/suspension-appeal" size="sm" variant="ghost">
            Appeal
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="border-b border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-[var(--text-primary)]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3">
        <MailWarning className="h-4 w-4 shrink-0 text-sky-400" aria-hidden="true" />
        <span className="font-medium">Confirm your email to create ratings, reviews, groups, and collections.</span>
        <Button size="sm" variant="ghost" onClick={resend} disabled={isSending || !user.email}>
          {isSending ? 'Sending...' : 'Resend confirmation'}
        </Button>
        {message ? <span className="text-emerald-400">{message}</span> : null}
        {error ? <span className="text-red-400">{error}</span> : null}
      </div>
    </div>
  );
};

export default AccountStateBanner;
