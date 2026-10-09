const LoadingState: React.FC<{message?: string}> = ({message = 'Loading...'}) => {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="animate-spin w-16 h-16 border-4 border-green-200 border-t-transparent mx-auto mb-4"></div>
        <h3 className="text-xl font-medium text-green-800">{message}</h3>
        <p className="text-gray-500 text-sm mt-2">
          Please wait while we load the data.
        </p>
      </div>
    </div>
  );
};

export default LoadingState;