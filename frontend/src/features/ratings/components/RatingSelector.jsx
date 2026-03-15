import { useMemo, useState } from 'react';

const styles = {
  form: [
    'flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)]',
    'bg-[var(--card-bg)] p-4',
  ].join(' '),
  label: 'font-semibold text-[var(--text-primary)]',
  select: [
    'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)]',
  ].join(' '),
  button: [
    'inline-flex items-center justify-center rounded-lg border border-[var(--border)]',
    'bg-[var(--button-bg)] px-4 py-2 text-sm font-medium text-[var(--text-primary)]',
    'transition hover:bg-[var(--button-hover-bg)] disabled:opacity-60',
  ].join(' '),
};

function RatingSelector({ initialValue, onSubmit, submitting = false, disabled = false }) {
    const [value, setValue] = useState(initialValue ?? 10);
    const values = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1), []);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(value);
    };

    return (
        <form className={styles.form} onSubmit={handleSubmit}>
            <label className={styles.label} htmlFor="rating-value">Your rating</label>
            <select
                className={styles.select}
                id="rating-value"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                disabled={disabled || submitting}
            >
                {values.map((v) => (
                    <option key={v} value={v}>{v}/10</option>
                ))}
            </select>
            <button className={styles.button} type="submit" disabled={disabled || submitting}>
                {submitting ? 'Saving...' : 'Save rating'}
            </button>
        </form>
    );
}

export default RatingSelector;
