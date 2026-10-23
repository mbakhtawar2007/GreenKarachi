const LoadingState: React.FC<{ message?: string }> = ({ message = 'Loading...' }) => {
  return (
    <div className="flex items-center justify-center py-24" role="status" aria-label={message}>
      <div className="text-center">
        <div
          className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-green-200 border-t-green-700"
          aria-hidden="true"
        />
        <h3 className="text-lg font-semibold text-green-950">{message}</h3>
        <p className="mt-1 text-sm text-gray-500">Please wait while we load the data.</p>
      </div>
    </div>
  );
};

export default LoadingState;
