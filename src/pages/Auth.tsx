import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Navigation } from "@/components/ui/navigation";
import { User, Loader2, Building2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [orgSignUpEmail, setOrgSignUpEmail] = useState("");
  const [orgSignUpPassword, setOrgSignUpPassword] = useState("");
  const [orgSignUpName, setOrgSignUpName] = useState("");
  const [orgMode, setOrgMode] = useState<"create" | "join">("create");
  const [orgName, setOrgName] = useState("");
  const [selectedOrgId, setSelectedOrgId] = useState("");
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(false);
  const { signIn, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    const checkUserStatus = async () => {
      if (user) {
        // If user owns an organization, treat as admin
        const { data: orgByOwner } = await supabase
          .from("organizations")
          .select("id")
          .eq("admin_user_id", user.id)
          .maybeSingle();

        if (orgByOwner) {
          navigate("/admin");
          return;
        }

        // Otherwise route based on whether they joined an org
        const { data: profile } = await supabase
          .from("profiles")
          .select("organization_id")
          .eq("id", user.id)
          .single();

        if (!profile?.organization_id) {
          navigate("/onboarding");
        } else {
          navigate("/employee");
        }
      }
    };
    
    checkUserStatus();
  }, [user, navigate]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signInEmail || !signInPassword) {
      toast.error("Please fill in all fields");
      return;
    }

    setIsLoading(true);
    try {
      await signIn(signInEmail, signInPassword);
    } catch (error) {
      // Error is already handled in useAuth
    } finally {
      setIsLoading(false);
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

  const handleOrgSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!orgSignUpEmail || !orgSignUpPassword || !orgSignUpName) {
      toast.error("Please fill in all fields");
      return;
    }

    if (orgMode === "create" && !orgName.trim()) {
      toast.error("Please enter an organization name");
      return;
    }

    if (orgMode === "join" && !selectedOrgId) {
      toast.error("Please select an organization");
      return;
    }

    setIsLoading(true);
    try {
      // Sign up the user
      const { error: authError, data: authData } = await supabase.auth.signUp({
        email: orgSignUpEmail,
        password: orgSignUpPassword,
        options: {
          data: { full_name: orgSignUpName },
          emailRedirectTo: `${window.location.origin}/`
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        if (orgMode === "create") {
          // Create organization
          const { data: org, error: orgError } = await supabase
            .from("organizations")
            .insert({
              name: orgName.trim(),
              admin_user_id: authData.user.id
            })
            .select()
            .single();

          if (orgError) throw orgError;

          // Update user's profile with organization
          const { error: profileError } = await supabase
            .from("profiles")
            .update({ organization_id: org.id })
            .eq("id", authData.user.id);

          if (profileError) throw profileError;

          // Admin role is granted by a secure DB trigger; no client-side insert needed

          toast.success(`Organization "${orgName}" created successfully!`);
          navigate("/admin");
        } else {
          // Join existing organization via join request
          const { error: insertError } = await supabase
            .from("join_requests")
            .insert({ employee_id: authData.user.id, org_id: selectedOrgId });

          if (insertError) throw insertError;

          const orgName = organizations.find(o => o.id === selectedOrgId)?.name;
          toast.success(`Join request sent to ${orgName}. You'll be notified when approved.`);
          navigate("/pending-request");
        }
      }
    } catch (error: any) {
      if (error.message.includes("duplicate")) {
        toast.error("An organization with this name already exists or email is already registered");
      } else {
        toast.error(error.message || "Failed to create account");
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (orgMode === "join") {
      loadOrganizations();
    }
  }, [orgMode]);

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to PAISABACK</h1>
            <p className="text-muted-foreground">Sign in to manage your expenses</p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Employee Sign In (Returning Users Only) */}
            <Card className="shadow-card border-border">
              <CardHeader>
                <div className="flex items-center gap-3 mb-2">
                  <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                    <User className="w-6 h-6 text-primary" />
                  </div>
                  <CardTitle>Employee Sign In</CardTitle>
                </div>
                <CardDescription>Already have an account? Sign in here</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder="your@email.com"
                      value={signInEmail}
                      onChange={(e) => setSignInEmail(e.target.value)}
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input 
                      id="signin-password" 
                      type="password"
                      value={signInPassword}
                      onChange={(e) => setSignInPassword(e.target.value)}
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
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  
                  <p className="text-xs text-center text-muted-foreground mt-4">
                    New user? Sign up using the Organization section →
                  </p>
                </form>
            </CardContent>
          </Card>

          {/* Organization Sign Up (New Users) */}
          <Card className="shadow-card border-border">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                  <Building2 className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>Organization Sign Up</CardTitle>
              </div>
              <CardDescription>New users: Create or join an organization to get started</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleOrgSignUp} className="space-y-4">
                <div className="space-y-3 mb-4">
                  <Label className="text-base font-semibold">Choose your role:</Label>
                  <RadioGroup value={orgMode} onValueChange={(value) => setOrgMode(value as "create" | "join")}>
                    <div className="flex items-center space-x-2 p-3 border-2 border-[hsl(var(--neon-green))] rounded-lg cursor-pointer hover:shadow-[var(--neon-glow)] transition-shadow">
                      <RadioGroupItem value="create" id="create" />
                      <Label htmlFor="create" className="flex-1 cursor-pointer">
                        <div className="font-medium">Create New Organization</div>
                        <div className="text-xs text-muted-foreground">You will be the Admin</div>
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2 p-3 border-2 border-[hsl(var(--neon-green))] rounded-lg cursor-pointer hover:shadow-[var(--neon-glow)] transition-shadow">
                      <RadioGroupItem value="join" id="join" />
                      <Label htmlFor="join" className="flex-1 cursor-pointer">
                        <div className="font-medium">Join Existing Organization</div>
                        <div className="text-xs text-muted-foreground">You will be an Employee</div>
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                {orgMode === "create" && (
                  <div className="space-y-2">
                    <Label htmlFor="org-name">Organization Name</Label>
                    <Input
                      id="org-name"
                      placeholder="Acme Inc."
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      disabled={isLoading}
                    />
                    <p className="text-xs text-muted-foreground">
                      You will be the admin of this organization
                    </p>
                  </div>
                )}

                {orgMode === "join" && (
                  <div className="space-y-2">
                    <Label htmlFor="org-select">Select Organization</Label>
                    {loadingOrgs ? (
                      <div className="flex items-center justify-center p-4">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      </div>
                    ) : organizations.length === 0 ? (
                      <p className="text-sm text-muted-foreground p-4 text-center border border-dashed rounded-md">
                        No organizations found
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
                )}

                <div className="space-y-2">
                  <Label htmlFor="org-signup-name">Full Name</Label>
                  <Input 
                    id="org-signup-name" 
                    placeholder="John Doe"
                    value={orgSignUpName}
                    onChange={(e) => setOrgSignUpName(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-signup-email">Email</Label>
                  <Input
                    id="org-signup-email"
                    type="email"
                    placeholder="your@email.com"
                    value={orgSignUpEmail}
                    onChange={(e) => setOrgSignUpEmail(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="org-signup-password">Password</Label>
                  <Input 
                    id="org-signup-password" 
                    type="password"
                    value={orgSignUpPassword}
                    onChange={(e) => setOrgSignUpPassword(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <Button 
                  type="submit"
                  className="w-full bg-gradient-primary hover:opacity-90"
                  disabled={isLoading || (orgMode === "join" && organizations.length === 0)}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      {orgMode === "create" ? "Creating..." : "Joining..."}
                    </>
                  ) : (
                    <>
                      {orgMode === "create" ? "Create Organization & Sign Up" : "Join Organization & Sign Up"}
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Auth;
