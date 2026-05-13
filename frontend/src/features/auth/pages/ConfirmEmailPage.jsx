import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthCard from '../components/AuthCard';
import { authService, getAuthErrorMessage } from '../services/authService';
import Button from '../../../shared/ui/Button';
import InlineMessage from '../../../shared/ui/InlineMessage';

const ConfirmEmailPage = () => {
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';
  const [status, setStatus] = useState('pending');
  const [message, setMessage] = useState('Confirming your email...');

  useEffect(() => {
    let active = true;
    const confirm = async () => {
      if (!email || !token) {
        setStatus('error');
        setMessage('Confirmation link is missing required information.');
        return;
      }
      try {
        await authService.confirmEmail({ email, token });
        if (!active) return;
        setStatus('success');
        setMessage('Email confirmed. You can now create ratings, reviews, groups, and collections.');
      } catch (err) {
        if (!active) return;
        setStatus('error');
        setMessage(getAuthErrorMessage(err, 'Email confirmation failed.'));
      }
    };

    confirm();
    return () => {
      active = false;
    };
  }, [email, token]);

  return (
    <AuthCard eyebrow="Account confirmation" title="Confirm email" subtitle="Your RateOple account needs a confirmed email before writing content.">
      <div className="auth-form">
        <InlineMessage tone={status === 'error' ? 'error' : 'success'}>{message}</InlineMessage>
        <div className="auth-actions">
          <Button as={Link} to="/login" variant="primary">
            Go to login
          </Button>
        </div>
      </div>
    </AuthCard>
  );
};

export default ConfirmEmailPage;
