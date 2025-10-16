import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, TrendingUp, DollarSign, Receipt, CheckCircle, XCircle, Clock, ArrowUp, ArrowDown, ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";
import { StatCard } from "@/components/StatCard";
import { AnalyticsFilters } from "@/components/AnalyticsFilters";
import { ExpenseChart } from "@/components/ExpenseChart";
import { Button } from "@/components/ui/button";
import { startOfDay, subDays, isAfter } from "date-fns";

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  status: string;
  mode_of_payment?: string;
  vendor: string;
  user_id: string;
  created_at: string;
  approved_at?: string;
}

const ExpenseAnalytics = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState("30days");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");

  const isAdmin = userRole === "admin" || userRole === "manager" || userRole === "finance";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadExpenses();
  }, [user, navigate]);

  // Refresh data when page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        loadExpenses();
      }
    };

    const handleFocus = () => {
      loadExpenses();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [user]);

  const loadExpenses = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });

      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (profile?.organization_id) {
          const { data: employeeIds } = await supabase
            .from("profiles")
            .select("id")
            .eq("organization_id", profile.organization_id);

          if (employeeIds) {
            query = query.in("user_id", employeeIds.map(e => e.id));
          }
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setExpenses(data || []);
    } catch (error: any) {
      toast.error("Failed to load expenses");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const getFilteredExpenses = () => {
    let filtered = expenses;

    if (dateRange !== "all") {
      const days = parseInt(dateRange.replace("days", ""));
      const cutoffDate = startOfDay(subDays(new Date(), days));
      filtered = filtered.filter(exp => isAfter(new Date(exp.date), cutoffDate));
    }

    if (category !== "all") {
      filtered = filtered.filter(exp => exp.category === category);
    }

    if (status !== "all") {
      filtered = filtered.filter(exp => exp.status === status);
    }

    return filtered;
  };

  const filteredExpenses = getFilteredExpenses();

  // Calculate metrics
  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + Number(exp.amount), 0);
  const avgAmount = filteredExpenses.length > 0 ? totalAmount / filteredExpenses.length : 0;
  const pendingAmount = filteredExpenses.filter(e => e.status === "pending").reduce((sum, e) => sum + Number(e.amount), 0);
  const approvedAmount = filteredExpenses.filter(e => e.status === "approved").reduce((sum, e) => sum + Number(e.amount), 0);
  const rejectedAmount = filteredExpenses.filter(e => e.status === "rejected").reduce((sum, e) => sum + Number(e.amount), 0);
  const paidAmount = filteredExpenses.filter(e => e.status === "paid").reduce((sum, e) => sum + Number(e.amount), 0);

  const approvalRate = filteredExpenses.length > 0 
    ? ((filteredExpenses.filter(e => e.status === "approved" || e.status === "paid").length / filteredExpenses.length) * 100).toFixed(1)
    : 0;

  // Category breakdown
  const categoryData = Object.entries(
    filteredExpenses.reduce((acc, exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>)
  ).map(([category, amount]) => ({
    category,
    name: category,
    amount,
    count: filteredExpenses.filter(e => e.category === category).length
  }));

  // Monthly trend
  const monthlyData = Object.entries(
    filteredExpenses.reduce((acc, exp) => {
      const month = new Date(exp.date).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
      acc[month] = (acc[month] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>)
  ).map(([month, amount]) => ({
    category: month,
    name: month,
    amount,
    count: 0
  })).slice(0, 12).reverse();

  // Status breakdown
  const statusData = [
    { category: "Pending", name: "Pending", amount: pendingAmount, count: filteredExpenses.filter(e => e.status === "pending").length },
    { category: "Approved", name: "Approved", amount: approvedAmount, count: filteredExpenses.filter(e => e.status === "approved").length },
    { category: "Paid", name: "Paid", amount: paidAmount, count: filteredExpenses.filter(e => e.status === "paid").length },
    { category: "Rejected", name: "Rejected", amount: rejectedAmount, count: filteredExpenses.filter(e => e.status === "rejected").length },
  ].filter(d => d.amount > 0);

  // Payment method breakdown
  const paymentMethodData = Object.entries(
    filteredExpenses.reduce((acc, exp) => {
      const method = exp.mode_of_payment || "Other";
      acc[method] = (acc[method] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>)
  ).map(([method, amount]) => ({
    category: method,
    name: method,
    amount,
    count: filteredExpenses.filter(e => (e.mode_of_payment || "Other") === method).length
  }));

  // Top vendors
  const topVendors = Object.entries(
    filteredExpenses.reduce((acc, exp) => {
      acc[exp.vendor] = (acc[exp.vendor] || 0) + Number(exp.amount);
      return acc;
    }, {} as Record<string, number>)
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([vendor, amount]) => ({
      category: vendor,
      name: vendor,
      amount,
      count: filteredExpenses.filter(e => e.vendor === vendor).length
    }));

  const categories = Array.from(new Set(expenses.map(e => e.category)));

  const handleExport = () => {
    const csv = [
      ["Date", "Category", "Amount", "Status", "Vendor", "Payment Method"],
      ...filteredExpenses.map(exp => [
        exp.date,
        exp.category,
        exp.amount,
        exp.status,
        exp.vendor,
        exp.mode_of_payment || ""
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `expense-analytics-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Export complete");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-analytics flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-6 pt-24 pb-16 max-w-7xl">
        {/* Header Section */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {isAdmin ? "Organization Analytics" : "Expense Analytics"}
              </h1>
              <p className="text-muted-foreground">
                Insights into your spending patterns and trends
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => navigate(isAdmin ? "/admin" : "/employee")}
              className="group"
            >
              <ArrowLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Dashboard
            </Button>
          </div>

          {/* Filters */}
          <AnalyticsFilters
            dateRange={dateRange}
            onDateRangeChange={setDateRange}
            category={category}
            onCategoryChange={setCategory}
            categories={categories}
            status={status}
            onStatusChange={setStatus}
            onExport={handleExport}
            onRefresh={loadExpenses}
          />
        </div>

        <div className="space-y-6">
          {/* Top KPI Cards - Cleaner Design */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <DollarSign className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Expenses</p>
              <p className="text-3xl font-bold text-foreground">₹{totalAmount.toFixed(2)}</p>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Total Count</p>
              <p className="text-3xl font-bold text-foreground">{filteredExpenses.length}</p>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-primary/10">
                  <TrendingUp className="w-5 h-5 text-primary" />
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Average Expense</p>
              <p className="text-3xl font-bold text-foreground">₹{avgAmount.toFixed(2)}</p>
            </div>

            <div className="bg-card rounded-2xl p-6 shadow-sm border border-border hover:shadow-md transition-all duration-300">
              <div className="flex items-start justify-between mb-4">
                <div className="p-2.5 rounded-xl bg-success/10">
                  <CheckCircle className="w-5 h-5 text-success" />
                </div>
                <div className={cn(
                  "flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                  Number(approvalRate) >= 80 ? "bg-success/10 text-success" : "bg-warning/10 text-warning"
                )}>
                  {Number(approvalRate) >= 80 ? (
                    <ArrowUp className="w-3 h-3" />
                  ) : (
                    <ArrowDown className="w-3 h-3" />
                  )}
                  {approvalRate}%
                </div>
              </div>
              <p className="text-sm text-muted-foreground mb-1">Approval Rate</p>
              <p className="text-3xl font-bold text-foreground">{approvalRate}%</p>
            </div>
          </div>

          {/* Status Breakdown - Smaller Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-in" style={{ animationDelay: '0.2s' }}>
            <div className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-warning/10">
                  <Clock className="w-4 h-4 text-warning" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-xl font-bold text-foreground">₹{pendingAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-success/10">
                  <CheckCircle className="w-4 h-4 text-success" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Approved</p>
                  <p className="text-xl font-bold text-foreground">₹{approvedAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <CheckCircle className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-xl font-bold text-foreground">₹{paidAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>

            <div className="bg-card rounded-xl p-4 shadow-sm border border-border hover:shadow-md transition-all duration-200">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Rejected</p>
                  <p className="text-xl font-bold text-foreground">₹{rejectedAmount.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
            <ExpenseChart
              data={categoryData}
              type="pie"
              title="Spending by Category"
            />
            <ExpenseChart
              data={statusData}
              type="pie"
              title="Expenses by Status"
            />
          </div>

          <div className="grid grid-cols-1 gap-6 animate-fade-in" style={{ animationDelay: '0.4s' }}>
            <ExpenseChart
              data={monthlyData}
              type="bar"
              title="Monthly Spending Trend"
              height={300}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in" style={{ animationDelay: '0.5s' }}>
            <ExpenseChart
              data={topVendors}
              type="bar"
              title="Top 10 Vendors"
            />
            {paymentMethodData.length > 0 && (
              <ExpenseChart
                data={paymentMethodData}
                type="pie"
                title="Payment Methods"
              />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default ExpenseAnalytics;
