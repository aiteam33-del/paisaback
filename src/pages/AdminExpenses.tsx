import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, Filter } from "lucide-react";
import { ExpenseCard } from "@/components/ExpenseCard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  status: string;
  description: string;
  vendor: string;
  attachments?: string[];
  employee: {
    full_name: string;
    email: string;
  };
}

const AdminExpenses = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [managerNotes, setManagerNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>(searchParams.get("category") || "all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>(searchParams.get("status") || "all");

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
      // Get organization
      const { data: orgData } = await supabase
        .from("organizations")
        .select("*")
        .eq("admin_user_id", user.id)
        .single();

      if (orgData) {
        // Get employees
        const { data: employeesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("organization_id", orgData.id)
          .neq("id", user.id);

        setEmployees(employeesData || []);

        // Get expenses
        const employeeIds = (employeesData || []).map(e => e.id);
        const { data: expensesData } = await supabase
          .from("expenses")
          .select("*")
          .in("user_id", [...employeeIds, user.id])
          .order("date", { ascending: false });

        // Create employee lookup
        const allEmployees = [...(employeesData || []), { id: user.id, full_name: "", email: "" }];
        const employeeLookup = new Map(
          allEmployees.map(e => [e.id, { full_name: e.full_name || "", email: e.email }])
        );

        // Transform expenses
        const transformedExpenses = (expensesData || []).map(exp => ({
          id: exp.id,
          date: exp.date,
          category: exp.category,
          amount: Number(exp.amount),
          status: exp.status,
          description: exp.description,
          vendor: exp.vendor,
          attachments: exp.attachments || [],
          employee: employeeLookup.get(exp.user_id) || { full_name: "Unknown", email: "unknown" }
        }));

        setExpenses(transformedExpenses);
      }
    } catch (error: any) {
      toast.error("Failed to load expenses");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExpenseAction = async (expenseId: string, newStatus: "approved" | "rejected") => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          status: newStatus,
          manager_notes: managerNotes || null,
        })
        .eq("id", expenseId)
        .eq("status", "pending");

      if (error) throw error;

      toast.success(`Expense ${newStatus} successfully`);
      setSelectedExpense(null);
      setManagerNotes("");
      await loadExpenses();
    } catch (error: any) {
      console.error("Expense update failed:", error);
      toast.error(error?.message ?? `Failed to ${newStatus} expense`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter expenses
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = searchTerm === "" ||
      exp.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.employee.full_name.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory = filterCategory === "all" || exp.category === filterCategory;
    const matchesEmployee = filterEmployee === "all" || exp.employee.email === filterEmployee;
    const matchesStatus = filterStatus === "all" || exp.status === filterStatus;

    return matchesSearch && matchesCategory && matchesEmployee && matchesStatus;
  });

  const categories = Array.from(new Set(expenses.map(exp => exp.category)));

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
          <h1 className="text-4xl font-bold text-foreground mb-2">Expense Management</h1>
          <p className="text-lg text-muted-foreground">Review and manage all employee expenses</p>
        </div>

        {/* Filters */}
        <Card className="mb-8 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
            <CardDescription>Filter and search through all expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Vendor, description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map(cat => (
                      <SelectItem key={cat} value={cat} className="capitalize">{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Employee</Label>
                <Select value={filterEmployee} onValueChange={setFilterEmployee}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Employees</SelectItem>
                    {employees.map(emp => (
                      <SelectItem key={emp.id} value={emp.email}>{emp.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expense List */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">
            {filteredExpenses.length} Expense{filteredExpenses.length !== 1 ? 's' : ''}
          </h2>
          {filteredExpenses.map(expense => (
            <ExpenseCard
              key={expense.id}
              expense={expense}
              onAction={handleExpenseAction}
              onViewDetails={setSelectedExpense}
            />
          ))}
          {filteredExpenses.length === 0 && (
            <Card className="shadow-card">
              <CardContent className="p-8 text-center text-muted-foreground">
                No expenses found matching your filters.
              </CardContent>
            </Card>
          )}
        </div>
      </main>

      {/* Expense Details Dialog */}
      <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Expense Details</DialogTitle>
            <DialogDescription>Review and take action on this expense</DialogDescription>
          </DialogHeader>
          {selectedExpense && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Vendor</Label>
                  <p className="font-medium">{selectedExpense.vendor}</p>
                </div>
                <div>
                  <Label>Amount</Label>
                  <p className="font-medium text-xl">₹{selectedExpense.amount.toFixed(2)}</p>
                </div>
                <div>
                  <Label>Category</Label>
                  <p className="font-medium capitalize">{selectedExpense.category}</p>
                </div>
                <div>
                  <Label>Status</Label>
                  <p className="font-medium capitalize">{selectedExpense.status}</p>
                </div>
                <div>
                  <Label>Employee</Label>
                  <p className="font-medium">{selectedExpense.employee.full_name}</p>
                </div>
                <div>
                  <Label>Date</Label>
                  <p className="font-medium">{new Date(selectedExpense.date).toLocaleDateString()}</p>
                </div>
              </div>
              <div>
                <Label>Description</Label>
                <p className="mt-1">{selectedExpense.description}</p>
              </div>
              {selectedExpense.status === "pending" && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Manager Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add notes about this expense..."
                      value={managerNotes}
                      onChange={(e) => setManagerNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="destructive"
                      className="flex-1"
                      onClick={() => handleExpenseAction(selectedExpense.id, "rejected")}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Reject"}
                    </Button>
                    <Button
                      variant="default"
                      className="flex-1"
                      onClick={() => handleExpenseAction(selectedExpense.id, "approved")}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Approve"}
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminExpenses;
