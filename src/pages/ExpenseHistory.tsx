import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/ui/navigation";
import { ArrowLeft, Search, Receipt, Clock, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Expense {
  id: string;
  vendor: string;
  amount: number;
  category: string;
  status: string;
  date: string;
  description: string;
  attachments?: string[];
}

const ExpenseHistory = () => {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchExpenses();
    }
  }, [user]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchQuery, statusFilter, categoryFilter]);

  const fetchExpenses = async () => {
    if (!user) return;

    setIsLoading(true);
    const { data, error } = await supabase
      .from("expenses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Failed to load expenses");
      setIsLoading(false);
      return;
    }

    setExpenses(data || []);
    setIsLoading(false);
  };

  const filterExpenses = () => {
    let filtered = [...expenses];

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(exp => 
        exp.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
        exp.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(exp => exp.status === statusFilter);
    }

    // Category filter
    if (categoryFilter !== "all") {
      filtered = filtered.filter(exp => exp.category === categoryFilter);
    }

    setFilteredExpenses(filtered);
  };

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-subtle flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statusIcons = {
    pending: <Clock className="w-4 h-4" />,
    approved: <CheckCircle2 className="w-4 h-4" />,
    rejected: <XCircle className="w-4 h-4" />,
  };

  const statusColors = {
    pending: "bg-warning/20 text-warning border-warning/30",
    approved: "bg-success/20 text-success border-success/30",
    rejected: "bg-destructive/20 text-destructive border-destructive/30",
  };

  const totalAmount = filteredExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-24 pb-16">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/employee")}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Expense History</h1>
          <p className="text-muted-foreground">View and filter all your expense claims</p>
        </div>

        {/* Filters Section */}
        <Card className="shadow-card mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by vendor or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Statuses" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    <SelectItem value="travel">Travel</SelectItem>
                    <SelectItem value="food">Food</SelectItem>
                    <SelectItem value="lodging">Lodging</SelectItem>
                    <SelectItem value="office">Office Supplies</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="shadow-card mb-6 bg-gradient-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <p className="text-sm text-primary-foreground/80 mb-1">Total Amount (Filtered)</p>
                <p className="text-3xl font-bold">₹{totalAmount.toLocaleString('en-IN')}</p>
              </div>
              <div className="sm:text-right">
                <p className="text-sm text-primary-foreground/80 mb-1">Total Expenses</p>
                <p className="text-3xl font-bold">{filteredExpenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>All Expenses</CardTitle>
            <CardDescription>
              {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''} found
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {filteredExpenses.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No expenses found matching your filters.
              </p>
            ) : (
              filteredExpenses.map((expense) => (
                <div
                  key={expense.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border border-border hover:shadow-sm transition-shadow gap-3"
                >
                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <p className="font-medium text-foreground">{expense.vendor}</p>
                      <Badge variant="outline" className={statusColors[expense.status as keyof typeof statusColors]}>
                        {statusIcons[expense.status as keyof typeof statusIcons]}
                        <span className="ml-1 capitalize">{expense.status.replace('_', ' ')}</span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mb-1">
                      {expense.category} • {new Date(expense.date).toLocaleDateString()}
                    </p>
                    <p className="text-xs text-muted-foreground">{expense.description}</p>
                    {expense.attachments && expense.attachments.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {expense.attachments.map((url, idx) => (
                          <Button
                            key={idx}
                            variant="outline"
                            size="sm"
                            className="h-8 px-3 text-xs font-medium"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(url, '_blank', 'noopener,noreferrer');
                            }}
                          >
                            <Receipt className="w-3 h-3 mr-1.5" />
                            View Document{expense.attachments!.length > 1 ? ` ${idx + 1}` : ''}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="text-lg font-semibold text-foreground sm:ml-4">₹{expense.amount}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default ExpenseHistory;
