import MediaCard from './MediaCard';

const styles = {
  row: 'discovery-media-row',
};

function MediaRow({ items }) {
    if (!items?.length) return null;

    return (
        <div className={styles.row}>
            {items.map((item) => <MediaCard key={item.id} media={item} />)}
        </div>
    );
}

export default MediaRow;
