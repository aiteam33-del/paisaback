import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Building2, Users, DollarSign, CheckCircle, XCircle, Clock, Loader2, Search, Filter, Calendar, Receipt } from "lucide-react";

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
  attachments?: string[];
  employee: {
    full_name: string;
    email: string;
  };
}

interface JoinRequest {
  id: string;
  employee_id: string;
  org_id: string;
  status: string;
  created_at: string;
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
  const [joinRequests, setJoinRequests] = useState<JoinRequest[]>([]);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [employeeExpenses, setEmployeeExpenses] = useState<Expense[]>([]);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [managerNotes, setManagerNotes] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

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

        // Get pending join requests with employee details
        const { data: joinRequestsData, error: jrError } = await supabase
          .from("join_requests")
          .select("*")
          .eq("org_id", orgData.id)
          .eq("status", "pending")
          .order("created_at", { ascending: false });

        if (jrError) {
          console.error("Error loading join requests:", jrError);
        }

        if (joinRequestsData && joinRequestsData.length > 0) {
          // Fetch employee profiles separately
          const employeeIds = joinRequestsData.map(req => req.employee_id);
          const { data: employeeProfiles } = await supabase
            .from("profiles")
            .select("id, full_name, email")
            .in("id", employeeIds);

          const profileMap = new Map(
            (employeeProfiles || []).map(p => [p.id, { full_name: p.full_name || "Unknown", email: p.email }])
          );

          setJoinRequests(joinRequestsData.map(req => ({
            ...req,
            employee: profileMap.get(req.employee_id) || { full_name: "Unknown", email: "unknown" }
          })));
        } else {
          setJoinRequests([]);
        }

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

        // Calculate per-employee totals (pending, approved = to be paid, paid)
        const employeesWithTotals = (employeesData || []).map(emp => {
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
          } as Employee;
        });

        setEmployees(employeesWithTotals);
        
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
          attachments: exp.attachments || [],
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

  const handleEmployeeClick = (employeeId: string) => {
    navigate(`/admin/employee/${employeeId}`);
  };

  const handleJoinRequestAction = async (requestId: string, action: 'approve' | 'reject') => {
    setIsSubmitting(true);
    try {
      const functionName = action === 'approve' ? 'approve_join_request' : 'reject_join_request';
      const { data, error } = await supabase.rpc(functionName, { request_id: requestId });

      if (error) throw error;

      if (data) {
        toast.success(`Join request ${action}d successfully`);
        // Remove from local state
        setJoinRequests(prev => prev.filter(req => req.id !== requestId));
        // Reload data to reflect new employee if approved
        if (action === 'approve') {
          loadDashboardData();
        }
      } else {
        toast.error(`Failed to ${action} request`);
      }
    } catch (error: any) {
      console.error(`Error ${action}ing request:`, error);
      toast.error(`Failed to ${action} join request`);
    } finally {
      setIsSubmitting(false);
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
      await loadDashboardData();
    } catch (error: any) {
      console.error("Expense update failed:", error);
      toast.error(error?.message ?? `Failed to ${newStatus} expense`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter expenses based on all filter criteria
  const filteredExpenses = allExpenses.filter(exp => {
    const matchesSearch = searchTerm === "" || 
      exp.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      exp.employee.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = filterCategory === "all" || exp.category === filterCategory;
    const matchesEmployee = filterEmployee === "all" || exp.employee.email === filterEmployee;
    const matchesStatus = filterStatus === "all" || exp.status === filterStatus;
    
    const matchesDateFrom = !filterDateFrom || new Date(exp.date) >= new Date(filterDateFrom);
    const matchesDateTo = !filterDateTo || new Date(exp.date) <= new Date(filterDateTo);
    
    return matchesSearch && matchesCategory && matchesEmployee && matchesStatus && matchesDateFrom && matchesDateTo;
  });

  // Category breakdown: show both Approved (to be paid) and Paid
  const categoryStatusBreakdown = filteredExpenses.reduce((acc, exp) => {
    if (!acc[exp.category]) {
      acc[exp.category] = { approved: 0, paid: 0 };
    }
    if (exp.status === "approved") acc[exp.category].approved += exp.amount;
    if (exp.status === "paid") acc[exp.category].paid += exp.amount;
    return acc;
  }, {} as Record<string, { approved: number; paid: number }>);

  // Employee breakdown
  const employeeBreakdown = filteredExpenses.reduce((acc, exp) => {
    const key = exp.employee.email;
    if (!acc[key]) {
      acc[key] = { name: exp.employee.full_name, total: 0, count: 0 };
    }
    acc[key].total += exp.amount;
    acc[key].count += 1;
    return acc;
  }, {} as Record<string, { name: string; total: number; count: number }>);

  const totalPending = allExpenses
    .filter(exp => exp.status === "pending")
    .reduce((sum, exp) => sum + exp.amount, 0);

  const totalApproved = allExpenses
    .filter(exp => exp.status === "approved")
    .reduce((sum, exp) => sum + exp.amount, 0);

  // Get unique categories for filter
  const categories = Array.from(new Set(allExpenses.map(exp => exp.category)));
  
  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending": return "bg-warning/20 text-warning border-warning/30";
      case "approved": return "bg-success/20 text-success border-success/30";
      case "rejected": return "bg-destructive/20 text-destructive border-destructive/30";
      case "paid": return "bg-primary/20 text-primary border-primary/30";
      default: return "bg-muted/20 text-muted-foreground border-muted/30";
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
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Building2 className="w-8 h-8 text-primary" />
            <h1 className="text-4xl font-bold text-foreground">{organization?.name || "Organization"}</h1>
          </div>
          <p className="text-lg text-muted-foreground">Admin Dashboard</p>
        </div>

         {/* KPI Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
           <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Pending</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalPending.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting approval
              </p>
            </CardContent>
          </Card>

           <Card className="shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">₹{totalApproved.toFixed(2)}</div>
              <p className="text-xs text-muted-foreground">
                Awaiting payment
              </p>
            </CardContent>
          </Card>

           <Card className="shadow-card">
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

          <Card className="shadow-card bg-gradient-primary text-primary-foreground">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Join Requests</CardTitle>
              <Users className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{joinRequests.length}</div>
              <p className="text-xs text-primary-foreground/80">
                Pending approval
              </p>
            </CardContent>
          </Card>
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="search">Search</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Vendor, description, employee..."
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
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
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
                      <SelectItem key={emp.id} value={emp.email}>
                        {emp.full_name || emp.email}
                      </SelectItem>
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
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateFrom">From Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="dateFrom"
                    type="date"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="dateTo">To Date</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="dateTo"
                    type="date"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {(searchTerm || filterCategory !== "all" || filterEmployee !== "all" || filterStatus !== "all" || filterDateFrom || filterDateTo) && (
              <div className="mt-4 flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm("");
                    setFilterCategory("all");
                    setFilterEmployee("all");
                    setFilterStatus("all");
                    setFilterDateFrom("");
                    setFilterDateTo("");
                  }}
                >
                  Clear Filters
                </Button>
                <span className="text-sm text-muted-foreground">
                  Showing {filteredExpenses.length} of {allExpenses.length} expenses
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Expenses List - single view (tabs removed) */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Expense Details</CardTitle>
            <CardDescription>Complete list of all expenses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredExpenses.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No expenses found</p>
              ) : (
                filteredExpenses.map((expense) => (
                  <div
                    key={expense.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:shadow-sm transition-all"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {expense.employee.full_name.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{expense.vendor}</p>
                          <p className="text-sm text-muted-foreground">
                            {expense.employee.full_name} • {expense.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-13">
                        <Badge variant="outline" className={getStatusColor(expense.status)}>
                          {expense.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                          {expense.status === "approved" && <CheckCircle className="w-3 h-3 mr-1" />}
                          {expense.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                          {expense.status === "paid" && <DollarSign className="w-3 h-3 mr-1" />}
                          <span className="capitalize">{expense.status}</span>
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(expense.date).toLocaleDateString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2 ml-13">{expense.description}</p>
                      {expense.attachments && expense.attachments.length > 0 && (
                        <div className="flex gap-2 mt-2 ml-13">
                          {expense.attachments.map((url, idx) => (
                            <Button 
                              key={idx} 
                              variant="outline" 
                              size="sm"
                              onClick={() => window.open(url, '_blank')}
                            >
                              <Receipt className="w-3 h-3 mr-1" />
                              Receipt {expense.attachments!.length > 1 ? `${idx + 1}` : ''}
                            </Button>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="text-xl font-semibold text-foreground">₹{expense.amount.toFixed(2)}</p>
                      {expense.status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-destructive hover:bg-destructive/10"
                            onClick={() => {
                              setSelectedExpense(expense);
                              setManagerNotes("");
                            }}
                          >
                            <XCircle className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                          <Button
                            size="sm"
                            variant="hero"
                            onClick={() => {
                              setSelectedExpense(expense);
                              setManagerNotes("");
                            }}
                          >
                            <CheckCircle className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pending Join Requests Section */}
        {joinRequests.length > 0 && (
          <Card className="shadow-card mb-8 border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                Pending Join Requests
                <Badge variant="default" className="ml-2">{joinRequests.length}</Badge>
              </CardTitle>
              <CardDescription>Review and approve employees requesting to join your organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {joinRequests.map((request) => (
                  <div 
                    key={request.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:shadow-sm transition-shadow"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-1">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {request.employee.full_name.split(" ").map((n) => n[0]).join("")}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium text-foreground">{request.employee.full_name}</p>
                          <p className="text-sm text-muted-foreground">{request.employee.email}</p>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground ml-13">
                        Requested {new Date(request.created_at).toLocaleDateString()} at {new Date(request.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:bg-destructive/10"
                        onClick={() => handleJoinRequestAction(request.id, 'reject')}
                        disabled={isSubmitting}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        variant="hero"
                        onClick={() => handleJoinRequestAction(request.id, 'approve')}
                        disabled={isSubmitting}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Employees Table */}
        <Card className="shadow-card">
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
                      <span className={employee.totalPending > 0 ? "font-bold text-primary" : ""}>
                        ₹{employee.totalPending.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={employee.totalToBePaid > 0 ? "font-bold text-primary" : ""}>
                        ₹{employee.totalToBePaid.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <span className={employee.totalPaid > 0 ? "font-bold text-primary" : ""}>
                        ₹{employee.totalPaid.toFixed(2)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        onClick={() => handleEmployeeClick(employee.id)}
                      >
                        View Expenses
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
              <Card key={expense.id} className="shadow-card">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{expense.vendor}</CardTitle>
                      <CardDescription>{new Date(expense.date).toLocaleDateString()}</CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">₹{expense.amount.toFixed(2)}</div>
                      <Badge variant="secondary">{expense.category}</Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">{expense.description}</p>
                  {expense.attachments && expense.attachments.length > 0 && (
                    <div className="mb-4">
                      <Label className="text-xs text-muted-foreground mb-2 block">Receipts</Label>
                      <div className="flex flex-wrap gap-2">
                        {expense.attachments.map((url, idx) => (
                          <Button 
                            key={idx} 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <Receipt className="w-3 h-3 mr-1" />
                            View Receipt {expense.attachments!.length > 1 ? `${idx + 1}` : ''}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="hero"
                      size="sm"
                      onClick={() => {
                        setSelectedExpense(expense);
                        setManagerNotes("");
                      }}
                      
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
              {selectedExpense && `${selectedExpense.vendor} - ₹${selectedExpense.amount.toFixed(2)}`}
            </DialogTitle>
            <DialogDescription>
              {selectedExpense && (
                <div className="space-y-1 mt-2">
                  <p className="text-sm"><span className="font-medium">Employee:</span> {selectedExpense.employee.full_name}</p>
                  <p className="text-sm"><span className="font-medium">Category:</span> {selectedExpense.category}</p>
                  <p className="text-sm"><span className="font-medium">Date:</span> {new Date(selectedExpense.date).toLocaleDateString()}</p>
                  <p className="text-sm"><span className="font-medium">Description:</span> {selectedExpense.description}</p>
                  {selectedExpense.attachments && selectedExpense.attachments.length > 0 && (
                    <div className="mt-3">
                      <Label className="text-xs font-medium">Attached Receipts</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {selectedExpense.attachments.map((url, idx) => (
                          <Button 
                            key={idx} 
                            variant="outline" 
                            size="sm"
                            onClick={() => window.open(url, '_blank')}
                          >
                            <Receipt className="w-3 h-3 mr-1" />
                            Document {idx + 1}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
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
               <Button variant="hero"
                className="flex-1"
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
