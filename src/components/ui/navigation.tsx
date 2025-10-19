import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";
import { Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/NotificationBell";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { useNotifications } from "@/hooks/useNotifications";
import { useState, useEffect } from "react";

export const Navigation = () => {
  const { user, signOut, userRole } = useAuth();
  const location = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead, deleteNotification } = useNotifications();
  const [notificationOpen, setNotificationOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  
  // Redirect admin users to /admin instead of employee dashboard
  const homeLink = user ? (userRole === 'admin' ? '/admin' : '/employee') : '/';
  
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);
  
  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      isScrolled 
        ? 'bg-card/95 backdrop-blur-lg border-b border-border shadow-lg' 
        : 'bg-transparent'
    }`}>
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <Link to={homeLink} className="flex items-center gap-2 group">
            <div className="bg-gradient-primary p-2 rounded-lg group-hover:shadow-md transition-all">
              <Wallet className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-foreground">PAISABACK</span>
          </Link>
          
          <div className="flex items-center gap-2 md:gap-4">
            {user ? (
              <>
                <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
                  <User className="w-4 h-4" />
                  <span>{user.email}</span>
                </div>
                <NotificationBell 
                  unreadCount={unreadCount} 
                  onClick={() => setNotificationOpen(true)} 
                />
                <ThemeToggle />
                <Button variant="ghost" onClick={signOut} className="gap-2">
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </>
            ) : location.pathname === "/" && (
              <>
                <ThemeToggle />
                <Link to="/auth">
                  <Button variant="ghost" className="hidden sm:inline-flex hover:scale-105 transition-transform">Sign In</Button>
                </Link>
                <a href="#get-started">
                  <Button variant="hero" className="shadow-md hover:shadow-xl hover:scale-105 transition-all">Get Started</Button>
                </a>
              </>
            )}
          </div>
        </div>
      </div>
      
      <NotificationDrawer
        open={notificationOpen}
        onOpenChange={setNotificationOpen}
        notifications={notifications}
        unreadCount={unreadCount}
        onMarkAsRead={markAsRead}
        onMarkAllAsRead={markAllAsRead}
        onDeleteNotification={deleteNotification}
      />
    </nav>
  );
};
