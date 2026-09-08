import { LoginButton } from "../components/auth/login-button";
import { Card } from "../components/ui/card";
import { ChartIcon, FilterIcon, LockIcon } from "../components/ui/icons";

const FEATURES = [
  {
    Icon: LockIcon,
    title: "Your Data",
    description:
      "All data lives in your Google Spreadsheet. Nothing is stored on external servers.",
  },
  {
    Icon: ChartIcon,
    title: "Analytics",
    description:
      "Visualize your job search with charts and insights to help you stay on track.",
  },
  {
    Icon: FilterIcon,
    title: "Filter & Search",
    description:
      "Quickly find applications with powerful filtering by status, company, date, and more.",
  },
];

export function HomePage() {
  return (
    <div className="py-16 text-center">
      <h1 className="mb-4 text-4xl font-bold text-gray-900">PWS Applications</h1>
      <p className="mx-auto mb-8 max-w-2xl text-lg text-gray-600">
        Track your job applications with your own Google Spreadsheet. Your data
        stays yours — we never store it on our servers.
      </p>

      <div className="mb-16">
        <LoginButton className="px-6 py-3 text-base" />
      </div>

      <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
        {FEATURES.map(({ Icon, title, description }) => (
          <Card key={title} className="p-6">
            <Icon className="mx-auto mb-3 h-10 w-10 text-indigo-600" />
            <h3 className="mb-1 font-semibold text-gray-900">{title}</h3>
            <p className="text-sm text-gray-500">{description}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
