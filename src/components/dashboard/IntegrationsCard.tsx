import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight, FileText, Database, Cloud, ArrowUpRight, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const IntegrationsCard = () => {
  const navigate = useNavigate();

  const integrations = [
    {
      name: "QuickBooks",
      icon: FileText,
      status: "Available",
      gradient: "from-blue-500 to-cyan-500",
      bgColor: "bg-blue-500/10",
    },
    {
      name: "Tally ERP",
      icon: Database,
      status: "Available",
      gradient: "from-emerald-500 to-teal-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      name: "Zoho Books",
      icon: Cloud,
      status: "Available",
      gradient: "from-orange-500 to-amber-500",
      bgColor: "bg-orange-500/10",
    },
  ];

  return (
    <Card className="h-full flex flex-col relative overflow-hidden group hover:shadow-lg transition-all duration-300">
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-violet-500/20 rounded-xl blur-md" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-violet-500/20 to-purple-500/10 border border-violet-500/20">
                <Package className="w-5 h-5 text-violet-600 dark:text-violet-400" />
              </div>
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Integrations</CardTitle>
              <p className="text-xs text-muted-foreground">Connect your apps</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/integrations");
            }}
            className="h-8 text-xs rounded-lg hover:bg-violet-500/10 hover:text-violet-600"
          >
            Manage
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        <div className="space-y-2.5 flex-1">
          {integrations.map((integration, index) => {
            const Icon = integration.icon;
            return (
              <div
                key={index}
                className="group/item flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-gradient-to-br from-card to-muted/20 hover:border-violet-500/30 hover:shadow-md transition-all cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  navigate("/admin/integrations");
                }}
              >
                {/* Icon with gradient background */}
                <div className={`p-2.5 rounded-xl bg-gradient-to-br ${integration.gradient} shadow-sm`}>
                  <Icon className="w-4 h-4 text-white" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate group-hover/item:text-violet-600 transition-colors">
                    {integration.name}
                  </p>
                  <p className="text-xs text-emerald-600 dark:text-emerald-400">{integration.status}</p>
                </div>

                <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 group-hover/item:text-violet-500 transition-all" />
              </div>
            );
          })}
        </div>

        <Button
          variant="outline"
          size="sm"
          className="mt-4 w-full rounded-xl border-violet-500/20 hover:bg-violet-500/10 hover:text-violet-600 hover:border-violet-500/30 transition-all"
          onClick={(e) => {
            e.stopPropagation();
            navigate("/admin/integrations");
          }}
        >
          <Download className="w-4 h-4 mr-2" />
          Export Data
        </Button>
      </CardContent>
    </Card>
  );
};
