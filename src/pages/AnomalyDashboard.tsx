import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Loader2, 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  Activity,
  ArrowLeft,
  Download,
  HelpCircle,
  Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AnomalyKPICard } from "@/components/AnomalyKPICard";
import { FlaggedExpenseRow } from "@/components/FlaggedExpenseRow";
import { ExpenseDetailModal } from "@/components/ExpenseDetailModal";
import { ReasonGlossary } from "@/components/ReasonGlossary";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnalyticsChatbot } from "@/components/AnalyticsChatbot";

const AnomalyDashboard = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<any>(null);
  const [showGlossary, setShowGlossary] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  
  const isAdmin = userRole === "admin" || userRole === "manager" || userRole === "finance";

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (!isAdmin) {
      navigate("/employee");
      toast.error("Access denied - Admin privileges required");
      return;
    }
    loadExpenses();
  }, [user, isAdmin, navigate]);

  const loadExpenses = async () => {
    if (!user) return;

    setIsLoading(true);
    try {
      // READ-ONLY: Fetch expenses without any modifications
      let query = supabase
        .from("expenses")
        .select("*")
        .order("date", { ascending: false });

      const { data: orgByAdmin } = await supabase
        .from("organizations")
        .select("id")
        .eq("admin_user_id", user.id)
        .maybeSingle();

      let orgId = orgByAdmin?.id ?? null;

      if (!orgId) {
        const { data: profileOrg } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .maybeSingle();
        orgId = profileOrg?.organization_id ?? null;
      }

      if (orgId) {
        const { data: employees } = await supabase
          .from("profiles")
          .select("id")
          .eq("organization_id", orgId);
        if (employees && employees.length > 0) {
          query = query.in("user_id", employees.map((e) => e.id));
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      
      // Compute suspicion scores and reason codes (client-side, read-only)
      const enrichedExpenses = computeAnomalyScores(data || []);
      setExpenses(enrichedExpenses);
    } catch (error: any) {
      toast.error("Failed to load expenses");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  // Normalize text for comparison (case-insensitive, trim, remove extra spaces)
  const normalizeText = (text: string): string => {
    return text?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
  };

  // Format date to YYYY-MM-DD for comparison
  const normalizeDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toISOString().split('T')[0];
    } catch {
      return dateStr;
    }
  };

  // READ-ONLY: Compute anomaly scores without database modifications
  const computeAnomalyScores = (rawExpenses: any[]) => {
    const amounts = rawExpenses.map(e => Number(e.amount));
    const mean = amounts.reduce((a, b) => a + b, 0) / Math.max(amounts.length, 1);
    const variance = amounts.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / Math.max(amounts.length, 1);
    const stdDev = Math.sqrt(variance);

    // Build duplicate detection map with normalized keys
    const duplicateMap = new Map<string, any[]>();
    rawExpenses.forEach(expense => {
      const normalizedVendor = normalizeText(expense.vendor);
      const normalizedAmount = Number(expense.amount).toFixed(2);
      const normalizedDate = normalizeDate(expense.date);
      const key = `${normalizedVendor}|${normalizedAmount}|${normalizedDate}`;
      
      if (!duplicateMap.has(key)) {
        duplicateMap.set(key, []);
      }
      duplicateMap.get(key)!.push(expense);
    });

    // Find actual duplicates (groups with more than one expense)
    const duplicateGroups = new Map<string, any[]>();
    duplicateMap.forEach((expenses, key) => {
      if (expenses.length > 1) {
        duplicateGroups.set(key, expenses);
      }
    });

    return rawExpenses.map(expense => {
      const reasonCodes: string[] = [];
      let suspicionScore = 0;
      let duplicateInfo: any = null;

      // AI-GENERATED/MANIPULATED IMAGE DETECTION (CRITICAL - HIGHEST PRIORITY)
      // Check both new ai_flagged field and backward-compatible is_ai_generated
      if (expense.ai_flagged === true || expense.is_ai_generated === true) {
        reasonCodes.push("ai_generated");
        suspicionScore += 100; // Maximum severity - automatic critical flag
      }

      // Statistical outlier (HIGH WEIGHT - major anomaly)
      if (Math.abs(Number(expense.amount) - mean) > 2 * stdDev) {
        reasonCodes.push("statistical_outlier");
        suspicionScore += 45;
      }

      // Round number (suspicious for large amounts)
      const amt = Number(expense.amount);
      if (amt >= 100 && (amt % 100 === 0 || amt % 1000 === 0)) {
        reasonCodes.push("round_number");
        suspicionScore += 10;
      }

      // Weekend office expenses
      const day = new Date(expense.date).getDay();
      if (expense.category?.toLowerCase() === "office" && (day === 0 || day === 6)) {
        reasonCodes.push("weekend_office");
        suspicionScore += 20;
      }

      // Threshold gaming (amounts suspiciously close to approval limits)
      const thresholds = [99, 199, 499, 999, 1999, 4999, 9999];
      if (thresholds.some(t => amt >= t - 10 && amt <= t)) {
        reasonCodes.push("threshold_gaming");
        suspicionScore += 25;
      }

      // Duplicate claim detection (HIGH PRIORITY)
      const normalizedVendor = normalizeText(expense.vendor);
      const normalizedAmount = Number(expense.amount).toFixed(2);
      const normalizedDate = normalizeDate(expense.date);
      const duplicateKey = `${normalizedVendor}|${normalizedAmount}|${normalizedDate}`;
      
      if (duplicateGroups.has(duplicateKey)) {
        const duplicates = duplicateGroups.get(duplicateKey)!;
        if (duplicates.length > 1) {
          reasonCodes.push("duplicate_claim");
          suspicionScore += 40; // High severity
          duplicateInfo = {
            count: duplicates.length,
            expenseIds: duplicates.map(d => d.id),
            totalAmount: duplicates.reduce((sum, d) => sum + Number(d.amount), 0)
          };
        }
      }

      // Date mismatch (bill date vs submission date)
      try {
        const billDate = new Date(expense.date);
        const submissionDate = new Date(expense.created_at);
        const daysDiff = Math.abs((submissionDate.getTime() - billDate.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysDiff > 90) {
          reasonCodes.push("date_mismatch");
          suspicionScore += 15;
        }
      } catch {
        // Invalid date, skip
      }

      return {
        ...expense,
        suspicionScore,
        reasonCodes,
        duplicateInfo
      };
    });
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = !searchQuery || 
      expense.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
      expense.category.toLowerCase().includes(searchQuery.toLowerCase());
    
    const score = expense.suspicionScore || 0;
    const severity = score >= 50 ? "high" : score >= 30 ? "medium" : "low";
    const matchesSeverity = severityFilter === "all" || severity === severityFilter;

    return matchesSearch && matchesSeverity && expense.suspicionScore > 0;
  });

  // Critical expenses: AI-flagged images (highest priority)
  const criticalExpenses = expenses.filter(e => e.ai_flagged === true || e.is_ai_generated === true);
  const flaggedCount = expenses.filter(e => (e.suspicionScore || 0) >= 30).length;
  const highRiskCount = expenses.filter(e => (e.suspicionScore || 0) >= 50).length;
  const avgSuspicionScore = expenses.length > 0
    ? (expenses.reduce((sum, e) => sum + (e.suspicionScore || 0), 0) / expenses.length).toFixed(1)
    : "0";

  const handleExport = () => {
    const csv = [
      ["Expense ID", "Amount", "Vendor", "Category", "Date", "Status", "Suspicion Score", "Reason Codes"],
      ...filteredExpenses.map(exp => [
        exp.id,
        exp.amount,
        exp.vendor,
        exp.category,
        exp.date,
        exp.status,
        exp.suspicionScore || 0,
        (exp.reasonCodes || []).join("; ")
      ])
    ].map(row => row.join(",")).join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `flagged-expenses-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Export complete");
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-6 pt-24 pb-16 max-w-7xl">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                🕵️ Expense Anomaly Intelligence
              </h1>
              <p className="text-muted-foreground">
                AI-powered fraud detection and expense pattern analysis
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowGlossary(true)}
              >
                <HelpCircle className="w-4 h-4 mr-2" />
                Explain Rules
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back
              </Button>
            </div>
          </div>

          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <AnomalyKPICard
              title="Total Expenses"
              value={expenses.length}
              subtitle="All submissions"
              icon={Activity}
              severity="low"
            />
            <AnomalyKPICard
              title="Flagged"
              value={`${flaggedCount} (${((flaggedCount / Math.max(expenses.length, 1)) * 100).toFixed(1)}%)`}
              subtitle="Medium + High risk"
              icon={AlertTriangle}
              severity="medium"
              trend={flaggedCount > expenses.length * 0.15 ? "up" : "down"}
            />
            <AnomalyKPICard
              title="High Risk"
              value={highRiskCount}
              subtitle="Requires immediate review"
              icon={Shield}
              severity="high"
              trend={highRiskCount > 0 ? "up" : "neutral"}
            />
            <AnomalyKPICard
              title="Avg Suspicion"
              value={avgSuspicionScore}
              subtitle="Score out of 100"
              icon={TrendingUp}
              severity={Number(avgSuspicionScore) >= 30 ? "high" : "low"}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6 p-4 bg-muted/50 rounded-lg border border-border/50">
            <div className="flex-1">
              <Input
                placeholder="Search vendor, category..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-background"
              />
            </div>
            <Select value={severityFilter} onValueChange={setSeverityFilter}>
              <SelectTrigger className="w-[180px] bg-background">
                <SelectValue placeholder="Filter by risk" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="high">High Risk</SelectItem>
                <SelectItem value="medium">Medium Risk</SelectItem>
                <SelectItem value="low">Low Risk</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>

          {/* Flagged Expenses List */}
          <Tabs defaultValue="critical" className="w-full">
            <TabsList>
              <TabsTrigger value="critical" className="data-[state=active]:bg-destructive data-[state=active]:text-destructive-foreground">
                🚨 Critical ({criticalExpenses.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All Flagged ({filteredExpenses.length})
              </TabsTrigger>
              <TabsTrigger value="high">
                High Risk ({filteredExpenses.filter(e => (e.suspicionScore || 0) >= 50).length})
              </TabsTrigger>
              <TabsTrigger value="medium">
                Medium Risk ({filteredExpenses.filter(e => {
                  const s = e.suspicionScore || 0;
                  return s >= 30 && s < 50;
                }).length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="critical" className="space-y-3 mt-4">
              {criticalExpenses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No critical issues detected</p>
                  <p>All receipts passed AI-generation detection</p>
                </div>
              ) : (
                <>
                  <div className="bg-destructive/10 border-2 border-destructive/50 rounded-lg p-4 mb-4">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
                      <div>
                        <h3 className="font-semibold text-destructive mb-1">AI-Generated or Altered Images Detected</h3>
                        <p className="text-sm text-muted-foreground">
                          The following receipts have been flagged as potentially AI-generated or digitally altered. 
                          Review them carefully before approval.
                        </p>
                      </div>
                    </div>
                  </div>
                  {criticalExpenses.map(expense => (
                    <FlaggedExpenseRow
                      key={expense.id}
                      expense={expense}
                      onClick={() => setSelectedExpense(expense)}
                      onReject={loadExpenses}
                    />
                  ))}
                </>
              )}
            </TabsContent>

            <TabsContent value="all" className="space-y-3 mt-4">
              {filteredExpenses.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-lg font-medium mb-2">No flagged expenses</p>
                  <p>All expenses are within normal parameters</p>
                </div>
              ) : (
                filteredExpenses.map(expense => (
                  <FlaggedExpenseRow
                    key={expense.id}
                    expense={expense}
                    onClick={() => setSelectedExpense(expense)}
                    onReject={loadExpenses}
                  />
                ))
              )}
            </TabsContent>

            <TabsContent value="high" className="space-y-3 mt-4">
              {filteredExpenses.filter(e => (e.suspicionScore || 0) >= 50).map(expense => (
                <FlaggedExpenseRow
                  key={expense.id}
                  expense={expense}
                  onClick={() => setSelectedExpense(expense)}
                  onReject={loadExpenses}
                />
              ))}
            </TabsContent>

            <TabsContent value="medium" className="space-y-3 mt-4">
              {filteredExpenses.filter(e => {
                const s = e.suspicionScore || 0;
                return s >= 30 && s < 50;
              }).map(expense => (
                <FlaggedExpenseRow
                  key={expense.id}
                  expense={expense}
                  onClick={() => setSelectedExpense(expense)}
                  onReject={loadExpenses}
                />
              ))}
            </TabsContent>
          </Tabs>
        </div>
      </main>

      <ExpenseDetailModal
        expense={selectedExpense}
        open={!!selectedExpense}
        onOpenChange={(open) => !open && setSelectedExpense(null)}
      />

      <ReasonGlossary
        open={showGlossary}
        onOpenChange={setShowGlossary}
      />

      <AnalyticsChatbot />
    </div>
  );
};

export default AnomalyDashboard;