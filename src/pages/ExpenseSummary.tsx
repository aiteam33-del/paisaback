import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Receipt, FileText, AlertCircle, Search, Wallet, Clock } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

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

interface UserInfo {
  full_name: string;
  email: string;
}

const ExpenseSummary = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [user, setUser] = useState<UserInfo | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedAttachments, setSelectedAttachments] = useState<string[]>([]);
  const [isAttachmentDialogOpen, setIsAttachmentDialogOpen] = useState(false);

  useEffect(() => {
    const verifyTokenAndFetchExpenses = async () => {
      if (!token) {
        setError("No access token provided. Please use the link from your email.");
        setLoading(false);
        return;
      }

      try {
        const { data, error: functionError } = await supabase.functions.invoke(
          'verify-expense-token',
          {
            body: { token }
          }
        );

        if (functionError) {
          console.error('Function error:', functionError);
          setError(functionError.message || 'Invalid or expired token');
          setLoading(false);
          return;
        }

        if (data.error) {
          setError(data.error);
          setLoading(false);
          return;
        }

        setUser(data.user);
        setExpenses(data.expenses);
        setFilteredExpenses(data.expenses);
        setLoading(false);
      } catch (err: any) {
        console.error('Error verifying token:', err);
        setError('Failed to load expense summary. Please try again or contact support.');
        setLoading(false);
      }
    };

    verifyTokenAndFetchExpenses();
  }, [token]);

  useEffect(() => {
    let filtered = expenses;

    if (searchQuery) {
      filtered = filtered.filter(
        (expense) =>
          expense.vendor.toLowerCase().includes(searchQuery.toLowerCase()) ||
          expense.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((expense) => expense.status === statusFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((expense) => expense.category === categoryFilter);
    }

    setFilteredExpenses(filtered);
  }, [searchQuery, statusFilter, categoryFilter, expenses]);

  const handleViewAttachments = (attachments: string[]) => {
    setSelectedAttachments(attachments);
    setIsAttachmentDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading expense summary...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 to-primary/10 p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount), 0);
  const categories = Array.from(new Set(expenses.map(e => e.category)));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-primary rounded-lg p-2">
                <Wallet className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold">PAISABACK</h1>
                <p className="text-sm text-muted-foreground">{user?.email}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filters</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by vendor or description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
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
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category.charAt(0).toUpperCase() + category.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Summary Card */}
        <Card className="bg-primary text-primary-foreground">
          <CardContent className="pt-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm opacity-90 mb-1">Total Amount (Filtered)</p>
                <p className="text-4xl font-bold">₹{totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
              </div>
              <div className="text-right">
                <p className="text-sm opacity-90 mb-1">Total Expenses</p>
                <p className="text-4xl font-bold">{filteredExpenses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses List */}
        <Card>
          <CardHeader>
            <CardTitle>All Expenses</CardTitle>
            <CardDescription>
              {filteredExpenses.length} {filteredExpenses.length === 1 ? 'expense' : 'expenses'} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredExpenses.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Receipt className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No expenses found</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredExpenses.map((expense) => (
                  <Card key={expense.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <h3 className="font-bold text-lg">{expense.vendor}</h3>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                <span className="capitalize">{expense.category}</span>
                                <span>•</span>
                                <span>{new Date(expense.date).toLocaleDateString('en-IN')}</span>
                              </div>
                            </div>
                            <Badge 
                              variant="secondary" 
                              className={`whitespace-nowrap ${
                                expense.status === 'pending' ? 'bg-yellow-500/10 text-yellow-700 border-yellow-300' :
                                expense.status === 'approved' ? 'bg-green-500/10 text-green-700 border-green-300' :
                                'bg-red-500/10 text-red-700 border-red-300'
                              }`}
                            >
                              <Clock className="h-3 w-3 mr-1" />
                              {expense.status.charAt(0).toUpperCase() + expense.status.slice(1)}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{expense.description}</p>
                          {expense.attachments && expense.attachments.length > 0 && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewAttachments(expense.attachments!)}
                              className="mt-2"
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              View Document
                            </Button>
                          )}
                        </div>
                        <div className="sm:text-right">
                          <p className="text-2xl font-bold">₹{Number(expense.amount).toFixed(2)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Attachments Dialog */}
      <Dialog open={isAttachmentDialogOpen} onOpenChange={setIsAttachmentDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Receipt Attachments</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAttachments.map((url, index) => (
              <div key={index} className="border rounded-lg overflow-hidden">
                <img
                  src={url}
                  alt={`Receipt ${index + 1}`}
                  className="w-full h-auto"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    target.style.display = 'none';
                    const errorDiv = document.createElement('div');
                    errorDiv.className = 'p-8 text-center text-muted-foreground';
                    errorDiv.innerHTML = `
                      <div class="flex flex-col items-center gap-2">
                        <svg class="h-12 w-12 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                        </svg>
                        <p>Unable to load image. <a href="${url}" target="_blank" class="text-primary hover:underline">Open in new tab</a></p>
                      </div>
                    `;
                    target.parentNode?.appendChild(errorDiv);
                  }}
                />
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ExpenseSummary;
