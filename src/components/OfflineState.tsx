'use client';

export function OfflineState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
      <div className="max-w-md space-y-4">
        <div className="text-red-500 text-6xl mb-6">⚠️</div>
        <h1 className="text-2xl font-semibold">No Internet Connection</h1>
        <p className="text-gray-500">
          Audio recording features are not available while offline. Please check your internet connection and try again.
        </p>
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border text-sm text-gray-600">
          <p>Why do we need internet?</p>
          <ul className="mt-2 list-disc list-inside text-left space-y-1">
            <li>To securely store your recordings</li>
            <li>For real-time data synchronization</li>
            <li>To ensure data integrity and backup</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
