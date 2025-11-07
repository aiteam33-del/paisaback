import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, ChevronRight, Loader2, Plus } from "lucide-react";
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

  return (
    <Card className="shadow-lg hover:shadow-xl transition-all duration-300 border-border/50 bg-gradient-card backdrop-blur-sm h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/20">
              <Users className="w-4 h-4 text-primary" />
            </div>
            <CardTitle className="text-lg">Team</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin/employees")}
            className="h-8 text-xs"
          >
            View All
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Employee Count */}
            <div className="mb-4 p-4 rounded-lg bg-gradient-primary text-primary-foreground">
              <p className="text-sm opacity-90 mb-1">Total Employees</p>
              <p className="text-3xl font-bold">{totalCount}</p>
            </div>

            {/* Recent Employees */}
            {employees.length > 0 ? (
              <div className="space-y-2 flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Members</p>
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent/5 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-primary">
                        {employee.full_name.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{employee.full_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{employee.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center text-muted-foreground text-sm">
                No employees yet
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};
