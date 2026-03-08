import './reviews.css';

const options = [
    { value: 'recent', label: 'Most recent' },
    { value: 'highest', label: 'Highest rated' },
    { value: 'lowest', label: 'Lowest rated' },
];

function ReviewFilters({ value, onChange }) {
    return (
        <div className="ro-review-filters">
            <label htmlFor="review-sort">Sort</label>
            <select id="review-sort" value={value} onChange={(e) => onChange(e.target.value)}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        </div>
    );
}

export default ReviewFilters;
