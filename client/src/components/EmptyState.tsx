const EmptyState: React.FC<{message?: string, actionLabel?: string, onAction?: () => void}> = ({message = 'No items found', actionLabel = 'Try again', onAction}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
        <div className="text-4xl text-green-200 mb-4">📦</div>
        <h3 className="text-xl font-medium text-green-800 mb-2">{message}</h3>
        <p className="text-gray-500 mb-6">
          There are no items to display at the moment.
        </p>
        
        {onAction && actionLabel && (
          <button
            onClick={onAction}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors text-sm font-medium"
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
};

export default EmptyState;