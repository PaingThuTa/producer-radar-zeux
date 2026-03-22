export default function PageNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-[#0f0f10]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-7xl font-light text-[#27272a]">404</h1>
          <div className="h-0.5 w-16 bg-[#27272a] mx-auto"></div>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-medium text-white">Page Not Found</h2>
          <p className="text-[#71717a] leading-relaxed">
            The page you requested could not be found.
          </p>
        </div>
        <div className="pt-6">
          <button
            onClick={() => window.location.href = '/'}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-[#2563eb] rounded-lg hover:bg-[#3b82f6] transition-colors"
          >
            Go Home
          </button>
        </div>
      </div>
    </div>
  );
}
