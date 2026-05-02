const styles = {
  section: 'ui-card p-4',
  title: 'mb-3 ui-section-title',
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
