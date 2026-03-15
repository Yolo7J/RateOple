const styles = {
  page: 'flex flex-1 items-center justify-center bg-[var(--bg-primary)] px-4 py-8',
  card: [
    'w-full max-w-[420px] rounded-2xl border border-[var(--button-border)]',
    'bg-[var(--bg-secondary)] p-8 shadow-[0_10px_30px_var(--shadow-color)]',
  ].join(' '),
  title: 'mb-6 text-center text-2xl font-semibold text-[var(--text-primary)]',
};

const AuthCard = ({ title, children }) => {
  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <h2 className={styles.title}>{title}</h2>
        {children}
      </div>
    </div>
  );
};

export default AuthCard;
