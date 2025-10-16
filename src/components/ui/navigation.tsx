import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { LogOut, User } from "lucide-react";
import { Wallet } from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { NotificationBell } from "@/components/NotificationBell";
import { NotificationDrawer } from "@/components/NotificationDrawer";
import { useNotifications } from "@/hooks/useNotifications";
import { useState } from "react";

export const Navigation = () => {
  const { user, signOut, userRole } = useAuth();
  const location = useLocation();
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [notificationOpen, setNotificationOpen] = useState(false);
  
  // Redirect admin users to /admin instead of employee dashboard
  const homeLink = user ? (userRole === 'admin' ? '/admin' : '/employee') : '/';
  
  return (
    <nav className="fixed top-0 w-full bg-card/80 backdrop-blur-lg border-b border-border z-50 shadow-sm">
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
                  <Button variant="ghost" className="hidden sm:inline-flex">Sign In</Button>
                </Link>
                <Link to="/auth">
                  <Button variant="hero" className="shadow-md hover:shadow-lg">Get Started</Button>
                </Link>
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
      />
    </nav>
  );
};
