import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { authService, getAuthErrorMessage } from '../services/authService';
import Button from '../../../shared/ui/Button';
import FormField from '../../../shared/ui/FormField';
import Input from '../../../shared/ui/Input';
import InlineMessage from '../../../shared/ui/InlineMessage';

const ResetPasswordPage = () => {
  const [searchParams] = useSearchParams();
  const initialEmail = useMemo(() => searchParams.get('email') || '', [searchParams]);
  const token = searchParams.get('token') || '';
  const [email, setEmail] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setMessage('');
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      await authService.resetPassword({ email, token, newPassword: password });
      setMessage('Password reset. You can now sign in with the new password.');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Password reset failed.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard eyebrow="Account recovery" title="Reset password" subtitle="Choose a new password for your RateOple account.">
      <form onSubmit={submit} className="auth-form">
        <FormField label="Email" id="reset-email">
          {({ id }) => (
            <Input id={id} type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          )}
        </FormField>
        <FormField label="New password" id="reset-password">
          {({ id }) => (
            <Input id={id} type="password" autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          )}
        </FormField>
        <FormField label="Confirm password" id="reset-confirm-password">
          {({ id }) => (
            <Input id={id} type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required />
          )}
        </FormField>
        {!token ? <InlineMessage tone="error">Reset token is missing from this link.</InlineMessage> : null}
        {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
        <div className="auth-actions">
          <Button type="submit" variant="primary" disabled={isSubmitting || !token}>
            {isSubmitting ? 'Resetting...' : 'Reset password'}
          </Button>
        </div>
        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </AuthCard>
  );
};

export default ResetPasswordPage;
