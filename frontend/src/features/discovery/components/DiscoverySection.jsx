import MediaRow from './MediaRow';
import InlineMessage from '../../../shared/ui/InlineMessage';
import LoadingState from '../../../shared/ui/LoadingState';

const styles = {
  section: 'min-w-0 space-y-3',
  title: 'ui-section-title',
};

function DiscoverySection({ title, items, loading, error }) {
    return (
        <section className={styles.section}>
            <h2 className={styles.title}>{title}</h2>
            {loading && <LoadingState label={`Loading ${title.toLowerCase()}...`} />}
            {error && <InlineMessage tone="error">{error}</InlineMessage>}
            {!loading && !error && <MediaRow items={items} />}
        </section>
    );
}

export default DiscoverySection;
