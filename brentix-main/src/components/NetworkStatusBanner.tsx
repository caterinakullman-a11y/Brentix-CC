import { useNetworkStatus } from "@/hooks/useNetworkStatus";
import { Wifi, WifiOff, Check } from "lucide-react";
import { cn } from "@/lib/utils";

export function NetworkStatusBanner() {
  const { isOnline, wasOffline } = useNetworkStatus();

  if (isOnline && !wasOffline) {
    return null;
  }

  return (
    <div
      className={cn(
        "fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-all duration-300",
        isOnline
          ? "bg-emerald-600 text-white"
          : "bg-amber-600 text-white"
      )}
    >
      <div className="flex items-center justify-center gap-2">
        {isOnline ? (
          <>
            <Check className="h-4 w-4" />
            <span>Connection restored</span>
          </>
        ) : (
          <>
            <WifiOff className="h-4 w-4" />
            <span>You're offline. Some features may be unavailable.</span>
          </>
        )}
      </div>
    </div>
  );
}
