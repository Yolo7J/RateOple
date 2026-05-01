function RouteFallback() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-12 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <div className="w-full rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] px-6 py-10 text-center shadow-[0_12px_30px_-24px_var(--shadow-color)]">
        <p className="text-sm font-medium text-[var(--text-secondary)]">Loading page...</p>
      </div>
    </div>
  );
}

export default RouteFallback;
