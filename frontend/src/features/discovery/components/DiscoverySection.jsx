import MediaRow from './MediaRow';

const styles = {
  section: 'space-y-3',
  title: 'text-xl font-semibold text-[var(--text-primary)]',
  error: 'text-[#ff7f7f]',
};

function DiscoverySection({ title, items, loading, error }) {
    return (
        <section className={styles.section}>
            <h2 className={styles.title}>{title}</h2>
            {loading && <p>Loading...</p>}
            {error && <p className={styles.error}>{error}</p>}
            {!loading && !error && <MediaRow items={items} />}
        </section>
    );
}

export default DiscoverySection;
