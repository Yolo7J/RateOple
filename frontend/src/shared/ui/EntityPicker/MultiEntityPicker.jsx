import { useCallback, useMemo } from 'react';
import EntityPicker from './EntityPicker';
import SelectedEntityPill from './SelectedEntityPill';

const styles = {
  root: 'grid gap-3',
  selected: 'flex flex-wrap gap-2',
  muted: 'text-sm text-[var(--text-muted)]',
};

export default function MultiEntityPicker({
  label,
  value = [],
  onChange,
  searchFn,
  placeholder = 'Search...',
  disabled = false,
  emptySelectionText = 'No selections yet.',
}) {
  const selected = useMemo(() => (Array.isArray(value) ? value : []), [value]);

  const handleAdd = useCallback((option) => {
    if (!option || selected.some((item) => item.id === option.id)) return;
    onChange?.([...selected, option]);
  }, [onChange, selected]);

  const handleRemove = useCallback((option) => {
    onChange?.(selected.filter((item) => item.id !== option.id));
  }, [onChange, selected]);

  return (
    <div className={styles.root}>
      <EntityPicker
        label={label}
        value={null}
        onChange={handleAdd}
        searchFn={searchFn}
        placeholder={placeholder}
        disabled={disabled}
      />
      <div className={styles.selected} aria-live="polite">
        {selected.map((option) => (
          <SelectedEntityPill key={option.id} option={option} onRemove={handleRemove} disabled={disabled} />
        ))}
        {selected.length === 0 ? <p className={styles.muted}>{emptySelectionText}</p> : null}
      </div>
    </div>
  );
}
