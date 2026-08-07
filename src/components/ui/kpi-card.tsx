import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Plain number-over-label tile, as drawn on the dashboard screens — no icon
 * circle, the number itself carries the weight.
 */
export function KpiCard({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string | number;
  tone?: "default" | "warning" | "danger";
}) {
  return (
    <Card className="gap-1 p-5">
      <p
        className={cn(
          "font-heading text-3xl font-extrabold tabular-nums",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-destructive"
        )}
      >
        {value}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </Card>
  );
}
