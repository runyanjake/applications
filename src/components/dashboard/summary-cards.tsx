import type { Application } from "../../types/application";

interface SummaryCardsProps {
  applications: Application[];
}

export function SummaryCards({ applications }: SummaryCardsProps) {
  const total = applications.length;
  const active = applications.filter(
    (a) =>
      a.status === "applied" ||
      a.status === "applying" ||
      a.status === "interviewing",
  ).length;
  const interviews = applications.filter(
    (a) => a.status === "interviewing",
  ).length;
  const offers = applications.filter(
    (a) => a.status === "offered" || a.status === "accepted",
  ).length;

  const cards = [
    { label: "Total Applications", value: total, color: "text-gray-900" },
    { label: "Active", value: active, color: "text-blue-600" },
    { label: "Interviews", value: interviews, color: "text-yellow-600" },
    { label: "Offers", value: offers, color: "text-green-600" },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <div
          key={card.label}
          className="rounded-lg border border-gray-200 bg-white p-5"
        >
          <p className="text-sm font-medium text-gray-500">{card.label}</p>
          <p className={`mt-1 text-3xl font-bold ${card.color}`}>
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
