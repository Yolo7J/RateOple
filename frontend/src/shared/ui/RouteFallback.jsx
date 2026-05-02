import LoadingState from './LoadingState';

function RouteFallback() {
  return (
    <div
      className="mx-auto flex w-full max-w-6xl items-center justify-center px-4 py-12 sm:px-6"
      role="status"
      aria-live="polite"
    >
      <LoadingState label="Loading page..." className="w-full" />
    </div>
  );
}

export default RouteFallback;
