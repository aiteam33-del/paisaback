import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, Users, Package, Zap, ArrowUpRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActionsCard = () => {
  const navigate = useNavigate();

  const actions = [
    {
      icon: FileText,
      label: "All Expenses",
      description: "View & manage",
      onClick: () => navigate("/admin/expenses"),
      gradient: "from-primary to-cyan-500",
      hoverBg: "hover:bg-primary/5 hover:border-primary/30",
    },
    {
      icon: BarChart3,
      label: "Analytics",
      description: "View insights",
      onClick: () => navigate("/admin/analytics"),
      gradient: "from-emerald-500 to-teal-500",
      hoverBg: "hover:bg-emerald-500/5 hover:border-emerald-500/30",
    },
    {
      icon: Users,
      label: "Employees",
      description: "Manage team",
      onClick: () => navigate("/admin/employees"),
      gradient: "from-blue-500 to-indigo-500",
      hoverBg: "hover:bg-blue-500/5 hover:border-blue-500/30",
    },
    {
      icon: Package,
      label: "Integrations",
      description: "Connect apps",
      onClick: () => navigate("/admin/integrations"),
      gradient: "from-violet-500 to-purple-500",
      hoverBg: "hover:bg-violet-500/5 hover:border-violet-500/30",
    },
  ];

  return (
    <Card className="h-full relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500" />

      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute inset-0 bg-pink-500/20 rounded-xl blur-md" />
            <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/10 border border-pink-500/20">
              <Zap className="w-5 h-5 text-pink-600 dark:text-pink-400" />
            </div>
          </div>
          <div>
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
            <p className="text-xs text-muted-foreground">Jump to any section</p>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <button
                key={index}
                className={`group/item relative flex flex-col items-center gap-3 p-4 rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 ${action.hoverBg} transition-all duration-200 cursor-pointer`}
                onClick={action.onClick}
              >
                {/* Icon with gradient background */}
                <div className={`p-3 rounded-xl bg-gradient-to-br ${action.gradient} shadow-lg`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>

                {/* Label */}
                <div className="text-center">
                  <span className="text-sm font-semibold block">{action.label}</span>
                  <span className="text-xs text-muted-foreground">{action.description}</span>
                </div>

                {/* Hover arrow indicator */}
                <ArrowUpRight className="absolute top-2 right-2 w-4 h-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 transition-opacity" />
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
