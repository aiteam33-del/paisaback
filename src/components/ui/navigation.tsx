import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User, Menu, X, ChevronRight, Sparkles } from "lucide-react";
import { Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/NotificationBell";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { useNotifications } from "@/hooks/useNotifications";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export const Navigation = () => {
  const { user, signOut, userRole } = useAuth();
  const location = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const homeLink = user ? (userRole === 'admin' ? '/admin' : '/employee') : '/';

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = user ? [
    ...(userRole === 'admin' ? [
      { href: '/admin', label: 'Dashboard' },
      { href: '/admin/expenses', label: 'Expenses' },
      { href: '/admin/employees', label: 'Team' },
      { href: '/admin/analytics', label: 'Analytics' },
    ] : [
      { href: '/employee', label: 'Submit' },
      { href: '/employee/history', label: 'History' },
      { href: '/employee/analytics', label: 'Analytics' },
    ]),
  ] : [];

  return (
    <>
      <nav className={cn(
        "fixed top-0 w-full z-50 transition-all duration-300",
        isScrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm"
          : "bg-transparent"
      )}>
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 md:h-18">
            {/* Logo */}
            <Link to={homeLink} className="flex items-center gap-3 group">
              <div className="relative">
                <div className="absolute inset-0 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity bg-gradient-to-r from-primary to-secondary" />
                <div className="relative p-2.5 rounded-xl shadow-lg group-hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-primary to-primary/80">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-lg font-bold tracking-tight">PAISABACK</span>
                {user && (
                  <span className="text-[10px] text-muted-foreground uppercase tracking-wider -mt-0.5">
                    {userRole === 'admin' ? 'Admin Portal' : 'Employee Portal'}
                  </span>
                )}
              </div>
            </Link>

            {/* Desktop Navigation */}
            {user && navLinks.length > 0 && (
              <div className="hidden md:flex items-center gap-1 bg-muted/50 rounded-full p-1 border border-border/50">
                {navLinks.map((link) => {
                  const isActive = location.pathname === link.href ||
                    (link.href !== '/admin' && link.href !== '/employee' && location.pathname.startsWith(link.href));
                  return (
                    <Link
                      key={link.href}
                      to={link.href}
                      className={cn(
                        "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                        isActive
                          ? "bg-background text-foreground shadow-sm"
                          : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                      )}
                      data-tour={
                        link.href.includes('history') ? 'nav-history' :
                        link.href.includes('analytics') ? 'nav-analytics' :
                        link.href.includes('employees') ? 'nav-team' :
                        undefined
                      }
                    >
                      {link.label}
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Right Section */}
            <div className="flex items-center gap-2 md:gap-3">
              {user ? (
                <>
                  {/* User Badge - Desktop */}
                  <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted/50 border border-border/50">
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-primary" />
                    </div>
                    <span className="text-sm text-muted-foreground max-w-[120px] truncate">
                      {user.email?.split('@')[0]}
                    </span>
                  </div>

                  <NotificationBell
                    unreadCount={unreadCount}
                    onClick={() => setNotificationOpen(true)}
                  />
                  <ThemeToggle />

                  {/* Logout Button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={signOut}
                    className="hidden md:flex items-center gap-2 text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="hidden lg:inline">Logout</span>
                  </Button>

                  {/* Mobile Menu Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="md:hidden"
                    onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  >
                    {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                  </Button>
                </>
              ) : location.pathname === "/" && (
                <>
                  <ThemeToggle />
                  <Link to="/auth" className="hidden sm:block">
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
                      Sign In
                    </Button>
                  </Link>
                  <Link to="/auth">
                    <Button
                      size="sm"
                      className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all duration-300 gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Get Started</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {user && mobileMenuOpen && (
          <div className="md:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <div className="container mx-auto px-4 py-4 space-y-2">
              {navLinks.map((link) => {
                const isActive = location.pathname === link.href ||
                  (link.href !== '/admin' && link.href !== '/employee' && location.pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.href}
                    to={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                    )}
                  >
                    <span className="font-medium">{link.label}</span>
                    <ChevronRight className="w-4 h-4" />
                  </Link>
                );
              })}

              <div className="pt-4 mt-4 border-t border-border/50">
                <div className="flex items-center gap-3 px-4 py-2 mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <span className="text-sm text-muted-foreground truncate flex-1">
                    {user.email}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  onClick={() => { signOut(); setMobileMenuOpen(false); }}
                  className="w-full justify-start gap-2 text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </Button>
              </div>
            </div>
          </div>
        )}
      </nav>

      <NotificationDrawer
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDeleteNotification={deleteNotification}
      />
    </>
  );
};
