import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Building2, Loader2, BarChart3, Shield } from "lucide-react";
import { AnalyticsChatbot } from "@/components/AnalyticsChatbot";
import { ModeToggle } from "@/components/ModeToggle";
import { PendingExpensesCard } from "@/components/dashboard/PendingExpensesCard";
import { JoinRequestsCard } from "@/components/dashboard/JoinRequestsCard";
import { FinancialOverviewCard } from "@/components/dashboard/FinancialOverviewCard";
import { TeamOverviewCard } from "@/components/dashboard/TeamOverviewCard";
import { RecentActivityCard } from "@/components/dashboard/RecentActivityCard";
import { ApprovedExpensesCard } from "@/components/dashboard/ApprovedExpensesCard";
import { QuickActionsCard } from "@/components/dashboard/QuickActionsCard";
import { IntegrationsCard } from "@/components/dashboard/IntegrationsCard";

const OrganizationAdmin = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [stats, setStats] = useState({
    totalPending: 0,
    totalApproved: 0,
    employeeCount: 0,
    joinRequestCount: 0,
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

        const { count: joinRequestCount } = await supabase
          .from("join_requests")
          .select("*", { count: "exact", head: true })
          .eq("org_id", orgData.id)
          .eq("status", "pending");

        setStats(prev => ({
          ...prev,
          joinRequestCount: joinRequestCount || 0,
        }));
      }
    } catch (error: any) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-7xl">
        {/* Enhanced header with gradient background */}
        <div className="mb-8 -mx-4 px-4 py-6 bg-gradient-to-b from-background/50 to-background rounded-lg">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <Building2 className="w-8 h-8 text-primary" />
                <h1 className="text-4xl font-bold text-primary">{organization?.name || "Organization"}</h1>
              </div>
              <div className="border-l-2 border-primary pl-3">
                <p className="text-lg text-muted-foreground">Admin Dashboard - Action Center</p>
              </div>
            </div>
            <ModeToggle
              modes={[
                {
                  label: "Analytics",
                  icon: BarChart3,
                  onClick: () => navigate("/admin/analytics"),
                },
                {
                  label: "Anomaly Detection",
                  icon: Shield,
                  onClick: () => navigate("/admin/anomalies"),
                  variant: "alert",
                  badge: stats.joinRequestCount,
                },
              ]}
            />
          </div>
        </div>

        {/* Bento Grid Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-fr">
          {/* Row 1 - Large cards */}
          <div className="lg:col-span-4">
            <PendingExpensesCard />
          </div>
          <div className="lg:col-span-5">
            <RecentActivityCard />
          </div>
          <div className="lg:col-span-3">
            <JoinRequestsCard />
          </div>

          {/* Row 2 - Medium cards */}
          <div className="lg:col-span-3">
            <FinancialOverviewCard />
          </div>
          <div className="lg:col-span-3">
            <TeamOverviewCard />
          </div>
          <div className="lg:col-span-3">
            <ApprovedExpensesCard />
          </div>
          <div className="lg:col-span-3">
            <QuickActionsCard />
          </div>

          {/* Row 3 - Integration card */}
          <div className="lg:col-span-4">
            <IntegrationsCard />
          </div>
        </div>
      </main>

      <AnalyticsChatbot />
    </div>
  );
};

export default OrganizationAdmin;
