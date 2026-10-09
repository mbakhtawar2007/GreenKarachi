const ErrorState: React.FC<{message?: string, retry?: () => void}> = ({message = 'An error occurred', retry}) => {
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center max-w-md">
        <div className="text-4xl text-red-500 mb-4">⚠️</div>
        <h3 className="text-xl font-medium text-red-700 mb-2">{message}</h3>
        <p className="text-gray-500 mb-6">
          Something went wrong. Please try again later.
        </p>
        
        {retry && (
          <button
            onClick={retry}
            className="bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors text-sm font-medium"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;