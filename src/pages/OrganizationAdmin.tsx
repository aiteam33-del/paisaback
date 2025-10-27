import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Users, Clock, CheckCircle, Loader2, BarChart3, Shield } from "lucide-react";
import { SummaryCard } from "@/components/SummaryCard";
import { Button } from "@/components/ui/button";
import { AnalyticsChatbot } from "@/components/AnalyticsChatbot";

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
      // Get organization
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("admin_user_id", user.id)
        .single();

      if (orgData) {
        setOrganization(orgData);

        // Get employees count
        const { count: employeeCount } = await supabase
          .from("profiles")
          .select("*", { count: "exact", head: true })
          .eq("organization_id", orgData.id)
          .neq("id", user.id);

        // Get join requests count
        const { count: joinRequestCount } = await supabase
          .from("join_requests")
          .select("*", { count: "exact", head: true })
          .eq("org_id", orgData.id)
          .eq("status", "pending");

        // Get expense stats
        const employeeIds = await supabase
          .from("profiles")
          .select("id")
          .eq("organization_id", orgData.id);

        const ids = (employeeIds.data || []).map(e => e.id);

        const { data: expensesData } = await supabase
          .from("expenses")
          .select("amount, status")
          .in("user_id", [...ids, user.id]);

        const totalPending = (expensesData || [])
          .filter(exp => exp.status === "pending")
          .reduce((sum, exp) => sum + Number(exp.amount), 0);

        const totalApproved = (expensesData || [])
          .filter(exp => exp.status === "approved")
          .reduce((sum, exp) => sum + Number(exp.amount), 0);

        setStats({
          totalPending,
          totalApproved,
          employeeCount: employeeCount || 0,
          joinRequestCount: joinRequestCount || 0,
        });
      }
    } catch (error: any) {
      toast.error("Failed to load dashboard data");
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
            <div className="flex gap-2">
              <Button
                onClick={() => navigate("/admin/analytics")}
                size="lg"
                variant="outline"
                className="shadow-elegant"
              >
                <BarChart3 className="w-5 h-5 mr-2" />
                Analytics
              </Button>
              <Button
                onClick={() => navigate("/admin/anomalies")}
                size="lg"
                className="bg-destructive hover:bg-destructive/90 text-white shadow-elegant"
              >
                <Shield className="w-5 h-5 mr-2" />
                Anomaly Detection
              </Button>
            </div>
          </div>
        </div>

        {/* Actionable Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <SummaryCard
            title="Total Pending"
            value={`₹${stats.totalPending.toFixed(2)}`}
            icon={Clock}
            linkTo="/admin/expenses?status=pending"
            actionText="Review Expenses"
          />
          <SummaryCard
            title="Total Approved"
            value={`₹${stats.totalApproved.toFixed(2)}`}
            icon={CheckCircle}
            linkTo="/admin/expenses?status=approved"
            actionText="View Approved"
          />
          <SummaryCard
            title="Employees"
            value={stats.employeeCount}
            icon={Users}
            linkTo="/admin/employees"
            actionText="Manage Team"
          />
          <SummaryCard
            title="Join Requests"
            value={stats.joinRequestCount}
            icon={Users}
            linkTo="/admin/join-requests"
            actionText="Review Now"
            highlight={stats.joinRequestCount > 0}
          />
        </div>
      </main>

      <AnalyticsChatbot />
    </div>
  );
};

export default OrganizationAdmin;
