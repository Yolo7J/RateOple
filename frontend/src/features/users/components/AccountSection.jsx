const styles = {
  section: 'rounded-xl border border-[var(--border)] bg-[var(--card-bg)] p-4',
  title: 'mb-3 text-base font-semibold text-[var(--text-primary)]',
};

function AccountSection({ title, children }) {
    return (
        <section className={styles.section}>
            <h2 className={styles.title}>{title}</h2>
            {children}
        </section>
    );
}

export default AccountSection;
