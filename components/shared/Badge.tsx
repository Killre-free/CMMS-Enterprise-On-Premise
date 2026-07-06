import { cn } from "@/lib/utils";

const COLOR_MAP: Record<string, string> = {
  gray: "bg-muted text-muted-foreground",
  blue: "bg-blue-100 text-blue-700",
  green: "bg-green-100 text-green-700",
  yellow: "bg-yellow-100 text-yellow-800",
  orange: "bg-orange-100 text-orange-700",
  red: "bg-destructive/10 text-destructive",
};

export function Badge({
  children,
  color = "gray",
  className,
}: {
  children: React.ReactNode;
  color?: keyof typeof COLOR_MAP;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        COLOR_MAP[color],
        className
      )}
    >
      {children}
    </span>
  );
}

export const PRIORITY_COLOR: Record<string, keyof typeof COLOR_MAP> = {
  Low: "gray",
  Medium: "blue",
  High: "orange",
  Critical: "red",
};

export const STATUS_COLOR: Record<string, keyof typeof COLOR_MAP> = {
  ProductionRequest: "gray",
  WaitingTechnician: "yellow",
  Accepted: "blue",
  InProgress: "blue",
  WaitingSparePart: "orange",
  WaitingMaker: "orange",
  WaitingProduction: "orange",
  WaitingBudgetApproval: "orange",
  Completed: "green",
  WaitingApproval: "yellow",
  Closed: "gray",
};
