import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Navigation } from "@/components/ui/navigation";
import { Building2, User, Shield } from "lucide-react";

const Auth = () => {
  const [selectedRole, setSelectedRole] = useState<"employee" | "organization" | "admin">("employee");

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
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Email</Label>
                    <Input
                      id="signin-email"
                      type="email"
                      placeholder={selectedRole === "organization" ? "admin@company.com" : "your@email.com"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signin-password">Password</Label>
                    <Input id="signin-password" type="password" />
                  </div>
                  <Button className="w-full bg-gradient-primary hover:opacity-90">
                    Sign In as {selectedRole}
                  </Button>
                </TabsContent>

                <TabsContent value="signup" className="space-y-4">
                  {selectedRole === "organization" && (
                    <div className="space-y-2">
                      <Label htmlFor="org-name">Organization Name</Label>
                      <Input id="org-name" placeholder="Company Inc." />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder={selectedRole === "organization" ? "admin@company.com" : "your@email.com"}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input id="signup-password" type="password" />
                  </div>
                  <Button className="w-full bg-gradient-primary hover:opacity-90">
                    Create Account
                  </Button>
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
