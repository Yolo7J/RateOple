import EntityPicker from './EntityPicker';

const styles = {
  backdrop: 'fixed inset-0 z-40 bg-black/50 px-4 py-8',
  dialog: [
    'mx-auto grid max-w-xl gap-4 rounded-lg border border-[var(--border)]',
    'bg-[var(--card-bg)] p-4 shadow-2xl',
  ].join(' '),
  header: 'flex items-center justify-between gap-3',
  title: 'text-lg font-semibold text-[var(--text-primary)]',
  close: 'rounded-md px-2 py-1 text-sm text-[var(--text-muted)] hover:bg-[var(--bg-secondary)]',
};

export default function EntityPickerModal({ open, title, onClose, ...pickerProps }) {
  if (!open) return null;

  return (
    <div className={styles.backdrop} role="presentation">
      <div className={styles.dialog} role="dialog" aria-modal="true" aria-label={title}>
        <div className={styles.header}>
          <h2 className={styles.title}>{title}</h2>
          <button className={styles.close} type="button" onClick={onClose}>Close</button>
        </div>
        <EntityPicker {...pickerProps} />
      </div>
    </div>
  );
}
