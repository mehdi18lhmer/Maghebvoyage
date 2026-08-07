"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, Pie, PieChart, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { bookings, getAllAgencies, trips } from "@/lib/mock-data";
import { tripTypeLabel } from "@/lib/format";

const CHART_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
];

function weeklyBookings() {
  const weeks: { label: string; start: number }[] = [];
  const now = new Date();
  for (let i = 7; i >= 0; i--) {
    const start = new Date(now);
    start.setDate(now.getDate() - i * 7);
    weeks.push({ label: `S-${i}`, start: start.getTime() - 7 * 24 * 60 * 60 * 1000 });
  }
  return weeks.map((w, i) => {
    const end = weeks[i + 1]?.start ?? Date.now();
    const count = bookings.filter((b) => {
      const t = new Date(b.createdAt).getTime();
      return t >= w.start && t < end;
    }).length;
    return { week: w.label, réservations: count };
  });
}

function tripTypeBreakdown() {
  const counts = new Map<string, number>();
  for (const t of trips) counts.set(t.tripType, (counts.get(t.tripType) ?? 0) + 1);
  return [...counts.entries()].map(([type, count], i) => ({
    type: tripTypeLabel(type),
    count,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
}

function topDestinations() {
  const counts = new Map<string, number>();
  for (const t of trips) counts.set(t.destination, (counts.get(t.destination) ?? 0) + 1);
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([destination, count]) => ({ destination, count }));
}

function mostActiveAgencies() {
  const agencies = getAllAgencies();
  return agencies
    .map((a) => {
      const agencyTripIds = new Set(trips.filter((t) => t.agencyId === a.id).map((t) => t.id));
      const confirmed = bookings.filter((b) => agencyTripIds.has(b.groupTripId) && b.status === "CONFIRMED").length;
      return { agency: a, confirmed };
    })
    .sort((a, b) => b.confirmed - a.confirmed);
}

const lineConfig = { réservations: { label: "Réservations", color: "var(--chart-1)" } } satisfies ChartConfig;
const barConfig = { count: { label: "Voyages", color: "var(--chart-2)" } } satisfies ChartConfig;
const pieConfig = { count: { label: "Voyages" } } satisfies ChartConfig;

export default function AdminAnalyticsPage() {
  const weekly = weeklyBookings();
  const types = tripTypeBreakdown();
  const destinations = topDestinations();
  const agencies = mostActiveAgencies();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-extrabold tracking-tight">Analytics</h1>
        <p className="mt-1 text-muted-foreground">
          Vue analytique de l&apos;activité de la plateforme.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <p className="mb-4 font-heading text-base font-bold">Réservations par semaine</p>
          <ChartContainer config={lineConfig} className="h-64 w-full">
            <LineChart data={weekly}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="week" tickLine={false} axisLine={false} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Line type="monotone" dataKey="réservations" stroke="var(--color-réservations)" strokeWidth={2} dot />
            </LineChart>
          </ChartContainer>
        </Card>

        <Card className="p-5">
          <p className="mb-4 font-heading text-base font-bold">Répartition par type de voyage</p>
          <ChartContainer config={pieConfig} className="mx-auto h-64 w-full max-w-xs">
            <PieChart>
              <ChartTooltip content={<ChartTooltipContent nameKey="type" />} />
              <Pie data={types} dataKey="count" nameKey="type" innerRadius={40} />
            </PieChart>
          </ChartContainer>
          <ul className="mt-3 flex flex-wrap justify-center gap-3 text-xs text-muted-foreground">
            {types.map((t) => (
              <li key={t.type} className="flex items-center gap-1.5">
                <span className="size-2 rounded-full" style={{ backgroundColor: t.fill }} />
                {t.type}
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-5">
          <p className="mb-4 font-heading text-base font-bold">Top 5 des destinations</p>
          <ChartContainer config={barConfig} className="h-64 w-full">
            <BarChart data={destinations} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                dataKey="destination"
                type="category"
                tickLine={false}
                axisLine={false}
                width={110}
                fontSize={12}
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="count" fill="var(--color-count)" radius={4} />
            </BarChart>
          </ChartContainer>
        </Card>

        <Card className="p-5">
          <p className="mb-4 font-heading text-base font-bold">Agences les plus actives</p>
          <ul className="space-y-3">
            {agencies.map(({ agency, confirmed }, i) => (
              <li key={agency.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className="flex size-6 items-center justify-center rounded-full bg-accent text-xs font-semibold">
                    {i + 1}
                  </span>
                  {agency.name}
                </span>
                <span className="text-muted-foreground">{confirmed} réservations</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
