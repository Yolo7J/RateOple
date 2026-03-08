import { useMemo, useState } from 'react';
import './ratings.css';

function RatingSelector({ initialValue, onSubmit, submitting = false, disabled = false }) {
    const [value, setValue] = useState(initialValue ?? 10);
    const values = useMemo(() => Array.from({ length: 10 }, (_, i) => i + 1), []);

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(value);
    };

    return (
        <form className="ro-rating-selector" onSubmit={handleSubmit}>
            <label htmlFor="rating-value">Your rating</label>
            <select
                id="rating-value"
                value={value}
                onChange={(e) => setValue(Number(e.target.value))}
                disabled={disabled || submitting}
            >
                {values.map((v) => (
                    <option key={v} value={v}>{v}/10</option>
                ))}
            </select>
            <button type="submit" disabled={disabled || submitting}>
                {submitting ? 'Saving...' : 'Save rating'}
            </button>
        </form>
    );
}

export default RatingSelector;
