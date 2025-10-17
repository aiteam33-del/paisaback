import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import { Receipt, Camera, CheckCircle2, TrendingUp, Users, Banknote, BarChart3, Clock, Shield, ArrowRight, AlertCircle, FileX, DollarSign } from "lucide-react";
import heroImage from "@/assets/hero-image-modern.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();

  useEffect(() => {
    const route = async () => {
      if (!user) return;

      // Check org membership
      const { data: profile } = await supabase
        .from("profiles")
        .select("organization_id")
        .eq("id", user.id)
        .maybeSingle();

      if (!profile?.organization_id) {
        // No org yet → if pending request exists, go to pending page; else auth
        const { data: pending } = await supabase
          .from("join_requests")
          .select("id")
          .eq("employee_id", user.id)
          .eq("status", "pending")
          .maybeSingle();

        if (pending) {
          navigate('/pending-request');
          return;
        }
        navigate('/auth');
        return;
      }

      // Has org → route by role
      if (userRole) {
        if (userRole === 'admin' || userRole === 'manager' || userRole === 'finance') {
          navigate('/organization');
          return;
        }
        navigate('/employee');
      }
    };
    route();
  }, [user, userRole, navigate]);
  const problems = [
    {
      icon: FileX,
      title: "Lost Expenses",
      description: "Employees forget to claim small, recurring costs",
    },
    {
      icon: DollarSign,
      title: "Financial Burden",
      description: "Team members bear unnecessary personal losses",
    },
    {
      icon: AlertCircle,
      title: "Manual Chaos",
      description: "HR teams chase scattered claims and paperwork",
    },
  ];

  const solutions = [
    {
      icon: Camera,
      title: "Expense Tracking",
      description: "Employees capture and submit expenses instantly with photo upload and OCR",
    },
    {
      icon: CheckCircle2,
      title: "Smart Approval",
      description: "Org-level admins review, approve, or reject claims with a single click",
    },
    {
      icon: BarChart3,
      title: "Powerful Insights",
      description: "Company-wide dashboard with category-wise, employee-wise, and total spend analytics",
    },
  ];

  const pricingPlans = [
    {
      name: "Early Stage",
      price: "₹599",
      period: "/month",
      description: "Perfect for teams up to 20 employees",
      popular: false,
    },
    {
      name: "Growing Team",
      price: "₹1,099",
      period: "/month",
      description: "Ideal for teams up to 50 employees",
      popular: true,
    },
    {
      name: "Enterprise",
      price: "₹1,299",
      period: "/month",
      description: "Built for teams of 50+ employees",
      popular: false,
    },
  ];

  const benefits = [
    {
      icon: Users,
      role: "Employees",
      benefit: "Quick expense logging and faster reimbursements",
    },
    {
      icon: Banknote,
      role: "Finance Teams",
      benefit: "Streamlined approval workflows and audit trails",
    },
    {
      icon: Shield,
      role: "HR Leaders",
      benefit: "Complete visibility into company spending patterns",
    },
  ];


  return (
    <div className="min-h-screen bg-gradient-subtle">
      <Navigation />
      
      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-28 pb-16 md:pt-36 md:pb-24">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Receipt className="w-4 h-4" />
                <span className="text-sm font-semibold">Built for Indian Startups</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Automated reimbursement expense tracker{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  built for early-stage and growing Indian startups
                </span>
              </h1>
              
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed max-w-xl">
                Making reimbursements effortless, automated, and transparent for modern Indian startups.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/auth">
                  <Button size="lg" className="bg-gradient-primary hover:opacity-90 text-lg px-8 py-6 shadow-lg hover:shadow-xl transition-all">
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative order-first lg:order-last">
              <div className="absolute inset-0 bg-gradient-hero opacity-10 blur-3xl rounded-full animate-pulse"></div>
              <img
                src={heroImage}
                alt="PAISABACK automated expense management dashboard"
                className="relative rounded-2xl shadow-xl w-full"
              />
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section className="container mx-auto px-4 py-20 md:py-28 bg-card/30 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                The Reimbursement Challenge
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-4xl mx-auto leading-relaxed">
                In rapidly growing startups, employees frequently forget to file all their reimbursement expenses, 
                leading to consistent out-of-pocket losses. Meanwhile, HR and finance teams struggle with scattered, 
                manual expense claims that drain time and resources.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {problems.map((problem, index) => {
                const Icon = problem.icon;
                return (
                  <Card 
                    key={index} 
                    className="bg-gradient-card border-border/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group text-center"
                  >
                    <CardContent className="pt-8 pb-8 space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto shadow-md">
                        <Icon className="w-8 h-8 text-destructive" />
                      </div>
                      <div>
                        <h3 className="text-xl font-bold mb-2">{problem.title}</h3>
                        <p className="text-muted-foreground leading-relaxed">{problem.description}</p>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Solution Section */}
        <section className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                Meet PAISABACK: Your Solution
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                PAISABACK automates the entire reimbursement workflow, giving startups transparency and employees peace of mind.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {solutions.map((solution, index) => {
                const Icon = solution.icon;
                return (
                  <Card 
                    key={index} 
                    className="bg-gradient-card border-border/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                  >
                    <CardHeader className="space-y-4">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-md group-hover:shadow-glow transition-all mx-auto">
                        <Icon className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <div className="text-center">
                        <CardTitle className="text-2xl mb-3">{solution.title}</CardTitle>
                        <CardDescription className="text-base leading-relaxed">
                          {solution.description}
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing Section */}
        <section className="container mx-auto px-4 py-20 md:py-28 bg-card/30 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                Simple Pricing for Growing Teams
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground">
                Choose the plan that fits your team size and needs
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {pricingPlans.map((plan, index) => (
                <Card 
                  key={index} 
                  className={`bg-gradient-card border-border/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 relative ${
                    plan.popular ? 'ring-2 ring-primary shadow-xl' : ''
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                      <span className="bg-gradient-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold shadow-lg">
                        Most Popular
                      </span>
                    </div>
                  )}
                  <CardHeader className="space-y-6 text-center pt-8">
                    <div>
                      <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-4xl md:text-5xl font-bold bg-gradient-hero bg-clip-text text-transparent">
                          {plan.price}
                        </span>
                        <span className="text-muted-foreground text-lg">{plan.period}</span>
                      </div>
                    </div>
                    <p className="text-muted-foreground leading-relaxed">{plan.description}</p>
                    <Link to="/auth" className="w-full">
                      <Button 
                        className={`w-full ${
                          plan.popular 
                            ? 'bg-gradient-primary hover:opacity-90 text-primary-foreground' 
                            : 'bg-secondary hover:bg-secondary/80'
                        }`}
                        size="lg"
                      >
                        Get Started
                      </Button>
                    </Link>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section className="container mx-auto px-4 py-20 md:py-28">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                Who Benefits from PAISABACK?
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {benefits.map((item, index) => {
                const Icon = item.icon;
                return (
                  <Card 
                    key={index} 
                    className="bg-gradient-card border-border/50 shadow-card hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
                  >
                    <CardHeader className="space-y-4 text-center">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-primary flex items-center justify-center shadow-md group-hover:shadow-glow transition-all mx-auto">
                        <Icon className="w-8 h-8 text-primary-foreground" />
                      </div>
                      <div>
                        <h3 className="text-2xl font-bold mb-3">{item.role}</h3>
                        <p className="text-muted-foreground leading-relaxed text-base">
                          {item.benefit}
                        </p>
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 md:py-20">
          <Card className="shadow-xl bg-gradient-hero text-primary-foreground overflow-hidden relative border-0">
            <div className="absolute top-0 right-0 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
            <div className="absolute bottom-0 left-0 w-80 h-80 bg-primary-glow/20 rounded-full blur-3xl"></div>
            <CardContent className="relative py-16 md:py-20 px-8 text-center">
              <div className="max-w-3xl mx-auto space-y-6">
                <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold">
                  Get your PAISABACK — faster, smarter, and stress-free
                </h2>
                <p className="text-lg md:text-xl text-primary-foreground/90 leading-relaxed">
                  Making reimbursements effortless, automated, and transparent for modern Indian startups.
                </p>
                <div className="pt-6">
                  <Link to="/auth">
                    <Button 
                      size="lg" 
                      className="bg-card text-foreground hover:bg-card/90 text-lg px-10 py-6 shadow-xl hover:shadow-2xl transition-all"
                    >
                      Get Started Free
                      <ArrowRight className="ml-2 w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-10">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="bg-gradient-primary p-2 rounded-lg">
                <Receipt className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="text-lg font-bold text-foreground">PAISABACK</span>
            </div>
            <p className="text-sm text-muted-foreground">
              © 2025 PAISABACK. All rights reserved.
            </p>
            <div className="flex gap-8">
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                Privacy Policy
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                Terms of Service
              </a>
              <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors font-medium">
                Contact
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
