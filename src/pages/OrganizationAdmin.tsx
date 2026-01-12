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
        {/* Enhanced header with gradient background and animated orbs */}
        <div className="mb-8 -mx-4 px-6 py-8 bg-gradient-to-br from-primary/15 via-secondary/10 to-accent/10 rounded-2xl border-2 border-primary/30 shadow-xl backdrop-blur-sm relative overflow-hidden">
          {/* Animated background orb effects */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-secondary/20 rounded-full blur-3xl animate-pulse" style={{animationDelay: '1s'}}></div>

          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-3">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-3">
                  <div className="bg-gradient-to-br from-primary to-primary-glow p-3 rounded-xl shadow-lg border-2 border-primary/40">
                    <Building2 className="w-9 h-9 text-white drop-shadow-md" />
                  </div>
                  <h1 className="text-5xl font-extrabold bg-gradient-to-r from-primary via-primary-glow to-secondary bg-clip-text text-transparent drop-shadow-lg">
                    {organization?.name || "Organization"}
                  </h1>
                </div>
                <div className="border-l-4 border-primary pl-4 bg-gradient-to-r from-primary/5 to-transparent py-2">
                  <p className="text-xl font-semibold text-foreground/90 tracking-wide">Admin Dashboard - Action Center</p>
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
        </div>

        {/* Bento Grid Dashboard with dynamic ordering */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6 auto-rows-fr">
          {/* Row 1 - Dynamic based on join requests */}
          {stats.joinRequestCount > 0 ? (
            <>
              <div className="lg:col-span-3">
                <JoinRequestsCard />
              </div>
              <div className="lg:col-span-4">
                <PendingExpensesCard />
              </div>
              <div className="lg:col-span-5">
                <RecentActivityCard />
              </div>
            </>
          ) : (
            <>
              <div className="lg:col-span-4">
                <PendingExpensesCard />
              </div>
              <div className="lg:col-span-5">
                <RecentActivityCard />
              </div>
              <div className="lg:col-span-3">
                <JoinRequestsCard />
              </div>
            </>
          )}

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
