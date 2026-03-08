import MediaCard from './MediaCard';
import './discovery.css';

function MediaRow({ items }) {
    if (!items?.length) return <p className="ro-row-empty">No items</p>;

    return (
        <div className="ro-media-row">
            {items.map((item) => <MediaCard key={item.id} media={item} />)}
        </div>
    );
}

export default MediaRow;
