import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./hooks/useAuth";
import { ThemeProvider } from "@/components/theme-provider";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import Employee from "./pages/Employee";
import ExpenseHistory from "./pages/ExpenseHistory";
import ExpenseSummary from "./pages/ExpenseSummary";
import Organization from "./pages/Organization";
import OrganizationAdmin from "./pages/OrganizationAdmin";
import AdminExpenses from "./pages/AdminExpenses";
import AdminEmployees from "./pages/AdminEmployees";
import AdminJoinRequests from "./pages/AdminJoinRequests";
import AdminIntegrations from "./pages/AdminIntegrations";
import EmployeeExpenseView from "./pages/EmployeeExpenseView";
import PendingRequest from "./pages/PendingRequest";
import RejectedRequest from "./pages/RejectedRequest";
import ExpenseAnalytics from "./pages/ExpenseAnalytics";
import AnomalyDashboard from "./pages/AnomalyDashboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider defaultTheme="system" storageKey="paisaback-theme">
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/employee" element={<Employee />} />
              <Route path="/employee/history" element={<ExpenseHistory />} />
              <Route path="/employee/analytics" element={<ExpenseAnalytics />} />
              <Route path="/expense-summary" element={<ExpenseSummary />} />
              <Route path="/organization" element={<Organization />} />
              <Route path="/admin" element={<OrganizationAdmin />} />
              <Route path="/admin/expenses" element={<AdminExpenses />} />
              <Route path="/admin/employees" element={<AdminEmployees />} />
              <Route path="/admin/join-requests" element={<AdminJoinRequests />} />
              <Route path="/admin/integrations" element={<AdminIntegrations />} />
              <Route path="/admin/analytics" element={<ExpenseAnalytics />} />
              <Route path="/admin/anomalies" element={<AnomalyDashboard />} />
              <Route path="/admin/employee/:employeeId" element={<EmployeeExpenseView />} />
              <Route path="/pending-request" element={<PendingRequest />} />
              <Route path="/rejected-request" element={<RejectedRequest />} />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;