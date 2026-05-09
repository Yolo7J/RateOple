import { useState } from 'react';
import InlineMessage from '../../../shared/ui/InlineMessage';

const styles = {
  form: [
    'flex min-w-0 flex-col gap-3 rounded-lg border border-[var(--border)]',
    'bg-[var(--card-bg)] p-4',
  ].join(' '),
  label: 'text-sm font-semibold text-[var(--text-primary)]',
  hint: 'text-xs text-[var(--text-muted)]',
  textarea: [
    'min-w-0 resize-y rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
    'focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color-alpha)]',
  ].join(' '),
  button: [
    'w-fit max-w-full rounded-lg border border-[var(--border)] bg-[var(--button-bg)] px-4 py-2',
    'text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--button-hover-bg)]',
    'disabled:cursor-not-allowed disabled:opacity-60',
  ].join(' '),
};

function TargetReviewComposer({
  targetLabel,
  ratingId,
  userRating,
  user,
  submitting = false,
  disabled = false,
  onSubmit,
  onSuccess,
  lockedMessage,
  signedOutMessage,
}) {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const targetName = targetLabel || 'title';
  const article = /^[aeiou]/i.test(targetName) ? 'an' : 'a';
  const canSubmit = Boolean(user && ratingId && content.trim() && !submitting && !disabled);

  if (!user) {
    return <InlineMessage tone="info">{signedOutMessage || `Sign in and rate this ${targetName} to write a review.`}</InlineMessage>;
  }

  if (!ratingId) {
    return <InlineMessage tone="info">{lockedMessage || `Rate this ${targetName} first to write a review.`}</InlineMessage>;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    const trimmed = content.trim();
    if (!trimmed) {
      setError('Review content is required.');
      return;
    }

    setError('');
    try {
      await onSubmit({ ratingId, content: trimmed });
      setContent('');
      await onSuccess?.();
    } catch (submissionError) {
      setError(submissionError?.response?.data?.message || submissionError?.message || 'Could not post review.');
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <div>
        <label className={styles.label} htmlFor={`review-content-${targetName}`}>
          Write {article} {targetName} review
        </label>
        {userRating ? <p className={styles.hint}>Posting with your {userRating}/10 rating.</p> : null}
      </div>
      <textarea
        className={styles.textarea}
        id={`review-content-${targetName}`}
        value={content}
        onChange={(event) => setContent(event.target.value)}
        rows={4}
        disabled={disabled || submitting}
        maxLength={8000}
        placeholder={`Share your thoughts on this ${targetName}`}
      />
      {error ? <InlineMessage tone="error">{error}</InlineMessage> : null}
      <button className={styles.button} type="submit" disabled={!canSubmit}>
        {submitting ? 'Posting...' : 'Post review'}
      </button>
    </form>
  );
}

export default TargetReviewComposer;
