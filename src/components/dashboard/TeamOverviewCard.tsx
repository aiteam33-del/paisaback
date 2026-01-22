import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, Loader2, UserPlus, ArrowUpRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

interface Employee {
  id: string;
  full_name: string;
  email: string;
}

export const TeamOverviewCard = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: orgData } = await supabase
        .from("organizations")
        .select("id")
        .eq("admin_user_id", user.id)
        .single();

      if (!orgData) return;

      const { data: employeesData, count } = await supabase
        .from("profiles")
        .select("id, full_name, email", { count: "exact" })
        .eq("organization_id", orgData.id)
        .neq("id", user.id)
        .order("created_at", { ascending: false })
        .limit(4);

      setEmployees(employeesData || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Failed to load employees:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const getAvatarGradient = (name: string) => {
    const gradients = [
      "from-blue-500 to-cyan-500",
      "from-violet-500 to-purple-500",
      "from-emerald-500 to-teal-500",
      "from-orange-500 to-amber-500",
      "from-pink-500 to-rose-500",
    ];
    const index = name.charCodeAt(0) % gradients.length;
    return gradients[index];
  };

  return (
    <Card
      onClick={() => navigate("/admin/employees")}
      className="h-full flex flex-col cursor-pointer relative overflow-hidden group hover:shadow-lg transition-all duration-300"
    >
      {/* Gradient accent line */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-violet-500" />

      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />

      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-500/20 rounded-xl blur-md" />
              <div className="relative p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/20">
                <Users className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div>
              <CardTitle className="text-base font-semibold">Team</CardTitle>
              <p className="text-xs text-muted-foreground">Manage your employees</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/employees");
            }}
            className="h-8 text-xs rounded-lg hover:bg-blue-500/10 hover:text-blue-600"
          >
            View All
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="relative">
              <div className="w-10 h-10 rounded-full border-2 border-blue-500/20 border-t-blue-500 animate-spin" />
            </div>
          </div>
        ) : (
          <>
            {/* Employee Count - Hero stat */}
            <div className="mb-4 p-4 rounded-xl bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-transparent border border-blue-500/20">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">Total Members</p>
                  <p className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                    {totalCount}
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-blue-500/20 to-indigo-500/10 flex items-center justify-center">
                  <Users className="w-6 h-6 text-blue-500" />
                </div>
              </div>
            </div>

            {/* Recent Employees */}
            {employees.length > 0 ? (
              <div className="space-y-2 flex-1">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Recent Members</p>
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/admin/employees");
                    }}
                    className="group/item flex items-center gap-3 p-2.5 rounded-xl hover:bg-blue-500/5 border border-transparent hover:border-blue-500/20 transition-all cursor-pointer"
                  >
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${getAvatarGradient(employee.full_name)} flex items-center justify-center flex-shrink-0 shadow-sm`}>
                      <span className="text-xs font-bold text-white">
                        {employee.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate group-hover/item:text-blue-600 transition-colors">
                        {employee.full_name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                    </div>
                    <ArrowUpRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover/item:opacity-100 group-hover/item:text-blue-500 transition-all" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-3">
                  <UserPlus className="w-6 h-6 text-blue-500" />
                </div>
                <p className="text-sm font-medium text-muted-foreground">No employees yet</p>
                <p className="text-xs text-muted-foreground/60">Invite team members to get started</p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
