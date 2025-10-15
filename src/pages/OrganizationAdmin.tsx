import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Users, DollarSign, TrendingUp, CheckCircle, XCircle, Clock, Loader2 } from "lucide-react";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  totalPending: number;
  totalToBePaid: number;
  totalPaid: number;
}

interface Expense {
  id: string;
  date: string;
  category: string;
  amount: number;
  status: string;
  description: string;
  vendor: string;
  employee: {
    full_name: string;
    email: string;
  };
}

const OrganizationAdmin = () => {
  const { user, userRole } = useAuth();
  const navigate = useNavigate();
  const [organization, setOrganization] = useState<any>(null);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeExpenses, setEmployeeExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [managerNotes, setManagerNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    loadDashboardData();
  }, [user, userRole, navigate]);

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

        // Get all employees in organization
        const { data: employeesData } = await supabase
          .from("profiles")
          .select("id, full_name, email")
          .eq("organization_id", orgData.id)
          .neq("id", user.id);

        // Get all expenses for the organization - fetch separately and join in JS
        const employeeIds = (employeesData || []).map(e => e.id);
        
        const { data: expensesData } = await supabase
          .from("expenses")
          .select("*")
          .in("user_id", [...employeeIds, user.id])
          .order("date", { ascending: false });

        // Calculate pending amounts per employee
        const employeesWithPending = (employeesData || []).map(emp => {
          const empExpenses = (expensesData || []).filter(exp => exp.user_id === emp.id);
          const pending = empExpenses
            .filter(e => e.status === "pending")
            .reduce((sum, e) => sum + Number(e.amount), 0);
          const toBePaid = empExpenses
            .filter(e => e.status === "approved")
            .reduce((sum, e) => sum + Number(e.amount), 0);
          const paid = empExpenses
            .filter(e => e.status === "paid")
            .reduce((sum, e) => sum + Number(e.amount), 0);
          
          return {
            ...emp,
            totalPending: pending,
            totalToBePaid: toBePaid,
            totalPaid: paid,
          };
        });

        setEmployees(employeesWithPending);
        
        // Create employee lookup for transforming expenses
        const allEmployees = [...(employeesData || []), { id: user.id, full_name: "", email: "" }];
        const employeeLookup = new Map(
          allEmployees.map(e => [e.id, { full_name: e.full_name || "", email: e.email }])
        );
        
        // Transform expenses data
        const transformedExpenses = (expensesData || []).map(exp => ({
          id: exp.id,
          date: exp.date,
          category: exp.category,
          amount: Number(exp.amount),
          status: exp.status,
          description: exp.description,
          vendor: exp.vendor,
          employee: employeeLookup.get(exp.user_id) || { full_name: "Unknown", email: "unknown" }
        }));
        
        setAllExpenses(transformedExpenses);
      }
    } catch (error: any) {
      toast.error("Failed to load dashboard data");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEmployeeClick = (employee: Employee) => {
    setSelectedEmployee(employee);
    const expenses = allExpenses.filter(exp => 
      exp.employee.email === employee.email && exp.status === "pending"
    );
    setEmployeeExpenses(expenses);
  };

  const handleExpenseAction = async (expenseId: string, newStatus: "approved" | "rejected") => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("expenses")
        .update({
          status: newStatus,
          manager_notes: managerNotes || null
        })
        .eq("id", expenseId);

      if (error) throw error;

      toast.success(`Expense ${newStatus} successfully`);
      setSelectedExpense(null);
      setManagerNotes("");
      await loadDashboardData();
    } catch (error: any) {
      toast.error(`Failed to ${newStatus} expense`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const categoryStatusBreakdown = allExpenses.reduce((acc, exp) => {
    if (!acc[exp.category]) {
      acc[exp.category] = { approved: 0, paid: 0 };
    }
    if (exp.status === "approved") {
      acc[exp.category].approved += exp.amount;
    } else if (exp.status === "paid") {
      acc[exp.category].paid += exp.amount;
    }
    return acc;
  }, {} as Record<string, { approved: number; paid: number }>);

  const totalPending = allExpenses
    .filter(exp => exp.status === "pending")
    .reduce((sum, exp) => sum + exp.amount, 0);

  const totalPaid = allExpenses
    .filter(exp => exp.status === "approved" || exp.status === "paid")
    .reduce((sum, exp) => sum + exp.amount, 0);

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
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">{organization?.name || "Organization"}</h1>
          </div>
          <p className="text-lg text-muted-foreground">Admin Dashboard</p>
        </div>

        {/* KPI Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Paid</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalPaid.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Approved/paid expenses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Employees</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{employees.length}</div>
              <p className="text-xs text-muted-foreground">
                Active team members
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Category Breakdown */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Spending by Category
            </CardTitle>
            <CardDescription>To be paid and paid amounts per category</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(categoryStatusBreakdown).map(([category, amounts]) => (
                <div key={category} className="flex items-center justify-between">
                  <span className="font-medium">{category}</span>
                  <div className="text-right">
                    <div className="text-xs text-muted-foreground">To be paid</div>
                    <div className="font-semibold">${(amounts as {approved: number; paid: number}).approved.toFixed(2)}</div>
                    <div className="text-xs text-muted-foreground mt-1">Paid</div>
                    <div className="font-semibold">${(amounts as {approved: number; paid: number}).paid.toFixed(2)}</div>
                  </div>
                </div>
              ))}
              {Object.keys(categoryStatusBreakdown).length === 0 && (
                <p className="text-muted-foreground text-center py-4">No approved or paid expenses yet</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Employees Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Employees & Pending Expenses
            </CardTitle>
            <CardDescription>Click on an employee to review their pending expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="text-right">Pending</TableHead>
                  <TableHead className="text-right">To be paid</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employees.map((employee) => (
                  <TableRow key={employee.id}>
                    <TableCell className="font-medium">{employee.full_name || "N/A"}</TableCell>
                    <TableCell>{employee.email}</TableCell>
                    <TableCell className="text-right">
                      <span className={employee.totalToBePaid > 0 ? "font-bold text-primary" : ""}>
                        ${employee.totalToBePaid.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={employee.totalPaid > 0 ? "font-bold text-primary" : ""}>
                        ${employee.totalPaid.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleEmployeeClick(employee)}
                        disabled={employee.totalPending === 0}
                      >
                        Review
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {employees.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No employees yet. Share your organization name for employees to join.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>

      {/* Employee Expenses Modal */}
      <Dialog open={!!selectedEmployee} onOpenChange={() => setSelectedEmployee(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedEmployee?.full_name}'s Pending Expenses</DialogTitle>
            <DialogDescription>{selectedEmployee?.email}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {employeeExpenses.map((expense) => (
              <Card key={expense.id}>
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{expense.vendor}</CardTitle>
                      <CardDescription>{new Date(expense.date).toLocaleDateString()}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${expense.amount.toFixed(2)}</div>
                      <Badge variant="secondary">{expense.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{expense.description}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedExpense(expense);
                        setManagerNotes("");
                      }}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        setSelectedExpense(expense);
                        setManagerNotes("");
                      }}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {employeeExpenses.length === 0 && (
              <p className="text-center text-muted-foreground py-8">No pending expenses</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Expense Action Modal */}
      <Dialog open={!!selectedExpense} onOpenChange={() => setSelectedExpense(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedExpense && `${selectedExpense.vendor} - $${selectedExpense.amount.toFixed(2)}`}
            </DialogTitle>
            <DialogDescription>Add notes (optional) and confirm action</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="notes">Manager Notes</Label>
              <Textarea
                id="notes"
                placeholder="Add any comments or feedback..."
                value={managerNotes}
                onChange={(e) => setManagerNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex gap-2">
              <Button
                className="flex-1 bg-green-600 hover:bg-green-700"
                onClick={() => selectedExpense && handleExpenseAction(selectedExpense.id, "approved")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4 mr-1" />}
                Approve
              </Button>
              <Button
                className="flex-1"
                variant="destructive"
                onClick={() => selectedExpense && handleExpenseAction(selectedExpense.id, "rejected")}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                Reject
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OrganizationAdmin;
