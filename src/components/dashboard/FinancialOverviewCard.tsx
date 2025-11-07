import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, TrendingDown, DollarSign, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const FinancialOverviewCard = () => {
  const [data, setData] = useState({
    totalPending: 0,
    totalApproved: 0,
    pendingCount: 0,
    approvedCount: 0,
    pendingTrend: 5,
    approvedTrend: 12,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("admin_user_id", user.id)
        .single();

      if (!orgData) return;

      const { data: employeesData } = await supabase
        .from("profiles")
        .select("id")
        .eq("organization_id", orgData.id);

      const employeeIds = (employeesData || []).map(e => e.id);

      const { data: expensesData } = await supabase
        .from("expenses")
        .select("amount, status")
        .in("user_id", [...employeeIds, user.id]);

      const pending = (expensesData || []).filter(exp => exp.status === "pending");
      const approved = (expensesData || []).filter(exp => exp.status === "approved");

      const totalPending = pending.reduce((sum, exp) => sum + Number(exp.amount), 0);
      const totalApproved = approved.reduce((sum, exp) => sum + Number(exp.amount), 0);

      setData({
        totalPending,
        totalApproved,
        pendingCount: pending.length,
        approvedCount: approved.length,
        pendingTrend: 5,
        approvedTrend: 12,
      });
    } catch (error) {
      console.error("Failed to load financial data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-border/50 bg-gradient-card backdrop-blur-sm h-full overflow-hidden relative group">
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-primary opacity-5 rounded-full blur-2xl group-hover:opacity-10 transition-opacity" />
      
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-gradient-primary shadow-md">
            <DollarSign className="w-4 h-4 text-primary-foreground" />
          </div>
          <CardTitle className="text-lg">Financial Overview</CardTitle>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4 relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Pending Section */}
            <div className="p-3 rounded-lg bg-warning/5 border border-warning/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Pending</span>
                <div className="flex items-center gap-1 text-xs text-warning">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{data.pendingTrend}%</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">₹{data.totalPending.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">{data.pendingCount} expenses</p>
              </div>
            </div>

            {/* Approved Section */}
            <div className="p-3 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-muted-foreground font-medium">Approved</span>
                <div className="flex items-center gap-1 text-xs text-success">
                  <TrendingUp className="w-3 h-3" />
                  <span>+{data.approvedTrend}%</span>
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold text-foreground">₹{data.totalApproved.toLocaleString('en-IN')}</p>
                <p className="text-xs text-muted-foreground">{data.approvedCount} expenses</p>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Volume</span>
                <span className="font-semibold">₹{(data.totalPending + data.totalApproved).toLocaleString('en-IN')}</span>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
