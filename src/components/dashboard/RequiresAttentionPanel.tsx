import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Clock, Check, X, ChevronRight, Loader2, AlertCircle,
  ChevronDown, FileText, Receipt, UserPlus, Mail
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { getReceiptPublicUrl } from "@/lib/attachments";
import { EmptyState } from "@/components/ui/empty-state";

interface PendingExpense {
  id: string;
  vendor: string;
  amount: number;
  date: string;
  category: string;
  employee_name: string;
  user_id: string;
  description?: string;
  attachments?: string[];
}

interface JoinRequest {
  id: string;
  employee_id: string;
  employee_name: string;
  employee_email: string;
  created_at: string;
}

const categoryColors: Record<string, string> = {
  travel: "bg-blue-50 text-blue-600 dark:bg-blue-500/10 dark:text-blue-400",
  food: "bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-orange-400",
  lodging: "bg-purple-50 text-purple-600 dark:bg-purple-500/10 dark:text-purple-400",
  office: "bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400",
  other: "bg-gray-50 text-gray-600 dark:bg-gray-500/10 dark:text-gray-400",
};

export const RequiresAttentionPanel = () => {
  const [expenses, setExpenses] = useState<PendingExpense[]>([]);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [isLoadingExpenses, setIsLoadingExpenses] = useState(true);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkActioning, setBulkActioning] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadPendingExpenses();
    loadJoinRequests();
  }, []);

  const loadPendingExpenses = async () => {
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
        .select("id, full_name")
        .eq("organization_id", orgData.id);

      const employeeIds = (employeesData || []).map(e => e.id);
      const employeeLookup = new Map(
        (employeesData || []).map(e => [e.id, e.full_name])
      );

      const { data: expensesData } = await supabase
        .from("expenses")
        .select("*")
        .in("user_id", [...employeeIds, user.id])
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      const transformed = (expensesData || []).map(exp => ({
        id: exp.id,
        vendor: exp.vendor,
        amount: Number(exp.amount),
        date: exp.date,
        category: exp.category,
        employee_name: employeeLookup.get(exp.user_id) || "Unknown",
        user_id: exp.user_id,
        description: exp.description,
        attachments: exp.attachments,
      }));

      setExpenses(transformed);
    } catch (error) {
      console.error("Failed to load pending expenses:", error);
    } finally {
      setIsLoadingExpenses(false);
    }
  };

  const loadJoinRequests = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("admin_user_id", user.id)
        .single();

      if (!orgData) return;

      const { data: requestsData } = await supabase
        .from("join_requests")
        .select(`
          id,
          employee_id,
          created_at,
          profiles!join_requests_employee_id_fkey (
            full_name,
            email
          )
        `)
        .eq("org_id", orgData.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(10);

      const transformed = (requestsData || []).map((req: any) => ({
        id: req.id,
        employee_id: req.employee_id,
        employee_name: req.profiles?.full_name || "Unknown",
        employee_email: req.profiles?.email || "",
        created_at: req.created_at,
      }));

      setRequests(transformed);
    } catch (error) {
      console.error("Failed to load join requests:", error);
    } finally {
      setIsLoadingRequests(false);
    }
  };

  const handleExpenseAction = async (expenseId: string, action: "approved" | "rejected") => {
    setActioningId(expenseId);
    const expense = expenses.find(e => e.id === expenseId);
    try {
      const { error } = await supabase
        .from("expenses")
        .update({ status: action })
        .eq("id", expenseId);

      if (error) throw error;

      if (action === "approved") {
        toast.success("Expense Approved!", {
          description: `₹${expense?.amount.toLocaleString('en-IN')} from ${expense?.vendor}`,
        });
      } else {
        toast.error("Expense Rejected", {
          description: `${expense?.vendor} expense rejected`,
        });
      }
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(expenseId);
        return next;
      });
      await loadPendingExpenses();
    } catch (error: any) {
      toast.error("Action Failed", {
        description: error?.message ?? `Failed to ${action} expense`,
      });
    } finally {
      setActioningId(null);
    }
  };

  const handleBulkApprove = async () => {
    if (selectedIds.size === 0) return;
    setBulkActioning(true);
    try {
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        .from("expenses")
        .update({ status: "approved" })
        .in("id", ids);

      if (error) throw error;

      toast.success(`${ids.length} expenses approved!`);
      setSelectedIds(new Set());
      await loadPendingExpenses();
    } catch (error: any) {
      toast.error("Bulk approve failed", {
        description: error?.message,
      });
    } finally {
      setBulkActioning(false);
    }
  };

  const handleRequestAction = async (requestId: string, action: "approve" | "reject") => {
    setActioningId(requestId);
    const request = requests.find(r => r.id === requestId);
    try {
      const { error } = await supabase.rpc(
        action === "approve" ? "approve_join_request" : "reject_join_request",
        { request_id: requestId }
      );

      if (error) throw error;

      if (action === "approve") {
        toast.success("Team Member Added!", {
          description: `${request?.employee_name} has joined`,
        });
      } else {
        toast.error("Request Declined", {
          description: `${request?.employee_name}'s request declined`,
        });
      }
      await loadJoinRequests();
    } catch (error: any) {
      toast.error("Action Failed", {
        description: error?.message ?? `Failed to ${action} request`,
      });
    } finally {
      setActioningId(null);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === expenses.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(expenses.map(e => e.id)));
    }
  };

  return (
    <div className="bg-white dark:bg-card rounded-2xl shadow-sm h-full flex flex-col" data-tour="pending-expenses">
      <div className="px-6 pt-6 pb-2">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-medium text-foreground">Requires Attention</h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {expenses.length + requests.length} items need your review
            </p>
          </div>
          {selectedIds.size > 0 && (
            <Button
              size="sm"
              className="h-8 text-xs rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white"
              onClick={handleBulkApprove}
              disabled={bulkActioning}
            >
              {bulkActioning ? (
                <Loader2 className="w-3 h-3 animate-spin mr-1" />
              ) : (
                <Check className="w-3 h-3 mr-1" />
              )}
              Approve {selectedIds.size} selected
            </Button>
          )}
        </div>

        <Tabs defaultValue="expenses" className="w-full">
          <TabsList className="w-full justify-start bg-muted/50 rounded-lg p-1 h-9">
            <TabsTrigger
              value="expenses"
              className="text-xs rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"
            >
              Expenses
              {expenses.length > 0 && (
                <Badge className="ml-2 h-5 px-1.5 text-[10px] bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 border-0">
                  {expenses.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger
              value="requests"
              className="text-xs rounded-md data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm px-4"
            >
              Join Requests
              {requests.length > 0 && (
                <Badge className="ml-2 h-5 px-1.5 text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400 border-0">
                  {requests.length}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Expenses Tab */}
          <TabsContent value="expenses" className="mt-3">
            <div className="max-h-[480px] overflow-y-auto custom-scrollbar -mx-6 px-6">
              {isLoadingExpenses ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : expenses.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center mb-3">
                    <Check className="w-5 h-5 text-emerald-500" />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground">All caught up!</p>
                  <p className="text-xs text-muted-foreground/60 mt-1">No pending expenses</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {/* Select all row */}
                  {expenses.length > 1 && (
                    <div className="flex items-center gap-3 px-3 py-2 text-xs text-muted-foreground">
                      <Checkbox
                        checked={selectedIds.size === expenses.length}
                        onCheckedChange={toggleSelectAll}
                        className="h-3.5 w-3.5"
                      />
                      <span>Select all</span>
                    </div>
                  )}
                  {expenses.map((expense) => (
                    <div
                      key={expense.id}
                      className={cn(
                        "group flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-150",
                        "hover:bg-slate-50 dark:hover:bg-muted/30",
                        selectedIds.has(expense.id) && "bg-primary/5"
                      )}
                    >
                      <Checkbox
                        checked={selectedIds.has(expense.id)}
                        onCheckedChange={() => toggleSelect(expense.id)}
                        className="h-3.5 w-3.5 flex-shrink-0"
                      />

                      {/* Status indicator */}
                      <div className="w-1 h-8 rounded-full bg-amber-400 flex-shrink-0" />

                      {/* Main content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">{expense.vendor}</p>
                          <Badge
                            variant="secondary"
                            className={cn(
                              "text-[10px] capitalize h-5 px-1.5 border-0 font-normal",
                              categoryColors[expense.category.toLowerCase()] || categoryColors.other
                            )}
                          >
                            {expense.category}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs text-muted-foreground">{expense.employee_name}</span>
                          <span className="text-[10px] text-muted-foreground/50">·</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(expense.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Amount */}
                      <p className="text-sm font-semibold tabular-nums whitespace-nowrap">
                        ₹{expense.amount.toLocaleString('en-IN')}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExpenseAction(expense.id, "rejected");
                          }}
                          disabled={actioningId === expense.id}
                        >
                          {actioningId === expense.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <X className="w-3.5 h-3.5" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 rounded-lg text-emerald-500 hover:text-white hover:bg-emerald-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleExpenseAction(expense.id, "approved");
                          }}
                          disabled={actioningId === expense.id}
                        >
                          {actioningId === expense.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Check className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </div>

                      {/* Expand toggle */}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 rounded-lg"
                        onClick={() => setExpandedId(expandedId === expense.id ? null : expense.id)}
                      >
                        <ChevronDown className={cn(
                          "w-3.5 h-3.5 text-muted-foreground transition-transform duration-200",
                          expandedId === expense.id && "rotate-180"
                        )} />
                      </Button>
                    </div>
                  ))}

                  {/* View all link */}
                  <button
                    onClick={() => navigate("/admin/expenses?status=pending")}
                    className="flex items-center justify-center gap-1 w-full py-3 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    View all expenses
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </TabsContent>

          {/* Join Requests Tab */}
          <TabsContent value="requests" className="mt-3">
            <div className="max-h-[480px] overflow-y-auto custom-scrollbar -mx-6 px-6">
              {isLoadingRequests ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                </div>
              ) : requests.length === 0 ? (
                <EmptyState
                  type="inbox"
                  title="No pending requests"
                  description="New team member requests will appear here"
                  className="py-8"
                />
              ) : (
                <div className="space-y-1">
                  {requests.map((request) => (
                    <div
                      key={request.id}
                      className="group flex items-center gap-3 px-3 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-muted/30 transition-all duration-150"
                    >
                      {/* Avatar */}
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">
                          {request.employee_name.charAt(0).toUpperCase()}
                        </span>
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{request.employee_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{request.employee_email}</p>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-150">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 px-3 rounded-lg text-xs text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-500/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestAction(request.id, "reject");
                          }}
                          disabled={actioningId === request.id}
                        >
                          {actioningId === request.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Decline"
                          )}
                        </Button>
                        <Button
                          size="sm"
                          className="h-7 px-3 rounded-lg text-xs bg-primary hover:bg-primary/90 text-white"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestAction(request.id, "approve");
                          }}
                          disabled={actioningId === request.id}
                        >
                          {actioningId === request.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            "Accept"
                          )}
                        </Button>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={() => navigate("/admin/join-requests")}
                    className="flex items-center justify-center gap-1 w-full py-3 text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    View all requests
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
