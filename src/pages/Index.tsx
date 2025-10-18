import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/ui/navigation";
import { Receipt, Camera, CheckCircle2, TrendingUp, Users, Banknote, BarChart3, Clock, Shield, ArrowRight, AlertCircle, FileX, DollarSign, Upload, Sparkles, Wallet, Bell, ClipboardCheck, PieChart, Lock, Instagram, Linkedin } from "lucide-react";
import heroImage from "@/assets/hero-image-modern.png";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useScrollAnimation } from "@/hooks/useScrollAnimation";
import { WaitlistPopup } from "@/components/WaitlistPopup";
import { FloatingWaitlistButton } from "@/components/FloatingWaitlistButton";
import { ScrollProgressBar } from "@/components/ScrollProgressBar";
import { ProductDemoVideo } from "@/components/ProductDemoVideo";
import { TestimonialCard } from "@/components/TestimonialCard";
import { TrustBadge } from "@/components/TrustBadge";

const Index = () => {
  const navigate = useNavigate();
  const { user, userRole } = useAuth();
  const [activeStep, setActiveStep] = useState(0);
  const [activeCompanyStep, setActiveCompanyStep] = useState(0);
  const [isWaitlistOpen, setIsWaitlistOpen] = useState(false);
  const [hasShownWaitlist, setHasShownWaitlist] = useState(false);
  
  const employeeSection = useScrollAnimation();
  const companySection = useScrollAnimation();
  const problemSection = useScrollAnimation();
  const solutionSection = useScrollAnimation();
  const pricingSection = useScrollAnimation();
  const benefitsSection = useScrollAnimation();
  const ctaSection = useScrollAnimation();
  const testimonialSection = useScrollAnimation();

  const demoSteps = [
    {
      icon: Upload,
      title: "Upload Receipt",
      description: "Snap a photo or upload your expense receipt instantly",
      color: "from-blue-500 to-cyan-500",
      delay: 0,
    },
    {
      icon: Sparkles,
      title: "AI Analysis",
      description: "Our AI extracts amount, vendor, date, and auto-categorizes",
      color: "from-purple-500 to-pink-500",
      delay: 200,
    },
    {
      icon: Wallet,
      title: "Get Reimbursed",
      description: "Approval in one click, money back in your account fast",
      color: "from-green-500 to-emerald-500",
      delay: 400,
    },
  ];

  const companySteps = [
    {
      icon: Bell,
      title: "Receive Claims",
      description: "Get instant notifications when employees submit expenses",
      color: "from-orange-500 to-amber-500",
      delay: 0,
    },
    {
      icon: ClipboardCheck,
      title: "Review & Approve",
      description: "Single-click approval workflow with complete audit trail",
      color: "from-indigo-500 to-blue-500",
      delay: 200,
    },
    {
      icon: PieChart,
      title: "Track & Analyze",
      description: "Real-time analytics on spending patterns and team expenses",
      color: "from-teal-500 to-green-500",
      delay: 400,
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % demoSteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setActiveCompanyStep((prev) => (prev + 1) % companySteps.length);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Waitlist popup triggers
  useEffect(() => {
    if (hasShownWaitlist || user) return;

    // Show after 15 seconds
    const timer = setTimeout(() => {
      setIsWaitlistOpen(true);
      setHasShownWaitlist(true);
    }, 15000);

    // Show at 70% scroll
    const handleScroll = () => {
      const scrollPercentage = (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100;
      if (scrollPercentage >= 70 && !hasShownWaitlist) {
        setIsWaitlistOpen(true);
        setHasShownWaitlist(true);
      }
    };

    window.addEventListener('scroll', handleScroll);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [hasShownWaitlist, user]);

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

  const testimonials = [
    {
      quote: "PAISABACK transformed how our team handles reimbursements. No more lost receipts or delayed payments!",
      name: "Priya Sharma",
      role: "Operations Manager, Tech Startup",
    },
    {
      quote: "The AI automatically categorizes expenses and saves us hours every week. Game changer for our finance team.",
      name: "Rahul Mehta",
      role: "CFO, Growing SaaS Company",
    },
    {
      quote: "Finally, a reimbursement solution built for Indian startups. Simple, fast, and exactly what we needed.",
      name: "Anjali Desai",
      role: "HR Lead, Early-Stage Startup",
    },
  ];


  return (
    <div className="min-h-screen bg-gradient-subtle">
      <ScrollProgressBar />
      <Navigation />
      <WaitlistPopup isOpen={isWaitlistOpen} onClose={() => setIsWaitlistOpen(false)} />
      {!user && hasShownWaitlist && (
        <FloatingWaitlistButton onClick={() => setIsWaitlistOpen(true)} />
      )}
      
      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 pt-28 pb-16 md:pt-36 md:pb-24 animate-fade-in">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="space-y-6 animate-fade-in" style={{ animationDelay: "200ms" }}>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary border border-primary/20 shadow-sm">
                <Receipt className="w-4 h-4" />
                <span className="text-sm font-semibold">Built for Indian Startups</span>
              </div>
              
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight">
                Smart Reimbursements.{" "}
                <span className="bg-gradient-hero bg-clip-text text-transparent">
                  Simplified.
                </span>
              </h1>
              
              <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed">
                Upload your bills, let AI analyze them, and get your money back — instantly.
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/auth">
                  <Button 
                    size="lg" 
                    className="bg-gradient-primary hover:opacity-90 hover:scale-105 text-lg px-10 py-7 shadow-2xl hover:shadow-glow transition-all duration-300 rounded-xl font-semibold"
                  >
                    Get Started with PAISABACK
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
              </div>
            </div>
            
            <div className="relative order-first lg:order-last animate-fade-in" style={{ animationDelay: "400ms" }}>
              <div className="absolute inset-0 bg-gradient-hero opacity-20 blur-3xl rounded-full animate-pulse"></div>
              <img
                src={heroImage}
                alt="PAISABACK automated expense management dashboard"
                className="relative rounded-2xl shadow-2xl w-full hover:scale-105 transition-transform duration-500"
              />
            </div>
          </div>
        </section>

        {/* Product Demo Video */}
        <ProductDemoVideo />

        {/* Interactive Demo Section */}
        <section 
          ref={employeeSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 py-20 md:py-28 transition-all duration-1000 ${
            employeeSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                Built for Employees
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground">
                Get your money back fast — no paperwork hassle
              </p>
            </div>

            {/* Desktop View - Horizontal Flow */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Connection Lines */}
                <div className="absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                
                <div className="grid md:grid-cols-3 gap-8 relative">
                  {demoSteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = activeStep === index;
                    return (
                      <div
                        key={index}
                        className={`relative transition-all duration-500 ${
                          isActive ? 'scale-105' : 'scale-95 opacity-70'
                        }`}
                        style={{ transitionDelay: `${step.delay}ms` }}
                      >
                        <Card className={`bg-gradient-card border-2 ${
                          isActive ? 'border-primary shadow-2xl' : 'border-border/50 shadow-card'
                        } transition-all duration-500 hover:shadow-xl overflow-hidden`}>
                          <CardContent className="pt-8 pb-8 space-y-6 relative">
                            {/* Step Number */}
                            <div className="absolute top-4 right-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                            </div>

                            {/* Animated Icon */}
                            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                              <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-3xl blur-2xl opacity-30 ${
                                isActive ? 'animate-pulse' : ''
                              }`}></div>
                              <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl ${
                                isActive ? 'animate-scale-in' : ''
                              }`}>
                                <Icon className="w-12 h-12 text-white" />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="text-center space-y-3">
                              <h3 className="text-2xl font-bold">{step.title}</h3>
                              <p className="text-muted-foreground leading-relaxed">
                                {step.description}
                              </p>
                            </div>

                            {/* Progress Indicator */}
                            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${
                                  isActive ? 'w-full' : 'w-0'
                                }`}
                              ></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Arrow Between Steps */}
                        {index < demoSteps.length - 1 && (
                          <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                            <ArrowRight className={`w-8 h-8 ${
                              isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'
                            }`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Indicators */}
              <div className="flex justify-center gap-3 mt-12">
                {demoSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`transition-all duration-300 rounded-full ${
                      activeStep === index 
                        ? 'w-12 h-3 bg-primary' 
                        : 'w-3 h-3 bg-muted hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Mobile View - Vertical Stack */}
            <div className="md:hidden space-y-6">
              {demoSteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeStep === index;
                return (
                  <Card 
                    key={index}
                    className={`bg-gradient-card border-2 ${
                      isActive ? 'border-primary shadow-2xl scale-105' : 'border-border/50 shadow-card scale-95'
                    } transition-all duration-500`}
                  >
                    <CardContent className="pt-6 pb-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{step.title}</h3>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${
                            isActive ? 'w-full' : 'w-0'
                          }`}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              <div className="flex justify-center gap-2 pt-4">
                {demoSteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveStep(index)}
                    className={`transition-all duration-300 rounded-full ${
                      activeStep === index 
                        ? 'w-10 h-2.5 bg-primary' 
                        : 'w-2.5 h-2.5 bg-muted'
                    }`}
                    aria-label={`Go to step ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Company Demo Section */}
        <section 
          ref={companySection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 py-20 md:py-28 bg-card/30 backdrop-blur-sm transition-all duration-1000 ${
            companySection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                Built for Finance Teams & Admins
              </h2>
              <p className="text-lg md:text-xl text-muted-foreground">
                Complete control and visibility over company expenses
              </p>
            </div>

            {/* Desktop View - Horizontal Flow */}
            <div className="hidden md:block">
              <div className="relative">
                {/* Connection Lines */}
                <div className="absolute top-24 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-border to-transparent"></div>
                
                <div className="grid md:grid-cols-3 gap-8 relative">
                  {companySteps.map((step, index) => {
                    const Icon = step.icon;
                    const isActive = activeCompanyStep === index;
                    return (
                      <div
                        key={index}
                        className={`relative transition-all duration-500 ${
                          isActive ? 'scale-105' : 'scale-95 opacity-70'
                        }`}
                        style={{ transitionDelay: `${step.delay}ms` }}
                      >
                        <Card className={`bg-gradient-card border-2 ${
                          isActive ? 'border-primary shadow-2xl' : 'border-border/50 shadow-card'
                        } transition-all duration-500 hover:shadow-xl overflow-hidden`}>
                          <CardContent className="pt-8 pb-8 space-y-6 relative">
                            {/* Step Number */}
                            <div className="absolute top-4 right-4">
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                              }`}>
                                {index + 1}
                              </div>
                            </div>

                            {/* Animated Icon */}
                            <div className="relative mx-auto w-32 h-32 flex items-center justify-center">
                              <div className={`absolute inset-0 bg-gradient-to-br ${step.color} rounded-3xl blur-2xl opacity-30 ${
                                isActive ? 'animate-pulse' : ''
                              }`}></div>
                              <div className={`relative w-24 h-24 rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-xl ${
                                isActive ? 'animate-scale-in' : ''
                              }`}>
                                <Icon className="w-12 h-12 text-white" />
                              </div>
                            </div>

                            {/* Content */}
                            <div className="text-center space-y-3">
                              <h3 className="text-2xl font-bold">{step.title}</h3>
                              <p className="text-muted-foreground leading-relaxed">
                                {step.description}
                              </p>
                            </div>

                            {/* Progress Indicator */}
                            <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                              <div 
                                className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${
                                  isActive ? 'w-full' : 'w-0'
                                }`}
                              ></div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Arrow Between Steps */}
                        {index < companySteps.length - 1 && (
                          <div className="absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                            <ArrowRight className={`w-8 h-8 ${
                              isActive ? 'text-primary animate-pulse' : 'text-muted-foreground'
                            }`} />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Step Indicators */}
              <div className="flex justify-center gap-3 mt-12">
                {companySteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveCompanyStep(index)}
                    className={`transition-all duration-300 rounded-full ${
                      activeCompanyStep === index 
                        ? 'w-12 h-3 bg-primary' 
                        : 'w-3 h-3 bg-muted hover:bg-muted-foreground/50'
                    }`}
                    aria-label={`Go to company step ${index + 1}`}
                  />
                ))}
              </div>
            </div>

            {/* Mobile View - Vertical Stack */}
            <div className="md:hidden space-y-6">
              {companySteps.map((step, index) => {
                const Icon = step.icon;
                const isActive = activeCompanyStep === index;
                return (
                  <Card 
                    key={index}
                    className={`bg-gradient-card border-2 ${
                      isActive ? 'border-primary shadow-2xl scale-105' : 'border-border/50 shadow-card scale-95'
                    } transition-all duration-500`}
                  >
                    <CardContent className="pt-6 pb-6 space-y-4">
                      <div className="flex items-center gap-4">
                        <div className={`w-16 h-16 rounded-xl bg-gradient-to-br ${step.color} flex items-center justify-center shadow-lg flex-shrink-0`}>
                          <Icon className="w-8 h-8 text-white" />
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold mb-1">{step.title}</h3>
                          <p className="text-sm text-muted-foreground">{step.description}</p>
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0 ${
                          isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                        }`}>
                          {index + 1}
                        </div>
                      </div>
                      <div className="w-full bg-muted rounded-full h-1 overflow-hidden">
                        <div 
                          className={`h-full bg-gradient-to-r ${step.color} transition-all duration-3000 ${
                            isActive ? 'w-full' : 'w-0'
                          }`}
                        ></div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              
              <div className="flex justify-center gap-2 pt-4">
                {companySteps.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveCompanyStep(index)}
                    className={`transition-all duration-300 rounded-full ${
                      activeCompanyStep === index 
                        ? 'w-10 h-2.5 bg-primary' 
                        : 'w-2.5 h-2.5 bg-muted'
                    }`}
                    aria-label={`Go to company step ${index + 1}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Problem Section */}
        <section 
          ref={problemSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 py-20 md:py-28 bg-card/30 backdrop-blur-sm transition-all duration-1000 ${
            problemSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
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
        <section 
          ref={solutionSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 py-20 md:py-28 transition-all duration-1000 ${
            solutionSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
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
        <section 
          ref={pricingSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 py-20 md:py-28 bg-card/30 backdrop-blur-sm transition-all duration-1000 ${
            pricingSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
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

        {/* Testimonials Section */}
        <section 
          ref={testimonialSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 py-20 md:py-28 bg-card/30 backdrop-blur-sm transition-all duration-1000 ${
            testimonialSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16 space-y-4">
              <p className="text-sm font-semibold text-primary uppercase tracking-wide">
                Trusted by teams and early users
              </p>
              <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground">
                What Our Users Say
              </h2>
            </div>

            <div className="grid md:grid-cols-3 gap-8">
              {testimonials.map((testimonial, index) => (
                <TestimonialCard
                  key={index}
                  quote={testimonial.quote}
                  name={testimonial.name}
                  role={testimonial.role}
                  delay={index * 100}
                />
              ))}
            </div>

            {/* Partner/Accelerator Badge */}
            <div className="mt-16 text-center">
              <p className="text-sm text-muted-foreground mb-4">Built at</p>
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-muted/50 border border-border">
                <span className="text-lg font-bold text-foreground">Mesa School of Business</span>
              </div>
            </div>
          </div>
        </section>

        {/* Trust & Security Section */}
        <section className="container mx-auto px-4 py-12 md:py-16">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-wrap justify-center items-center gap-6 md:gap-12">
              <TrustBadge icon={Lock} text="Bank-grade encryption" />
              <TrustBadge icon={Shield} text="Secure payments powered by Razorpay" />
              <TrustBadge icon={CheckCircle2} text="Trusted by professionals" />
            </div>
          </div>
        </section>

        {/* Benefits Section */}
        <section 
          ref={benefitsSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 py-20 md:py-28 transition-all duration-1000 ${
            benefitsSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
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
        <section 
          ref={ctaSection.ref as React.RefObject<HTMLElement>}
          className={`container mx-auto px-4 py-16 md:py-20 transition-all duration-1000 ${
            ctaSection.isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
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
        <div className="container mx-auto px-4 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="bg-gradient-primary p-2 rounded-lg">
                  <Receipt className="w-5 h-5 text-primary-foreground" />
                </div>
                <span className="text-lg font-bold text-foreground">PAISABACK</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Smart reimbursements for modern Indian startups
              </p>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Product</h4>
              <ul className="space-y-2">
                <li>
                  <Link to="/auth" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Get Started
                  </Link>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Pricing
                  </a>
                </li>
              </ul>
            </div>

            {/* Company */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Company</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    About Us
                  </a>
                </li>
                <li>
                  <a href="https://api.whatsapp.com/send/?phone=919664316377&text=Hi%2C+I+wanted+to+enquire+about+PAISABACK&type=phone_number&app_absent=0" target="_blank" rel="noopener noreferrer" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Contact
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal & Social */}
            <div className="space-y-4">
              <h4 className="font-semibold text-foreground">Connect</h4>
              <ul className="space-y-2">
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                    Terms of Service
                  </a>
                </li>
              </ul>
              <div className="flex gap-4 pt-2">
                <a 
                  href="#" 
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors"
                  aria-label="LinkedIn"
                >
                  <Linkedin className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
                <a 
                  href="#" 
                  className="w-9 h-9 rounded-lg bg-muted hover:bg-primary/10 flex items-center justify-center transition-colors"
                  aria-label="Instagram"
                >
                  <Instagram className="w-4 h-4 text-muted-foreground hover:text-primary" />
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © 2025 PAISABACK. All rights reserved.
            </p>
            <p className="text-sm text-muted-foreground">
              Made with ❤️ by the PAISABACK Team
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
