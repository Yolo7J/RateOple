import { useEffect, useId, useMemo, useRef, useState } from 'react';
import EntityPickerOption from './EntityPickerOption';
import SelectedEntityPill from './SelectedEntityPill';

const styles = {
  root: 'relative grid gap-2',
  label: 'ui-label',
  input: 'ui-input disabled:opacity-60',
  panel: [
    'absolute left-0 right-0 top-full z-30 mt-1 max-h-72 overflow-auto rounded-[var(--radius-lg)]',
    'border border-[var(--border)] bg-[var(--card-bg)] p-1 shadow-[var(--shadow-raised)]',
  ].join(' '),
  helper: 'px-3 py-2 text-sm text-[var(--text-muted)]',
  error: 'mx-2 my-2 rounded-[var(--radius-md)] bg-[var(--status-danger-bg)] px-3 py-2 text-sm text-[var(--status-danger)]',
  selected: 'flex flex-wrap gap-2',
  clear: 'text-sm text-[var(--text-muted)] underline-offset-4 hover:text-[var(--text-primary)] hover:underline',
};

export default function EntityPicker({
  label,
  placeholder = 'Search...',
  value = null,
  onChange,
  searchFn,
  disabled = false,
  pageSize = 10,
  minSearchLength = 0,
  emptyText = 'No matches found.',
  loadingText = 'Searching...',
  errorText = 'Could not load results.',
}) {
  const inputId = useId();
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const requestId = useRef(0);
  const rootRef = useRef(null);
  const inputRef = useRef(null);

  const canSearch = search.trim().length >= minSearchLength;
  const selected = useMemo(() => value ?? null, [value]);

  useEffect(() => {
    if (!open || disabled || !canSearch) {
      setOptions([]);
      setLoading(false);
      setError('');
      return undefined;
    }

    const currentRequest = requestId.current + 1;
    requestId.current = currentRequest;
    const handle = window.setTimeout(async () => {
      setLoading(true);
      setError('');
      try {
        const result = await searchFn({ search: search.trim(), page: 1, pageSize });
        if (requestId.current === currentRequest) {
          setOptions(result?.items ?? []);
        }
      } catch {
        if (requestId.current === currentRequest) {
          setOptions([]);
          setError(errorText);
        }
      } finally {
        if (requestId.current === currentRequest) {
          setLoading(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(handle);
  }, [canSearch, disabled, errorText, open, pageSize, search, searchFn]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (rootRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    const handleKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
    };

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  const handleSelect = (option) => {
    onChange?.(option);
    setSearch('');
    setOpen(false);
  };

  const handleClear = () => {
    onChange?.(null);
    setSearch('');
    setOpen(false);
  };

  return (
    <div className={styles.root} ref={rootRef}>
      {label ? <label className={styles.label} htmlFor={inputId}>{label}</label> : null}
      {selected ? (
        <div className={styles.selected}>
          <SelectedEntityPill option={selected} onRemove={handleClear} disabled={disabled} />
          <button
            className={styles.clear}
            type="button"
            onClick={() => {
              setOpen(true);
              inputRef.current?.focus();
            }}
            disabled={disabled}
          >
            Change
          </button>
        </div>
      ) : null}
      <input
        ref={inputRef}
        id={inputId}
        className={styles.input}
        type="search"
        value={search}
        placeholder={selected ? 'Search to replace selection' : placeholder}
        disabled={disabled}
        aria-expanded={open}
        aria-controls={`${inputId}-results`}
        aria-autocomplete="list"
        role="combobox"
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setSearch(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            event.preventDefault();
            setOpen(false);
          }
          if (event.key === 'Enter' && options.length > 0) {
            event.preventDefault();
            handleSelect(options[0]);
          }
        }}
      />
      {open && !disabled ? (
        <div id={`${inputId}-results`} className={styles.panel} role="listbox">
          {!canSearch ? <p className={styles.helper}>Type to search.</p> : null}
          {loading ? <p className={styles.helper}>{loadingText}</p> : null}
          {error ? <p className={styles.error}>{error}</p> : null}
          {!loading && !error && canSearch && options.length === 0 ? <p className={styles.helper}>{emptyText}</p> : null}
          {!loading && !error ? options.map((option) => (
            <EntityPickerOption key={option.id} option={option} onSelect={handleSelect} />
          )) : null}
        </div>
      ) : null}
    </div>
  );
}
