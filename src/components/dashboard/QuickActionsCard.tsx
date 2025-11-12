import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, BarChart3, Users, Package, Settings, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActionsCard = () => {
  const navigate = useNavigate();

  const actions = [
    { icon: FileText, label: "All Expenses", onClick: () => navigate("/admin/expenses"), color: "text-primary" },
    { icon: BarChart3, label: "Analytics", onClick: () => navigate("/admin/analytics"), color: "text-success" },
    { icon: Users, label: "Employees", onClick: () => navigate("/admin/employees"), color: "text-warning" },
    { icon: Package, label: "Integrations", onClick: () => navigate("/admin/integrations"), color: "text-purple-500" },
  ];

  return (
    <Card className="group relative shadow-lg hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-card backdrop-blur-sm h-full overflow-hidden hover:scale-[1.02]">
      <div className="absolute inset-0 bg-gradient-hero opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
      <CardHeader className="pb-3 relative z-10">
        <CardTitle className="text-lg">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="grid grid-cols-2 gap-3">
          {actions.map((action, index) => {
            const Icon = action.icon;
            return (
              <Button
                key={index}
                variant="outline"
                className="h-auto flex flex-col items-center gap-2 p-4 hover:bg-gradient-card-hover hover:border-primary/50 transition-all duration-300 group/action hover:scale-105"
                onClick={action.onClick}
              >
                <div className={`p-2.5 rounded-lg bg-background/80 group-hover/action:scale-110 transition-transform duration-300 ${action.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-medium text-center">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
