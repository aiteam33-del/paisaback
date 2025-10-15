import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Building2, Users, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Onboarding = () => {
  const [mode, setMode] = useState<"create" | "join" | null>(null);
  const [orgName, setOrgName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }

    // Check if user already has an organization
    checkUserOrganization();
  }, [user, navigate]);

  const checkUserOrganization = async () => {
    if (!user) return;

    const { data: profile } = await supabase
      .from("profiles")
      .select("organization_id")
      .eq("id", user.id)
      .single();

    if (profile?.organization_id) {
      // User already has an organization, redirect to appropriate dashboard
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      const role = roleData?.role || "employee";
      
      if (role === "admin") {
        navigate("/admin");
      } else if (role === "manager" || role === "finance") {
        navigate("/organization");
      } else {
        navigate("/employee");
      }
    }
  };

  const loadOrganizations = async () => {
    setLoadingOrgs(true);
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("id, name")
        .order("name");

      if (error) throw error;
      setOrganizations(data || []);
    } catch (error: any) {
      toast.error("Failed to load organizations");
    } finally {
      setLoadingOrgs(false);
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from("organizations")
        .insert({
          name: orgName.trim(),
          admin_user_id: user.id
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Update user's profile with organization
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ organization_id: org.id })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Add admin role
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "admin"
        });

      if (roleError && !roleError.message.includes("duplicate")) throw roleError;

      toast.success(`Organization "${orgName}" created successfully!`);
      navigate("/admin");
    } catch (error: any) {
      if (error.message.includes("duplicate")) {
        toast.error("An organization with this name already exists");
      } else {
        toast.error(error.message || "Failed to create organization");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedOrgId) {
      toast.error("Please select an organization");
      return;
    }

    if (!user) return;

    setIsLoading(true);
    try {
      // Update user's profile with organization
      const { error: profileError } = await supabase
        .from("profiles")
        .update({ organization_id: selectedOrgId })
        .eq("id", user.id);

      if (profileError) throw profileError;

      const orgName = organizations.find(o => o.id === selectedOrgId)?.name;
      toast.success(`Successfully joined ${orgName}!`);
      navigate("/employee");
    } catch (error: any) {
      toast.error(error.message || "Failed to join organization");
    } finally {
      setIsLoading(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-subtle flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Welcome to PAISABACK</h1>
          <p className="text-lg text-muted-foreground">Let's get you set up</p>
        </div>

        {!mode ? (
          <div className="grid md:grid-cols-2 gap-6">
            <Card 
              className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary"
              onClick={() => setMode("create")}
            >
              <CardHeader className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Create Organization</CardTitle>
                <CardDescription className="text-base">
                  Start a new organization and become the admin
                </CardDescription>
              </CardHeader>
            </Card>

            <Card 
              className="cursor-pointer hover:shadow-xl transition-all hover:-translate-y-1 border-2 hover:border-primary"
              onClick={() => {
                setMode("join");
                loadOrganizations();
              }}
            >
              <CardHeader className="text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-gradient-primary mx-auto flex items-center justify-center">
                  <Users className="w-8 h-8 text-primary-foreground" />
                </div>
                <CardTitle className="text-2xl">Join Organization</CardTitle>
                <CardDescription className="text-base">
                  Join an existing organization as an employee
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        ) : mode === "create" ? (
          <Card className="shadow-xl">
            <CardHeader>
              <Button
                variant="ghost"
                onClick={() => setMode(null)}
                className="w-fit mb-4"
              >
                ← Back
              </Button>
              <CardTitle className="text-2xl">Create Your Organization</CardTitle>
              <CardDescription>
                You will be the administrator with full control
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateOrganization} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-name">Organization Name</Label>
                  <Input
                    id="org-name"
                    placeholder="Acme Corp"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    "Create Organization"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-xl">
            <CardHeader>
              <Button
                variant="ghost"
                onClick={() => setMode(null)}
                className="w-fit mb-4"
              >
                ← Back
              </Button>
              <CardTitle className="text-2xl">Join an Organization</CardTitle>
              <CardDescription>
                Select your organization from the list
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleJoinOrganization} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="org-select">Select Organization</Label>
                  {loadingOrgs ? (
                    <div className="flex items-center justify-center p-8">
                      <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    </div>
                  ) : organizations.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-md">
                      No organizations found. Ask your admin to create one first.
                    </p>
                  ) : (
                    <Select value={selectedOrgId} onValueChange={setSelectedOrgId} disabled={isLoading}>
                      <SelectTrigger id="org-select">
                        <SelectValue placeholder="Choose your organization" />
                      </SelectTrigger>
                      <SelectContent>
                        {organizations.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
                <Button 
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={isLoading || organizations.length === 0}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Joining...
                    </>
                  ) : (
                    "Join Organization"
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Onboarding;
