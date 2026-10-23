const EmptyState: React.FC<{ message?: string; actionLabel?: string; onAction?: () => void }> = ({
  message = 'No items found',
  actionLabel = 'Try again',
  onAction,
}) => {
  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-green-100 text-3xl" aria-hidden="true">
          📦
        </div>
        <h3 className="mt-5 font-display text-2xl font-semibold text-green-950">{message}</h3>
        <p className="mt-2 text-gray-500">There are no items to display at the moment.</p>

        {onAction && actionLabel && (
          <button onClick={onAction} className="btn-primary mt-6">
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;
