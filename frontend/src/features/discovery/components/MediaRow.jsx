import MediaCard from './MediaCard';
import EmptyState from '../../../shared/ui/EmptyState';

const styles = {
  row: 'grid w-full min-w-0 grid-flow-col auto-cols-[minmax(156px,178px)] gap-4 overflow-x-auto pb-3 sm:auto-cols-[minmax(170px,204px)] lg:auto-cols-[minmax(180px,214px)]',
};

function MediaRow({ items }) {
    if (!items?.length) return <EmptyState title="No items yet" className="py-6" />;

    return (
        <div className={styles.row}>
            {items.map((item) => <MediaCard key={item.id} media={item} />)}
        </div>
    );
}

export default MediaRow;
