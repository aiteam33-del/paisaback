import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Building2, BarChart3, Shield } from "lucide-react";
import { KPIStrip } from "@/components/dashboard/KPIStrip";
import { RequiresAttentionPanel } from "@/components/dashboard/RequiresAttentionPanel";
import { FinancialInsightsCharts } from "@/components/dashboard/FinancialInsightsCharts";
import { ActivityTimeline } from "@/components/dashboard/ActivityTimeline";
import { AICopilotWidget } from "@/components/dashboard/AICopilotWidget";
import { Button } from "@/components/ui/button";
import { OnboardingTour } from "@/components/OnboardingTour";

const OrganizationAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalApproved: 0,
    employeeCount: 0,
    joinRequestCount: 0,
    pendingAmount: 0,
    approvedAmount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadDashboardData();
  }, [user, navigate]);

  const loadDashboardData = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("admin_user_id", user.id)
        .single();

      if (orgData) {
        setOrganization(orgData);

        const { data: employeesData, count: employeeCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .eq("organization_id", orgData.id);

        const employeeIds = (employeesData || []).map(e => e.id);
        const allUserIds = [...employeeIds, user.id];

        const [joinRequestsResult, pendingExpensesResult, approvedExpensesResult] = await Promise.all([
          supabase
            .from("join_requests")
            .select("*", { count: "exact", head: true })
            .eq("org_id", orgData.id)
            .eq("status", "pending"),
          supabase
            .from("expenses")
            .select("amount")
            .in("user_id", allUserIds)
            .eq("status", "pending"),
          supabase
            .from("expenses")
            .select("amount")
            .in("user_id", allUserIds)
            .eq("status", "approved"),
        ]);

        const pendingAmount = pendingExpensesResult.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;
        const approvedAmount = approvedExpensesResult.data?.reduce((sum, e) => sum + (e.amount || 0), 0) || 0;

        setStats({
          joinRequestCount: joinRequestsResult.count || 0,
          totalPending: pendingExpensesResult.data?.length || 0,
          totalApproved: approvedExpensesResult.data?.length || 0,
          employeeCount: employeeCount || 0,
          pendingAmount,
          approvedAmount,
        });
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Building2 className="w-6 h-6 text-primary animate-pulse" />
          </div>
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-background">
      <Navigation />
      <OnboardingTour tourType="admin" />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        {/* Header - Clean & minimal */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              {organization?.name || "Dashboard"}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Overview of your organization's expenses and activity
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/analytics")}
              className="gap-2 rounded-lg h-9 text-xs border-border/50 hover:bg-muted/50"
            >
              <BarChart3 className="w-3.5 h-3.5" />
              Analytics
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/anomalies")}
              className="gap-2 rounded-lg h-9 text-xs border-border/50 hover:bg-muted/50"
              data-tour="anomaly-link"
            >
              <Shield className="w-3.5 h-3.5" />
              Anomalies
              {stats.joinRequestCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] font-semibold rounded-full bg-red-100 text-red-600 dark:bg-red-500/20 dark:text-red-400">
                  {stats.joinRequestCount}
                </span>
              )}
            </Button>
          </div>
        </div>

        {/* KPI Metrics Strip */}
        <div className="mb-8">
          <KPIStrip
            totalVolume={stats.pendingAmount + stats.approvedAmount}
            pendingAmount={stats.pendingAmount}
            approvedAmount={stats.approvedAmount}
            totalPending={stats.totalPending}
            totalApproved={stats.totalApproved}
            employeeCount={stats.employeeCount}
            onTeamClick={() => navigate("/admin/employees")}
          />
        </div>

        {/* Main Grid: Requires Attention (7 cols) | Financial Insights (5 cols) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
          <div className="lg:col-span-7">
            <RequiresAttentionPanel />
          </div>
          <div className="lg:col-span-5">
            <FinancialInsightsCharts />
          </div>
        </div>

        {/* Full Width: Activity Timeline */}
        <div>
          <ActivityTimeline />
        </div>
      </main>

      {/* Floating AI Copilot */}
      <AICopilotWidget />
    </div>
  );
};

export default OrganizationAdmin;
