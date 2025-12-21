import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import {
  Check, X, UserCheck, Users, Clock, XCircle, Search,
  Activity, TrendingUp, FileText, Zap, Database, RefreshCw,
  CheckCircle2, AlertTriangle, XOctagon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  status: string;
  created_at: string;
  approved_at: string | null;
  rejection_reason: string | null;
}

interface SystemStats {
  totalUsers: number;
  approvedUsers: number;
  pendingUsers: number;
  rejectedUsers: number;
  totalSignals: number;
  activeSignals: number;
  totalTrades: number;
  totalPaperTrades: number;
  priceDataPoints: number;
}

interface SystemHealth {
  database: "ok" | "warning" | "error";
  priceData: "ok" | "warning" | "error";
  lastPriceUpdate: string | null;
  priceDataAge: number | null; // minutes since last update
}

type FilterTab = "all" | "pending" | "approved" | "rejected";

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("pending");
  const [searchQuery, setSearchQuery] = useState("");
  const [rejectModal, setRejectModal] = useState<{ open: boolean; userId: string | null }>({
    open: false,
    userId: null,
  });
  const [rejectionReason, setRejectionReason] = useState("");
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      // Fetch all stats in parallel
      const [
        { count: totalSignals },
        { count: activeSignals },
        { count: totalTrades },
        { count: totalPaperTrades },
        { count: priceDataPoints },
        { data: latestPrice }
      ] = await Promise.all([
        supabase.from("signals").select("*", { count: "exact", head: true }),
        supabase.from("signals").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("trades").select("*", { count: "exact", head: true }),
        supabase.from("paper_trades").select("*", { count: "exact", head: true }),
        supabase.from("price_data").select("*", { count: "exact", head: true }),
        supabase.from("price_data").select("timestamp").order("timestamp", { ascending: false }).limit(1)
      ]);

      // Calculate health status
      let priceDataStatus: "ok" | "warning" | "error" = "ok";
      let priceDataAge: number | null = null;
      let lastPriceUpdate: string | null = null;

      if (latestPrice && latestPrice.length > 0) {
        lastPriceUpdate = latestPrice[0].timestamp;
        const lastUpdate = new Date(latestPrice[0].timestamp);
        priceDataAge = Math.floor((Date.now() - lastUpdate.getTime()) / 60000);

        if (priceDataAge > 10) priceDataStatus = "error";
        else if (priceDataAge > 5) priceDataStatus = "warning";
      } else {
        priceDataStatus = "error";
      }

      setStats({
        totalUsers: users.length,
        approvedUsers: users.filter(u => u.status === "approved").length,
        pendingUsers: users.filter(u => u.status === "pending").length,
        rejectedUsers: users.filter(u => u.status === "rejected").length,
        totalSignals: totalSignals ?? 0,
        activeSignals: activeSignals ?? 0,
        totalTrades: totalTrades ?? 0,
        totalPaperTrades: totalPaperTrades ?? 0,
        priceDataPoints: priceDataPoints ?? 0,
      });

      setHealth({
        database: "ok",
        priceData: priceDataStatus,
        lastPriceUpdate,
        priceDataAge,
      });
    } catch (error) {
      console.error("Error fetching stats:", error);
      setHealth({
        database: "error",
        priceData: "error",
        lastPriceUpdate: null,
        priceDataAge: null,
      });
    }
    setStatsLoading(false);
  }, [users]);

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
      return;
    }
    if (!loading && !isAdmin) {
      navigate("/", { replace: true });
      return;
    }
    if (!loading && isAdmin) {
      fetchUsers();
    }
  }, [user, isAdmin, loading, navigate]);

  useEffect(() => {
    if (users.length > 0) {
      fetchStats();
    }
  }, [users, fetchStats]);

  const fetchUsers = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setUsers(data as UserProfile[]);
    }
    setIsLoading(false);
  };

  const sendNotification = async (userId: string, action: "approved" | "rejected", reason?: string) => {
    try {
      const { error } = await supabase.functions.invoke("send-approval-notification", {
        body: { userId, action, rejectionReason: reason },
      });
      if (error) {
        toast({
          title: "Notifikation misslyckades",
          description: "Användaren uppdaterades men e-postnotifikation kunde inte skickas.",
          variant: "destructive",
        });
      }
    } catch {
      // Silently handle notification failures - user action already succeeded
    }
  };

  const handleApprove = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        status: "approved",
        approved_at: new Date().toISOString(),
        approved_by: user?.id,
        rejection_reason: null,
      })
      .eq("id", userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User Approved", description: "The user can now access the platform." });
      sendNotification(userId, "approved");
      fetchUsers();
    }
  };

  const handleReject = async () => {
    if (!rejectModal.userId) return;

    const { error } = await supabase
      .from("profiles")
      .update({
        status: "rejected",
        rejection_reason: rejectionReason || null,
      })
      .eq("id", rejectModal.userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User Rejected", description: "The user has been notified." });
      sendNotification(rejectModal.userId, "rejected", rejectionReason);
      fetchUsers();
    }
    setRejectModal({ open: false, userId: null });
    setRejectionReason("");
  };

  const handleRevoke = async (userId: string) => {
    const { error } = await supabase
      .from("profiles")
      .update({
        status: "pending",
        approved_at: null,
        approved_by: null,
      })
      .eq("id", userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Access Revoked", description: "The user's access has been revoked." });
      fetchUsers();
    }
  };

  const filteredUsers = users.filter((u) => {
    const matchesTab = activeTab === "all" || u.status === activeTab;
    const matchesSearch =
      !searchQuery ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesTab && matchesSearch;
  });

  const tabs: { key: FilterTab; label: string; icon: React.ReactNode }[] = [
    { key: "all", label: "All", icon: <Users className="h-4 w-4" /> },
    { key: "pending", label: "Pending", icon: <Clock className="h-4 w-4" /> },
    { key: "approved", label: "Approved", icon: <UserCheck className="h-4 w-4" /> },
    { key: "rejected", label: "Rejected", icon: <XCircle className="h-4 w-4" /> },
  ];

  const pendingCount = users.filter((u) => u.status === "pending").length;

  if (loading || isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const getHealthIcon = (status: "ok" | "warning" | "error") => {
    switch (status) {
      case "ok": return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "error": return <XOctagon className="h-4 w-4 text-red-500" />;
    }
  };

  const getHealthColor = (status: "ok" | "warning" | "error") => {
    switch (status) {
      case "ok": return "text-green-500 bg-green-500/10";
      case "warning": return "text-yellow-500 bg-yellow-500/10";
      case "error": return "text-red-500 bg-red-500/10";
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Adminpanel</h1>
            <p className="text-sm text-muted-foreground">
              Systemöversikt och användarhantering
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { fetchUsers(); fetchStats(); }}
            className="gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Uppdatera
          </Button>
        </div>

        {/* System Health */}
        {health && (
          <div className="glass-card rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Systemhälsa
              </h3>
              {health.lastPriceUpdate && (
                <span className="text-xs text-muted-foreground">
                  Senaste uppdatering: {new Date(health.lastPriceUpdate).toLocaleTimeString("sv-SE")}
                </span>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", getHealthColor(health.database))}>
                {getHealthIcon(health.database)}
                <div>
                  <p className="text-xs font-medium">Databas</p>
                  <p className="text-xs opacity-80">{health.database === "ok" ? "Ansluten" : "Problem"}</p>
                </div>
              </div>
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", getHealthColor(health.priceData))}>
                {getHealthIcon(health.priceData)}
                <div>
                  <p className="text-xs font-medium">Prisdata</p>
                  <p className="text-xs opacity-80">
                    {health.priceDataAge !== null
                      ? health.priceDataAge === 0 ? "Just nu" : `${health.priceDataAge} min sedan`
                      : "Ingen data"}
                  </p>
                </div>
              </div>
              <div className={cn("flex items-center gap-2 px-3 py-2 rounded-lg", pendingCount > 0 ? "text-yellow-500 bg-yellow-500/10" : "text-green-500 bg-green-500/10")}>
                {pendingCount > 0 ? <AlertTriangle className="h-4 w-4" /> : <CheckCircle2 className="h-4 w-4" />}
                <div>
                  <p className="text-xs font-medium">Väntande</p>
                  <p className="text-xs opacity-80">{pendingCount} användare</p>
                </div>
              </div>
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-primary bg-primary/10">
                <Zap className="h-4 w-4" />
                <div>
                  <p className="text-xs font-medium">Aktiva signaler</p>
                  <p className="text-xs opacity-80">{stats?.activeSignals ?? 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistics Grid */}
        {stats && !statsLoading && (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalUsers}</p>
                  <p className="text-xs text-muted-foreground">Totalt användare</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <UserCheck className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.approvedUsers}</p>
                  <p className="text-xs text-muted-foreground">Godkända</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalSignals}</p>
                  <p className="text-xs text-muted-foreground">Totalt signaler</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10">
                  <FileText className="h-5 w-5 text-purple-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalTrades + stats.totalPaperTrades}</p>
                  <p className="text-xs text-muted-foreground">Totalt trades</p>
                </div>
              </div>
            </div>
            <div className="glass-card rounded-xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-orange-500/10">
                  <Database className="h-5 w-5 text-orange-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.priceDataPoints.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Datapunkter</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* User Management Section */}
        <div className="glass-card rounded-xl p-6">
          <h2 className="text-lg font-semibold text-foreground mb-4">Användarhantering</h2>

        {/* Tabs */}
        <div className="flex items-center gap-6 border-b border-border">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                "flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 -mb-px",
                activeTab === tab.key
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.key === "pending" && pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-warning/20 text-warning rounded-full">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Users Table */}
        <div className="overflow-hidden rounded-lg border border-border/50">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  User
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Status
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Created
                </th>
                <th className="text-right text-xs font-medium text-muted-foreground px-4 py-3">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="text-center py-12 text-muted-foreground">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-foreground">
                          {u.full_name || "No name"}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {u.email}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                          u.status === "pending" && "bg-warning/10 text-warning",
                          u.status === "approved" && "bg-primary/10 text-primary",
                          u.status === "rejected" && "bg-destructive/10 text-destructive"
                        )}
                      >
                        {u.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-muted-foreground font-mono">
                        {new Date(u.created_at).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-2">
                        {u.status === "pending" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleApprove(u.id)}
                              className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                            >
                              <Check className="h-3 w-3" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRejectModal({ open: true, userId: u.id })}
                              className="h-7 text-xs gap-1 text-destructive border-destructive/30 hover:bg-destructive/10"
                            >
                              <X className="h-3 w-3" />
                              Reject
                            </Button>
                          </>
                        )}
                        {u.status === "approved" && u.id !== user?.id && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRevoke(u.id)}
                            className="h-7 text-xs gap-1 text-muted-foreground hover:text-destructive hover:border-destructive/30"
                          >
                            Revoke
                          </Button>
                        )}
                        {u.status === "rejected" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(u.id)}
                            className="h-7 text-xs gap-1 text-primary border-primary/30 hover:bg-primary/10"
                          >
                            <Check className="h-3 w-3" />
                            Approve
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        </div>

        {/* Reject Modal */}
        {rejectModal.open && (
          <div
            className="fixed inset-0 bg-background/90 flex items-center justify-center z-50"
            onClick={() => setRejectModal({ open: false, userId: null })}
          >
            <div
              className="bg-card border border-border w-full max-w-sm p-6 rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <h2 className="text-lg font-semibold text-foreground mb-4">Reject User</h2>
              <p className="text-sm text-muted-foreground mb-4">
                Optionally provide a reason for rejection:
              </p>
              <Input
                placeholder="Reason (optional)"
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="mb-4"
              />
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setRejectModal({ open: false, userId: null })}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  className="flex-1"
                >
                  Reject User
                </Button>
              </div>
            </div>
          </div>
        )}
    </div>
  );
}
