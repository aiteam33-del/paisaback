import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, TrendingUp, DollarSign, Receipt, CheckCircle, XCircle, Clock, BarChart3 } from "lucide-react";
import { StatCard } from "@/components/StatCard";
import { AnalyticsFilters } from "@/components/AnalyticsFilters";
import { ExpenseChart } from "@/components/ExpenseChart";
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

  const loadExpenses = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      let query = supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });

      // If not admin, only show user's own expenses
      if (!isAdmin) {
        query = query.eq("user_id", user.id);
      } else {
        // For admin, get expenses from their organization
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

  // Filter expenses based on date range, category, and status
  const getFilteredExpenses = () => {
    let filtered = expenses;

    // Date range filter
    if (dateRange !== "all") {
      const days = parseInt(dateRange.replace("days", ""));
      const cutoffDate = startOfDay(subDays(new Date(), days));
      filtered = filtered.filter(exp => isAfter(new Date(exp.date), cutoffDate));
    }

    // Category filter
    if (category !== "all") {
      filtered = filtered.filter(exp => exp.category === category);
    }

    // Status filter
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
    { category: "pending", name: "Pending", amount: pendingAmount, count: filteredExpenses.filter(e => e.status === "pending").length },
    { category: "approved", name: "Approved", amount: approvedAmount, count: filteredExpenses.filter(e => e.status === "approved").length },
    { category: "paid", name: "Paid", amount: paidAmount, count: filteredExpenses.filter(e => e.status === "paid").length },
    { category: "rejected", name: "Rejected", amount: rejectedAmount, count: filteredExpenses.filter(e => e.status === "rejected").length },
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
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-24 pb-16 max-w-7xl">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <BarChart3 className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">
              {isAdmin ? "Organization Analytics" : "Expense Analytics"}
            </h1>
          </div>
          <p className="text-lg text-muted-foreground">
            Insights into your spending patterns and trends
          </p>
        </div>

        <div className="space-y-6">
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

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Total Expenses"
              value={`₹${totalAmount.toFixed(2)}`}
              icon={DollarSign}
            />
            <StatCard
              title="Average Expense"
              value={`₹${avgAmount.toFixed(2)}`}
              icon={TrendingUp}
            />
            <StatCard
              title="Total Count"
              value={filteredExpenses.length}
              icon={Receipt}
            />
            <StatCard
              title="Approval Rate"
              value={`${approvalRate}%`}
              icon={CheckCircle}
              trend={Number(approvalRate) >= 80 ? "up" : Number(approvalRate) >= 60 ? "neutral" : "down"}
            />
          </div>

          {/* Status Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Pending"
              value={`₹${pendingAmount.toFixed(2)}`}
              icon={Clock}
              className="bg-warning/5"
            />
            <StatCard
              title="Approved"
              value={`₹${approvedAmount.toFixed(2)}`}
              icon={CheckCircle}
              className="bg-success/5"
            />
            <StatCard
              title="Paid"
              value={`₹${paidAmount.toFixed(2)}`}
              icon={CheckCircle}
              className="bg-primary/5"
            />
            <StatCard
              title="Rejected"
              value={`₹${rejectedAmount.toFixed(2)}`}
              icon={XCircle}
              className="bg-destructive/5"
            />
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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

          <div className="grid grid-cols-1 gap-6">
            <ExpenseChart
              data={monthlyData}
              type="bar"
              title="Monthly Spending Trend"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
