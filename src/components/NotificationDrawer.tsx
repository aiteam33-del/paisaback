import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Notification } from '@/hooks/useNotifications';
import { formatDistanceToNow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCheck, 
  FileText, 
  CheckCircle, 
  XCircle, 
  UserPlus, 
  UserCheck, 
  UserX,
  Bell,
  Trash2
} from 'lucide-react';

interface NotificationDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  notifications: Notification[];
  unreadCount: number;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onDeleteNotification: (id: string) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'expense_submitted':
      return <FileText className="h-5 w-5 text-blue-500" />;
    case 'expense_approved':
      return <CheckCircle className="h-5 w-5 text-green-500" />;
    case 'expense_rejected':
      return <XCircle className="h-5 w-5 text-red-500" />;
    case 'join_request':
      return <UserPlus className="h-5 w-5 text-yellow-500" />;
    case 'join_approved':
      return <UserCheck className="h-5 w-5 text-green-500" />;
    case 'join_rejected':
      return <UserX className="h-5 w-5 text-red-500" />;
    default:
      return <FileText className="h-5 w-5" />;
  }
};

export const NotificationDrawer = ({
  open,
  onOpenChange,
  notifications,
  unreadCount,
  onMarkAsRead,
  onMarkAllAsRead,
  onDeleteNotification,
}: NotificationDrawerProps) => {
  const navigate = useNavigate();

  const handleNotificationClick = (notification: Notification) => {
    console.log('Notification clicked:', notification);
    
    // Mark as read first
    if (!notification.read) {
      onMarkAsRead(notification.id);
    }

    // Navigate based on notification type
    try {
      switch (notification.type) {
        case 'expense_submitted':
          // Admin viewing submitted expense
          console.log('Navigating to admin dashboard');
          navigate('/admin');
          break;
        case 'expense_approved':
        case 'expense_rejected':
          // Employee viewing their expense status
          console.log('Navigating to expense history');
          navigate('/employee/history');
          break;
        case 'join_request':
          // Admin viewing join request
          console.log('Navigating to admin dashboard for join request');
          navigate('/admin');
          break;
        case 'join_approved':
        case 'join_rejected':
          // Employee can stay on current page or go to dashboard
          console.log('Navigating to employee dashboard');
          navigate('/employee');
          break;
        default:
          console.log('Unknown notification type:', notification.type);
      }
    } catch (error) {
      console.error('Navigation error:', error);
    }

    // Close drawer after navigation
    onOpenChange(false);
  };

  const handleDeleteNotification = (e: React.MouseEvent, notificationId: string) => {
    e.stopPropagation(); // Prevent triggering the click handler
    onDeleteNotification(notificationId);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader className="space-y-4">
          <div className="flex items-center justify-between">
            <SheetTitle>Notifications</SheetTitle>
            {unreadCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onMarkAllAsRead}
                className="text-xs"
              >
                <CheckCheck className="h-4 w-4 mr-1" />
                Mark all read
              </Button>
            )}
          </div>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-8rem)] mt-4">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <p className="text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="space-y-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                    notification.read
                      ? 'bg-background hover:bg-accent/50'
                      : 'bg-accent/30 hover:bg-accent/50'
                  }`}
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm">{notification.title}</p>
                        <div className="flex items-center gap-2">
                          {!notification.read && (
                            <Badge variant="default" className="h-2 w-2 p-0 rounded-full" />
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                            onClick={(e) => handleDeleteNotification(e, notification.id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
};
