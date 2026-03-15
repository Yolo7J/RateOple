const styles = {
  wrapper: [
    'flex flex-col gap-2 rounded-xl border border-[var(--border)]',
    'bg-[var(--card-bg)] p-4',
  ].join(' '),
  label: 'text-sm font-semibold text-[var(--text-primary)]',
  select: [
    'rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2',
    'text-sm text-[var(--text-primary)]',
  ].join(' '),
};

const options = [
    { value: 'recent', label: 'Most recent' },
    { value: 'highest', label: 'Highest rated' },
    { value: 'lowest', label: 'Lowest rated' },
];

function ReviewFilters({ value, onChange }) {
    return (
        <div className={styles.wrapper}>
            <label className={styles.label} htmlFor="review-sort">Sort</label>
            <select className={styles.select} id="review-sort" value={value} onChange={(e) => onChange(e.target.value)}>
                {options.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                ))}
            </select>
        </div>
    );
}

export default ReviewFilters;
