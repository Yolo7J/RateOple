import { useState } from 'react';
import './reviews.css';

function ReviewEditor({ onSubmit, disabled = false, submitting = false }) {
    const [content, setContent] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!content.trim()) return;
        onSubmit(content.trim());
        setContent('');
    };

    return (
        <form className="ro-review-editor" onSubmit={handleSubmit}>
            <label htmlFor="review-content">Write a review</label>
            <textarea
                id="review-content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                disabled={disabled || submitting}
                placeholder="Share your thoughts"
            />
            <button type="submit" disabled={disabled || submitting || !content.trim()}>
                {submitting ? 'Posting...' : 'Post review'}
            </button>
        </form>
    );
}

export default ReviewEditor;
