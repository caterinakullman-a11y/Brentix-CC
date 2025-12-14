import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Users, Clock, ArrowRight } from "lucide-react";

export function AdminPendingWidget() {
  const { isAdmin } = useAuth();
  const [pendingCount, setPendingCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;

    const fetchPendingCount = async () => {
      const { count, error } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (!error && count !== null) {
        setPendingCount(count);
      }
      setIsLoading(false);
    };

    fetchPendingCount();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("profiles-pending")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "profiles" },
        () => {
          fetchPendingCount();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  if (!isAdmin || isLoading) return null;
  if (pendingCount === 0) return null;

  return (
    <Link
      to="/admin"
      className="glass-card rounded-xl p-4 flex items-center justify-between hover:bg-muted/50 transition-colors group"
    >
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
          <Users className="h-5 w-5 text-warning" />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {pendingCount} pending user{pendingCount !== 1 ? "s" : ""}
          </p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Awaiting approval
          </p>
        </div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}
