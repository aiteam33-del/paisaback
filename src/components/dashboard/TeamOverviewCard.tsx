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
    <Card 
      onClick={() => navigate("/admin/employees")}
      className="group relative shadow-lg hover:shadow-2xl transition-all duration-500 border-border/50 bg-gradient-card backdrop-blur-sm h-full flex flex-col overflow-hidden cursor-pointer hover:scale-[1.02] hover:border-secondary/50"
    >
      <div className="absolute inset-0 bg-gradient-blue opacity-0 group-hover:opacity-10 transition-opacity duration-500" />
      <CardHeader className="pb-3 relative z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-secondary/20 group-hover:bg-secondary/30 transition-colors duration-300">
              <Users className="w-4 h-4 text-secondary" />
            </div>
            <CardTitle className="text-lg">Team</CardTitle>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              navigate("/admin/employees");
            }}
            className="h-8 text-xs hover:bg-secondary/20"
          >
            View All
            <ChevronRight className="w-3 h-3 ml-1" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col relative z-10">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            {/* Employee Count */}
            <div className="mb-4 p-4 rounded-lg bg-secondary/10 border border-secondary/20 hover:bg-secondary/15 transition-all duration-300 group/item">
              <p className="text-sm text-muted-foreground mb-1">Total Employees</p>
              <p className="text-3xl font-bold text-secondary group-hover/item:scale-105 transition-transform">{totalCount}</p>
            </div>

            {/* Recent Employees */}
            {employees.length > 0 ? (
              <div className="space-y-2 flex-1">
                <p className="text-xs font-medium text-muted-foreground mb-2">Recent Members</p>
                {employees.map((employee) => (
                  <div
                    key={employee.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate("/admin/employees");
                    }}
                    className="flex items-center gap-3 p-2 rounded-lg hover:bg-gradient-card-hover hover:border border-border/50 transition-all duration-300 cursor-pointer hover:scale-[1.01]"
                  >
                    <div className="w-8 h-8 rounded-full bg-secondary/10 flex items-center justify-center flex-shrink-0">
                      <span className="text-xs font-semibold text-secondary">
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
