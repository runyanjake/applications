import { LoginButton } from "../components/auth/login-button";

export function HomePage() {
  return (
    <div className="py-16 text-center">
      <h1 className="mb-4 text-4xl font-bold text-gray-900">
        Job Application Tracker
      </h1>
      <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
        Track your job applications with your own Google Spreadsheet. Your data
        stays yours — we never store it on our servers.
      </p>

      <div className="mb-16">
        <LoginButton className="px-6 py-3 text-base" />
      </div>

      <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-3 text-3xl">
            <svg
              className="mx-auto h-10 w-10 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>
          <h3 className="mb-1 font-semibold text-gray-900">Your Data</h3>
          <p className="text-sm text-gray-500">
            All data lives in your Google Spreadsheet. Nothing is stored on
            external servers.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-3 text-3xl">
            <svg
              className="mx-auto h-10 w-10 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
              />
            </svg>
          </div>
          <h3 className="mb-1 font-semibold text-gray-900">Analytics</h3>
          <p className="text-sm text-gray-500">
            Visualize your job search with charts and insights to help you
            stay on track.
          </p>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="mb-3 text-3xl">
            <svg
              className="mx-auto h-10 w-10 text-indigo-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
              />
            </svg>
          </div>
          <h3 className="mb-1 font-semibold text-gray-900">Filter & Search</h3>
          <p className="text-sm text-gray-500">
            Quickly find applications with powerful filtering by status,
            company, date, and more.
          </p>
        </div>
      </div>
    </div>
  );
}
