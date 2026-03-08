import { useState } from 'react';
import './MediaStatusSelector.css';

export const WATCH_STATUSES = ['Plan', 'On it', 'Done', 'Dropped'];

function MediaStatusSelector({ currentStatus, onSave, saving = false, disabled = false }) {
    const [status, setStatus] = useState(currentStatus || WATCH_STATUSES[0]);

    const submit = (e) => {
        e.preventDefault();
        onSave(status);
    };

    return (
        <form className="ro-status-selector" onSubmit={submit}>
            <label htmlFor="media-status">Watch status</label>
            <select
                id="media-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                disabled={disabled || saving}
            >
                {WATCH_STATUSES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                ))}
            </select>
            <button type="submit" disabled={disabled || saving}>
                {saving ? 'Saving...' : 'Save status'}
            </button>
        </form>
    );
}

export default MediaStatusSelector;
