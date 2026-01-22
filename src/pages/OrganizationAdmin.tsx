import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import {
  Building2, Loader2, BarChart3, Shield, Users, Clock,
  TrendingUp, ArrowUpRight, Sparkles, CheckCircle2,
  Wallet, ChevronRight
} from "lucide-react";
import { AnalyticsChatbot } from "@/components/AnalyticsChatbot";
import { PendingExpensesCard } from "@/components/dashboard/PendingExpensesCard";
import { JoinRequestsCard } from "@/components/dashboard/JoinRequestsCard";
import { FinancialOverviewCard } from "@/components/dashboard/FinancialOverviewCard";
import { TeamOverviewCard } from "@/components/dashboard/TeamOverviewCard";
import { ApprovedExpensesCard } from "@/components/dashboard/ApprovedExpensesCard";
import { IntegrationsCard } from "@/components/dashboard/IntegrationsCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { OnboardingTour } from "@/components/OnboardingTour";

// Format number to fit: use compact notation for large numbers
const formatAmount = (amount: number) => {
  if (amount >= 10000000) {
    return `${(amount / 10000000).toFixed(1)}Cr`;
  } else if (amount >= 100000) {
    return `${(amount / 100000).toFixed(1)}L`;
  } else if (amount >= 1000) {
    return `${(amount / 1000).toFixed(1)}K`;
  }
  return amount.toLocaleString('en-IN', { maximumFractionDigits: 0 });
};

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

        // First get employees for this organization to filter expenses
        const { data: employeesData, count: employeeCount } = await supabase
          .from("profiles")
          .select("id", { count: "exact" })
          .eq("organization_id", orgData.id);

        const employeeIds = (employeesData || []).map(e => e.id);
        // Include admin user_id in the employee list for expense filtering
        const allUserIds = [...employeeIds, user.id];

        // Fetch stats in parallel - now filtering expenses by organization's employees
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
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center animate-pulse">
              <Building2 className="w-8 h-8 text-white" />
            </div>
          </div>
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background bg-mesh">
      <Navigation />
      <OnboardingTour tourType="admin" />

      <main className="container mx-auto px-4 pt-24 pb-16 max-w-7xl">
        {/* Hero Header */}
        <div className="mb-10">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="relative">
                  <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-lg opacity-40" />
                  <div className="relative p-3 rounded-2xl bg-gradient-to-br from-primary to-primary/80 shadow-lg">
                    <Building2 className="w-6 h-6 text-white" />
                  </div>
                </div>
                <div>
                  <h1 className="text-3xl lg:text-4xl font-bold tracking-tight">
                    {organization?.name || "Organization"}
                  </h1>
                  <p className="text-muted-foreground">Admin Dashboard</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="outline" className="text-sm">
                  <Users className="w-3 h-3 mr-1" />
                  {stats.employeeCount} team members
                </Badge>
                {stats.joinRequestCount > 0 && (
                  <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 hover:bg-amber-500/20">
                    <Clock className="w-3 h-3 mr-1" />
                    {stats.joinRequestCount} pending requests
                  </Badge>
                )}
              </div>
            </div>

            {/* Quick Navigation */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => navigate("/admin/analytics")}
                className="gap-2 rounded-xl"
              >
                <BarChart3 className="w-4 h-4" />
                Analytics
              </Button>
              <Button
                onClick={() => navigate("/admin/anomalies")}
                className={cn(
                  "gap-2 rounded-xl",
                  stats.joinRequestCount > 0
                    ? "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white shadow-lg"
                    : ""
                )}
                data-tour="anomaly-link"
              >
                <Shield className="w-4 h-4" />
                Anomalies
                {stats.joinRequestCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-white/20">
                    {stats.joinRequestCount}
                  </span>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8" data-tour="admin-stats">
          {/* Total Volume */}
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 hover:border-border hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-cyan-500" />
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-primary/10">
                <Wallet className="w-6 h-6 text-primary" />
              </div>
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-1 truncate">
              ₹{formatAmount(stats.pendingAmount + stats.approvedAmount)}
            </h3>
            <p className="text-sm text-muted-foreground">Total Volume</p>
          </div>

          {/* Pending */}
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 hover:border-border hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-amber-500 to-orange-500" />
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-amber-500/10">
                <Clock className="w-6 h-6 text-amber-500" />
              </div>
              <span className="text-xs font-medium text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full">
                {stats.totalPending} pending
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-1 truncate">₹{formatAmount(stats.pendingAmount)}</h3>
            <p className="text-sm text-muted-foreground">Pending Approval</p>
          </div>

          {/* Approved */}
          <div className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 hover:border-border hover:shadow-lg transition-all duration-300">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-500 to-green-500" />
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-emerald-500/10">
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <span className="text-xs font-medium text-emerald-500 bg-emerald-500/10 px-2 py-1 rounded-full">
                {stats.totalApproved} approved
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-1 truncate">₹{formatAmount(stats.approvedAmount)}</h3>
            <p className="text-sm text-muted-foreground">Approved</p>
          </div>

          {/* Team */}
          <div
            className="group relative overflow-hidden rounded-2xl border border-border/50 bg-card p-6 hover:border-border hover:shadow-lg transition-all duration-300 cursor-pointer"
            onClick={() => navigate("/admin/employees")}
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-purple-500" />
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 rounded-xl bg-secondary/10">
                <Users className="w-6 h-6 text-secondary" />
              </div>
              <ArrowUpRight className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors" />
            </div>
            <h3 className="text-3xl font-bold mb-1">{stats.employeeCount}</h3>
            <p className="text-sm text-muted-foreground">Team Members</p>
          </div>
        </div>

        {/* Bento Grid Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-6">
          {/* Priority Row - Action Required */}
          {stats.joinRequestCount > 0 ? (
            <>
              <div className="lg:col-span-6">
                <JoinRequestsCard />
              </div>
              <div className="lg:col-span-6" data-tour="pending-expenses">
                <PendingExpensesCard />
              </div>
            </>
          ) : (
            <>
              <div className="lg:col-span-8" data-tour="pending-expenses">
                <PendingExpensesCard />
              </div>
              <div className="lg:col-span-4">
                <JoinRequestsCard />
              </div>
            </>
          )}

          {/* Second Row - Overview */}
          <div className="lg:col-span-4">
            <FinancialOverviewCard />
          </div>
          <div className="lg:col-span-4">
            <TeamOverviewCard />
          </div>
          <div className="lg:col-span-4">
            <ApprovedExpensesCard />
          </div>

          {/* Third Row - Integrations */}
          <div className="lg:col-span-4">
            <IntegrationsCard />
          </div>

          {/* AI Assistant Promo Card */}
          <div className="lg:col-span-8">
            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/5 via-transparent to-secondary/5 p-6 h-full">
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
                    <Sparkles className="w-4 h-4" />
                    AI-Powered Insights
                  </div>
                  <h3 className="text-2xl font-bold mb-2">Ask anything about your expenses</h3>
                  <p className="text-muted-foreground mb-4">
                    Get instant insights, detect anomalies, and analyze spending patterns with our AI assistant.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-xs">
                      "What's our top spending category?"
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      "Show anomalies this month"
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      "Compare to last quarter"
                    </Badge>
                  </div>
                </div>
                <div className="flex-shrink-0">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary to-secondary rounded-2xl blur-xl opacity-30 animate-pulse" />
                    <div className="relative p-6 rounded-2xl bg-card border border-border/50 shadow-xl">
                      <div className="flex items-center gap-3 mb-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-semibold">AI Assistant</p>
                          <p className="text-xs text-muted-foreground">Ready to help</p>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mb-3">Click the chat icon to start...</p>
                      <div className="flex items-center gap-2 text-xs text-primary">
                        <span>Available 24/7</span>
                        <ChevronRight className="w-3 h-3" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <AnalyticsChatbot />
    </div>
  );
};

export default OrganizationAdmin;
