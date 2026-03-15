import { useState } from 'react';
import { STATUS_TYPES } from '../../../shared/constants/statusTypes';

const styles = {
  form: [
    'flex flex-wrap items-center gap-3 rounded-xl border border-[var(--border)]',
    'bg-[var(--card-bg)] p-4',
  ].join(' '),
  label: 'text-sm text-[var(--text-secondary)]',
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

const WATCH_STATUSES = STATUS_TYPES;

function MediaStatusSelector({ currentStatus, onSave, saving = false, disabled = false }) {
    const [status, setStatus] = useState(currentStatus || WATCH_STATUSES[0]);

    const submit = (e) => {
        e.preventDefault();
        onSave(status);
    };

    return (
        <form className={styles.form} onSubmit={submit}>
            <label className={styles.label} htmlFor="media-status">Watch status</label>
            <select
                className={styles.select}
                id="media-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={disabled || saving}
            >
                {WATCH_STATUSES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                ))}
            </select>
            <button className={styles.button} type="submit" disabled={disabled || saving}>
                {saving ? 'Saving...' : 'Save status'}
            </button>
        </form>
    );
}

export default MediaStatusSelector;
