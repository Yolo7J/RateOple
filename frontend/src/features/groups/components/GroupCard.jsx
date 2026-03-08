import { Link } from 'react-router-dom';
import './groups.css';

function GroupCard({ group }) {
  return (
    <article className="ro-group-card">
      <Link to={`/groups/${group.id}`} className="ro-group-link">
        <h3>{group.name}</h3>
        {group.description ? <p>{group.description}</p> : null}
        <div className="ro-group-meta">
          <span>{group.membersCount ?? 0} members</span>
          <span>{group.postsCount ?? 0} posts</span>
        </div>
      </Link>
    </article>
  );
}

export default GroupCard;
