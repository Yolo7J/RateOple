import { useState } from 'react';
import { STATUS_TYPES } from '../../../shared/constants/statusTypes';
import Button from '../../../shared/ui/Button';
import Select from '../../../shared/ui/Select';

const styles = {
  form: 'ui-card flex flex-wrap items-center gap-3 p-4',
  label: 'text-sm text-[var(--text-secondary)]',
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
            <Select
                id="media-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={disabled || saving}
            >
                {WATCH_STATUSES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                ))}
            </Select>
            <Button type="submit" disabled={disabled || saving}>
                {saving ? 'Saving...' : 'Save status'}
            </Button>
        </form>
    );
}

export default MediaStatusSelector;
