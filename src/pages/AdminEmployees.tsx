import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/ui/navigation";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Search, User, ArrowLeft } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useIsMobile } from "@/hooks/use-mobile";

interface Employee {
  id: string;
  full_name: string;
  email: string;
  totalPending: number;
  totalToBePaid: number;
  totalPaid: number;
}

const AdminEmployees = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    loadEmployees();
  }, [user, navigate]);

  const loadEmployees = async () => {
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

        // Get expenses for calculation
        const employeeIds = (employeesData || []).map(e => e.id);
        const { data: expensesData } = await supabase
          .from("expenses")
          .select("*")
          .in("user_id", employeeIds);

        // Calculate totals
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

        // Sort by highest pending first
        const sortedEmployees = [...employeesWithTotals].sort((a, b) => b.totalPending - a.totalPending);
        setEmployees(sortedEmployees);
      }
    } catch (error: any) {
      toast.error("Failed to load employees");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEmployees = employees.filter(emp =>
    emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    emp.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          <Button
            variant="ghost"
            onClick={() => navigate("/admin")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-4xl font-bold text-foreground mb-2">Employee Management</h1>
          <p className="text-lg text-muted-foreground">View and manage your team members</p>
        </div>

        {/* Search */}
        <Card className="mb-8 shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Search Employees
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Label htmlFor="search">Search by name or email</Label>
              <Input
                id="search"
                placeholder="Enter name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        {/* Employee List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>{filteredEmployees.length} Employee{filteredEmployees.length !== 1 ? 's' : ''}</CardTitle>
            <CardDescription>Click on an employee to view their detailed expenses</CardDescription>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              <div className="space-y-4">
                {filteredEmployees.map(employee => (
                  <Card key={employee.id} className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-primary/50 hover:border-l-primary"
                    onClick={() => navigate(`/admin/employee/${employee.id}`)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                            <User className="w-5 h-5 text-primary" />
                          </div>
                          <div>
                            <p className="font-semibold">{employee.full_name}</p>
                            <p className="text-sm text-muted-foreground">{employee.email}</p>
                          </div>
                        </div>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-sm">
                        <div>
                          <p className="text-muted-foreground">Pending</p>
                          <p className={`font-semibold ${employee.totalPending > 0 ? "text-primary" : ""}`}>₹{employee.totalPending.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Approved</p>
                          <p className={`font-semibold ${employee.totalToBePaid > 0 ? "text-success" : ""}`}>₹{employee.totalToBePaid.toFixed(2)}</p>
                        </div>
                        <div>
                          <p className="text-muted-foreground">Paid</p>
                          <p className={`font-semibold ${employee.totalPaid > 0 ? "text-muted-foreground" : ""}`}>₹{employee.totalPaid.toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead className="text-right">Pending</TableHead>
                    <TableHead className="text-right">Approved</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.map(employee => (
                    <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell className="font-medium">{employee.full_name}</TableCell>
                      <TableCell>{employee.email}</TableCell>
                      <TableCell className="text-right text-warning font-semibold">
                        ₹{employee.totalPending.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-success font-semibold">
                        ₹{employee.totalToBePaid.toFixed(2)}
                      </TableCell>
                      <TableCell className="text-right text-primary font-semibold">
                        ₹{employee.totalPaid.toFixed(2)}
                      </TableCell>
                       <TableCell className="text-right">
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary/90 text-primary-foreground"
                          onClick={() => navigate(`/admin/employee/${employee.id}`)}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            {filteredEmployees.length === 0 && (
              <div className="p-8 text-center text-muted-foreground">
                No employees found.
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AdminEmployees;
