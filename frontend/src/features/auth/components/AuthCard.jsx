const styles = {
  page: 'flex flex-1 items-center justify-center bg-[var(--bg-primary)] px-4 py-8',
  card: [
    'ui-card w-full max-w-[420px] p-6 sm:p-8',
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
