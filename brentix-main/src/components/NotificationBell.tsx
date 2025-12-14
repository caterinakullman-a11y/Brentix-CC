import { useState } from "react";
import { Bell, TrendingUp, TrendingDown, AlertCircle, CheckCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

function getNotificationIcon(type: Notification["type"], title: string) {
  if (title.includes("BUY")) {
    return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  }
  if (title.includes("SELL")) {
    return <TrendingDown className="h-4 w-4 text-red-500" />;
  }
  if (type === "trade") {
    return <CheckCircle className="h-4 w-4 text-emerald-500" />;
  }
  if (type === "alert" || type === "system") {
    return <AlertCircle className="h-4 w-4 text-amber-500" />;
  }
  return <Bell className="h-4 w-4 text-muted-foreground" />;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();

  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h4 className="font-semibold">Notifications</h4>
          {unreadCount > 0 && (
            <button
              onClick={() => markAllAsRead()}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              Mark all read
            </button>
          )}
        </div>
        
        <ScrollArea className="h-[300px]">
          {recentNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[200px] text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recentNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  notification={notification}
                  onRead={() => markAsRead(notification.id)}
                />
              ))}
            </div>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}

function NotificationItem({
  notification,
  onRead,
}: {
  notification: Notification;
  onRead: () => void;
}) {
  const timeAgo = formatDistanceToNow(new Date(notification.created_at), {
    addSuffix: true,
  });

  return (
    <button
      onClick={() => {
        if (!notification.read) {
          onRead();
        }
      }}
      className={cn(
        "w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-muted/50 transition-colors",
        !notification.read && "bg-muted/30"
      )}
    >
      <div className="mt-0.5">
        {getNotificationIcon(notification.type, notification.title)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className={cn("text-sm font-medium truncate", !notification.read && "text-foreground")}>
            {notification.title}
          </p>
          {!notification.read && (
            <span className="h-2 w-2 rounded-full bg-emerald-500 flex-shrink-0" />
          )}
        </div>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {notification.message}
        </p>
        <p className="text-[10px] text-muted-foreground/70 mt-1">
          {timeAgo}
        </p>
      </div>
    </button>
  );
}
