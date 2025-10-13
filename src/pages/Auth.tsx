import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Navigation } from "@/components/ui/navigation";
import { Building2, User, Shield, Loader2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const Auth = () => {
  const [selectedRole, setSelectedRole] = useState<"employee" | "organization" | "admin">("employee");
  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");
  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");
  const [signUpName, setSignUpName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [superiorEmail, setSuperiorEmail] = useState("");
  const [emailFrequency, setEmailFrequency] = useState("weekly");
  const [isLoading, setIsLoading] = useState(false);
  const { signUp, signIn, user } = useAuth();
  const navigate = useNavigate();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate("/employee");
    }
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
      
      // Update profile with superior email and frequency if provided for employees
      if (selectedRole === "employee" && (superiorEmail || emailFrequency !== "weekly")) {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          await supabase
            .from("profiles")
            .update({
              superior_email: superiorEmail || null,
              email_frequency: emailFrequency,
            })
            .eq("id", currentUser.id);
        }
      }
    } catch (error) {
      // Error is already handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!signUpEmail || !signUpPassword || !signUpName) {
      toast.error("Please fill in all fields");
      return;
    }

    if (selectedRole === "organization" && !orgName) {
      toast.error("Please enter organization name");
      return;
    }

    if (selectedRole === "employee" && superiorEmail && !superiorEmail.includes('@')) {
      toast.error("Please enter a valid email for your superior");
      return;
    }

    setIsLoading(true);
    try {
      await signUp(signUpEmail, signUpPassword, signUpName);
      
      // Update profile with superior email and frequency if employee
      if (selectedRole === "employee" && superiorEmail) {
        const { data: { user: newUser } } = await supabase.auth.getUser();
        if (newUser) {
          await supabase
            .from("profiles")
            .update({
              superior_email: superiorEmail,
              email_frequency: emailFrequency
            })
            .eq("id", newUser.id);
        }
      }
    } catch (error) {
      // Error is already handled in useAuth
    } finally {
      setIsLoading(false);
    }
  };

  const roleIcons = {
    employee: User,
    organization: Building2,
    admin: Shield,
  };

  const RoleIcon = roleIcons[selectedRole];

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main className="container mx-auto px-4 pt-32 pb-16">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <RoleIcon className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to PAISABACK</h1>
            <p className="text-muted-foreground">Sign in to manage your expenses</p>
          </div>

          <Card className="shadow-card border-border">
            <CardHeader>
              <CardTitle>Choose Your Role</CardTitle>
              <CardDescription>Select how you'll be using PAISABACK</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-2 mb-6">
                <Button
                  variant={selectedRole === "employee" ? "default" : "outline"}
                  className={selectedRole === "employee" ? "bg-gradient-primary" : ""}
                  onClick={() => setSelectedRole("employee")}
                >
                  <User className="w-4 h-4 mr-1" />
                  Employee
                </Button>
                <Button
                  variant={selectedRole === "organization" ? "default" : "outline"}
                  className={selectedRole === "organization" ? "bg-gradient-primary" : ""}
                  onClick={() => setSelectedRole("organization")}
                >
                  <Building2 className="w-4 h-4 mr-1" />
                  Organization
                </Button>
                <Button
                  variant={selectedRole === "admin" ? "default" : "outline"}
                  className={selectedRole === "admin" ? "bg-gradient-primary" : ""}
                  onClick={() => setSelectedRole("admin")}
                >
                  <Shield className="w-4 h-4 mr-1" />
                  Admin
                </Button>
              </div>

              <Tabs defaultValue="signin" className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-4">
                  <TabsTrigger value="signin">Sign In</TabsTrigger>
                  <TabsTrigger value="signup">Sign Up</TabsTrigger>
                </TabsList>

                <TabsContent value="signin" className="space-y-4">
                  <form onSubmit={handleSignIn} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signin-email">Email</Label>
                      <Input
                        id="signin-email"
                        type="email"
                        placeholder={selectedRole === "organization" ? "admin@company.com" : "your@email.com"}
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
                    
                    {selectedRole === "employee" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="signin-superior-email">Superior's Email (Optional)</Label>
                          <Input 
                            id="signin-superior-email" 
                            type="email"
                            placeholder="manager@company.com"
                            value={superiorEmail}
                            onChange={(e) => setSuperiorEmail(e.target.value)}
                            disabled={isLoading}
                          />
                          <p className="text-xs text-muted-foreground">
                            Update your superior's email for automated expense reports
                          </p>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="signin-email-frequency">Email Frequency</Label>
                          <Select value={emailFrequency} onValueChange={setEmailFrequency} disabled={isLoading}>
                            <SelectTrigger id="signin-email-frequency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily (9 AM UTC)</SelectItem>
                              <SelectItem value="weekly">Weekly (Mon 9 AM UTC)</SelectItem>
                              <SelectItem value="monthly">Monthly (1st, 9 AM UTC)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </>
                    )}
                    
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
                        `Sign In as ${selectedRole}`
                      )}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  <form onSubmit={handleSignUp} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="signup-name">Full Name</Label>
                      <Input 
                        id="signup-name" 
                        placeholder="John Doe"
                        value={signUpName}
                        onChange={(e) => setSignUpName(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    {selectedRole === "organization" && (
                      <div className="space-y-2">
                        <Label htmlFor="org-name">Organization Name</Label>
                        <Input 
                          id="org-name" 
                          placeholder="Company Inc."
                          value={orgName}
                          onChange={(e) => setOrgName(e.target.value)}
                          disabled={isLoading}
                        />
                      </div>
                    )}
                    {selectedRole === "employee" && (
                      <>
                        <div className="space-y-2">
                          <Label htmlFor="superior-email">Superior's Email (Optional)</Label>
                          <Input 
                            id="superior-email" 
                            type="email"
                            placeholder="manager@company.com"
                            value={superiorEmail}
                            onChange={(e) => setSuperiorEmail(e.target.value)}
                            disabled={isLoading}
                          />
                          <p className="text-xs text-muted-foreground">
                            For employees without organization accounts. Expense summaries will be emailed to this address.
                          </p>
                        </div>
                        {superiorEmail && (
                          <div className="space-y-2">
                            <Label htmlFor="email-frequency">Email Frequency</Label>
                            <Select value={emailFrequency} onValueChange={setEmailFrequency} disabled={isLoading}>
                              <SelectTrigger id="email-frequency">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="daily">Daily</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                                <SelectItem value="monthly">Monthly</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        )}
                      </>
                    )}
                    <div className="space-y-2">
                      <Label htmlFor="signup-email">Email</Label>
                      <Input
                        id="signup-email"
                        type="email"
                        placeholder={selectedRole === "organization" ? "admin@company.com" : "your@email.com"}
                        value={signUpEmail}
                        onChange={(e) => setSignUpEmail(e.target.value)}
                        disabled={isLoading}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signup-password">Password</Label>
                      <Input 
                        id="signup-password" 
                        type="password"
                        value={signUpPassword}
                        onChange={(e) => setSignUpPassword(e.target.value)}
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
                          Creating account...
                        </>
                      ) : (
                        "Create Account"
                      )}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default Auth;
