import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";

interface SummaryCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  linkTo: string;
  actionText: string;
  actionIcon?: LucideIcon;
  highlight?: boolean;
  trend?: {
    value: number;
    label: string;
  };
  count?: number;
}

export const SummaryCard = ({
  title,
  value,
  icon: Icon,
  linkTo,
  actionText,
  actionIcon: ActionIcon,
  highlight = false,
  trend,
  count,
}: SummaryCardProps) => {
  const navigate = useNavigate();
  const [displayValue, setDisplayValue] = useState(0);

  // Animate number count-up
  useEffect(() => {
    const numericValue = typeof value === 'string' 
      ? parseFloat(value.replace(/[^0-9.-]/g, '')) 
      : value;
    
    if (isNaN(numericValue)) return;

    const duration = 1000;
    const steps = 60;
    const increment = numericValue / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formattedValue = typeof value === 'string' && value.startsWith('₹')
    ? `₹${displayValue.toFixed(2)}`
    : Math.round(displayValue);

  const buttonText = count !== undefined ? `${actionText} (${count})` : actionText;
  const trendColor = trend && trend.value > 0 ? "text-success" : "text-muted-foreground";
  const TrendIcon = trend && trend.value > 0 ? TrendingUp : TrendingDown;

  return (
    <Card className={`shadow-card border-primary/20 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ${highlight ? "bg-gradient-primary text-primary-foreground" : ""}`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-xs font-medium uppercase tracking-wide ${highlight ? "text-primary-foreground/90" : "text-muted-foreground"}`}>{title}</CardTitle>
        <div className={`p-2 rounded-lg ${highlight ? "bg-white/20" : "bg-gradient-primary"}`}>
          <Icon className={`h-4 w-4 ${highlight ? "text-primary-foreground" : "text-primary-foreground"}`} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-1">
          <div className={`text-3xl font-bold ${highlight ? "" : "text-foreground"} drop-shadow-sm`}>
            {formattedValue}
          </div>
          {trend && (
            <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
              <TrendIcon className="h-3 w-3" />
              <span>{trend.value > 0 ? '+' : ''}{trend.value}%</span>
              <span className="text-muted-foreground">{trend.label}</span>
            </div>
          )}
        </div>
        <Button
          variant={highlight ? "secondary" : "outline"}
          size="sm"
          onClick={() => navigate(linkTo)}
          className={`w-full gap-2 ${!highlight ? "border-primary/50 hover:bg-primary hover:text-primary-foreground" : ""}`}
        >
          {ActionIcon && <ActionIcon className="h-4 w-4" />}
          {buttonText}
        </Button>
      </CardContent>
    </Card>
  );
};
