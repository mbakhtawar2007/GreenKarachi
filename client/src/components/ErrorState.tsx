const ErrorState: React.FC<{ message?: string; retry?: () => void }> = ({
  message = 'An error occurred',
  retry,
}) => {
  return (
    <div className="flex items-center justify-center px-4 py-24">
      <div className="card max-w-md p-8 text-center">
        <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-red-50 text-3xl" aria-hidden="true">
          ⚠️
        </div>
        <h3 className="mt-5 font-display text-2xl font-semibold text-red-700">{message}</h3>
        <p className="mt-2 text-gray-500">Something went wrong. Please try again later.</p>

        {retry && (
          <button onClick={retry} className="btn-primary mt-6">
            Retry
          </button>
        )}
      </div>
    </div>
  );
};

export default ErrorState;
