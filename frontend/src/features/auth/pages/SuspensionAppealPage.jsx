import { useState } from 'react';
import api from '../../../shared/api/apiClient';
import { getAuthErrorMessage } from '../services/authService';
import { useAuth } from '../../../context/AuthContext';
import Button from '../../../shared/ui/Button';
import EmptyState from '../../../shared/ui/EmptyState';
import InlineMessage from '../../../shared/ui/InlineMessage';
import Textarea from '../../../shared/ui/Textarea';

const SuspensionAppealPage = () => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!user?.isSuspended) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10">
        <EmptyState title="No active suspension" description="Suspension appeals are only available for suspended accounts." />
      </div>
    );
  }

  const submit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      await api.post('/suspension-appeals', { text });
      setMessage('Appeal submitted. Staff will review it from the moderation queue.');
      setText('');
    } catch (err) {
      setError(getAuthErrorMessage(err, 'Could not submit appeal.'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <form onSubmit={submit} className="grid gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Suspension appeal</h1>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Submit one clear appeal for your current suspension.</p>
        </div>
        <Textarea
          value={text}
          onChange={(event) => setText(event.target.value)}
          minLength={20}
          maxLength={2000}
          required
          rows={8}
          placeholder="Explain why your suspension should be reviewed."
        />
        {message ? <InlineMessage tone="success">{message}</InlineMessage> : null}
        {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
        <div>
          <Button type="submit" variant="primary" disabled={isSubmitting || text.trim().length < 20}>
            {isSubmitting ? 'Submitting...' : 'Submit appeal'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default SuspensionAppealPage;
