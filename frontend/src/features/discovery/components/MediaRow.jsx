import MediaCard from './MediaCard';

const styles = {
  row: 'grid grid-flow-col auto-cols-[minmax(180px,220px)] gap-3 overflow-x-auto pb-2',
  empty: 'text-[var(--text-muted)]',
};

function MediaRow({ items }) {
    if (!items?.length) return <p className={styles.empty}>No items</p>;

    return (
        <div className={styles.row}>
            {items.map((item) => <MediaCard key={item.id} media={item} />)}
        </div>
    );
}

export default MediaRow;
