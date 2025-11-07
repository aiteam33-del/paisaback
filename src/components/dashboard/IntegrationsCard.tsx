import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, ChevronRight, FileText, Database, Cloud } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const IntegrationsCard = () => {
  const navigate = useNavigate();

  const integrations = [
    { name: "QuickBooks", icon: FileText, status: "Available", color: "text-blue-500" },
    { name: "Tally ERP", icon: Database, status: "Available", color: "text-green-500" },
    { name: "Zoho Books", icon: Cloud, status: "Available", color: "text-orange-500" },
  ];

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-border/50 bg-gradient-card backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-500/20">
              <Package className="w-4 h-4 text-purple-500" />
            </div>
            <CardTitle className="text-lg">Integrations</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/integrations")}
            className="h-8 text-xs"
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
                className="flex items-center gap-3 p-3 rounded-lg border border-border/50 bg-background/50 hover:bg-accent/5 transition-colors cursor-pointer"
                onClick={() => navigate("/admin/integrations")}
              >
                <div className={`p-2 rounded-lg bg-background/80 ${integration.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{integration.name}</p>
                  <p className="text-xs text-muted-foreground">{integration.status}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            );
          })}
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="mt-3 w-full"
          onClick={() => navigate("/admin/integrations")}
        >
          <Package className="w-3 h-3 mr-2" />
          Export Data
        </Button>
      </CardContent>
    </Card>
  );
};
