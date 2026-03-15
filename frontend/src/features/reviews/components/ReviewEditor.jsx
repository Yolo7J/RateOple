import { useState } from 'react';

const styles = {
  form: [
    'flex flex-col gap-3 rounded-xl border border-[var(--border)]',
    'bg-[var(--card-bg)] p-4',
  ].join(' '),
  label: 'text-sm font-semibold text-[var(--text-primary)]',
  textarea: [
    'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
  ].join(' '),
  button: [
    'w-fit rounded-lg border border-[var(--border)] bg-[var(--button-bg)] px-4 py-2',
    'text-sm font-medium text-[var(--text-primary)] transition hover:bg-[var(--button-hover-bg)]',
    'disabled:opacity-60',
  ].join(' '),
};

function ReviewEditor({ onSubmit, disabled = false, submitting = false }) {
    const [content, setContent] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        onSubmit(content.trim());
        setContent('');
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="review-content">Write a review</label>
            <textarea
                className={styles.textarea}
                id="review-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                disabled={disabled || submitting}
                placeholder="Share your thoughts"
            />
            <button className={styles.button} type="submit" disabled={disabled || submitting || !content.trim()}>
                {submitting ? 'Posting...' : 'Post review'}
            </button>
        </form>
    );
}

export default ReviewEditor;
