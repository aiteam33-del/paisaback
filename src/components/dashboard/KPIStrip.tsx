import { Wallet, Clock, CheckCircle2, Users, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPIStripProps {
  totalVolume: number;
  pendingAmount: number;
  approvedAmount: number;
  totalPending: number;
  totalApproved: number;
  employeeCount: number;
  onTeamClick?: () => void;
}

const formatAmount = (amount: number) => {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString("en-IN", { maximumFractionDigits: 0 });
};

const metrics = (props: KPIStripProps) => [
  {
    label: "Total Volume",
    value: `₹${formatAmount(props.totalVolume)}`,
    icon: Wallet,
    iconColor: "text-primary",
    iconBg: "bg-primary/10",
    trend: props.totalApproved > 0 ? "+12%" : undefined,
    trendUp: true,
  },
  {
    label: "Pending Approval",
    value: `₹${formatAmount(props.pendingAmount)}`,
    icon: Clock,
    iconColor: "text-amber-500",
    iconBg: "bg-amber-500/10",
    count: props.totalPending,
    trend: props.totalPending > 0 ? `${props.totalPending} items` : undefined,
    trendUp: false,
  },
  {
    label: "Approved",
    value: `₹${formatAmount(props.approvedAmount)}`,
    icon: CheckCircle2,
    iconColor: "text-emerald-500",
    iconBg: "bg-emerald-500/10",
    count: props.totalApproved,
    trend: props.totalApproved > 0 ? "+8%" : undefined,
    trendUp: true,
  },
  {
    label: "Team Members",
    value: String(props.employeeCount),
    icon: Users,
    iconColor: "text-blue-500",
    iconBg: "bg-blue-500/10",
    clickable: true,
  },
];

export const KPIStrip = (props: KPIStripProps) => {
  const items = metrics(props);

  return (
    <div
      className="grid grid-cols-2 lg:grid-cols-4 bg-white dark:bg-card rounded-2xl shadow-sm"
      data-tour="admin-stats"
    >
      {items.map((item, index) => {
        const Icon = item.icon;
        const isLast = index === items.length - 1;
        const isSecond = index === 1;

        return (
          <div
            key={item.label}
            className={cn(
              "flex items-center gap-3 px-6 py-5 transition-colors duration-150",
              item.clickable && "cursor-pointer hover:bg-muted/50",
              // Vertical dividers on desktop
              index > 0 && "lg:border-l lg:border-border/40",
              // Bottom border on mobile for top row
              index < 2 && "border-b lg:border-b-0 border-border/40"
            )}
            onClick={item.clickable ? props.onTeamClick : undefined}
          >
            <div className={cn("p-2 rounded-lg", item.iconBg)}>
              <Icon className={cn("w-4 h-4", item.iconColor)} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-2xl font-semibold tracking-tight truncate">
                {item.value}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-muted-foreground">{item.label}</p>
                {item.trend && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 text-[10px] font-medium",
                      item.trendUp
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-amber-600 dark:text-amber-400"
                    )}
                  >
                    {item.trendUp ? (
                      <TrendingUp className="w-3 h-3" />
                    ) : (
                      <TrendingDown className="w-3 h-3" />
                    )}
                    {item.trend}
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
