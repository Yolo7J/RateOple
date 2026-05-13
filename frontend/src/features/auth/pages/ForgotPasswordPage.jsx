import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { authService, getAuthErrorMessage } from '../services/authService';
import Button from '../../../shared/ui/Button';
import FormField from '../../../shared/ui/FormField';
import Input from '../../../shared/ui/Input';
import InlineMessage from '../../../shared/ui/InlineMessage';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const response = await authService.forgotPassword(email);
      setMessage(response?.message || 'If an account exists, a reset email has been sent.');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Could not process password reset request.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthCard eyebrow="Account recovery" title="Forgot password" subtitle="Enter your email and check your inbox for the reset link.">
      <form onSubmit={submit} className="auth-form">
        <FormField label="Email" id="forgot-email">
          {({ id }) => (
            <Input
              id={id}
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              disabled={isSubmitting}
              required
            />
          )}
        </FormField>
        {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
        <div className="auth-actions">
          <Button type="submit" variant="primary" disabled={isSubmitting}>
            {isSubmitting ? 'Sending...' : 'Send reset email'}
          </Button>
        </div>
        <p className="auth-switch">
          <Link to="/login">Back to login</Link>
        </p>
      </form>
    </AuthCard>
  );
};

export default ForgotPasswordPage;
