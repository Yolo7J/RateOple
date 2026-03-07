import './account.css';

function AccountSection({ title, children }) {
    return (
        <section className="ro-account-section">
            <h2>{title}</h2>
            {children}
        </section>
    );
}

export default AccountSection;
