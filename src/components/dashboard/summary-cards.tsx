import type { Application } from "../../types/application";
import { ACTIVE_STATUSES } from "../../types/application";
import { Card } from "../ui/card";

export function SummaryCards({
  applications,
}: {
  applications: Application[];
}) {
  const countWhere = (predicate: (app: Application) => boolean) =>
    applications.filter(predicate).length;

  const cards = [
    {
      label: "Total Applications",
      value: applications.length,
      color: "text-gray-900",
    },
    {
      label: "Active",
      value: countWhere((app) => ACTIVE_STATUSES.includes(app.status)),
      color: "text-blue-600",
    },
    {
      label: "Interviews",
      value: countWhere((app) => app.status === "interviewing"),
      color: "text-yellow-600",
    },
    {
      label: "Offers",
      value: countWhere((app) => app.status === "offered"),
      color: "text-green-600",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Card key={card.label} className="p-5">
          <p className="text-sm font-medium text-gray-500">{card.label}</p>
          <p className={`mt-1 text-3xl font-bold ${card.color}`}>{card.value}</p>
        </Card>
      ))}
    </div>
  );
}
