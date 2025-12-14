import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Check, X, UserCheck, Users, Clock, XCircle, Search } from "lucide-react";
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
      await supabase.functions.invoke("send-approval-notification", {
        body: { userId, action, rejectionReason: reason },
      });
      console.log(`Notification sent for ${action}`);
    } catch (err) {
      console.error("Failed to send notification:", err);
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
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">User Management</h1>
            <p className="text-sm text-muted-foreground">
              Manage user access and permissions
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-warning/10 text-warning text-sm">
              <Clock className="h-4 w-4" />
              {pendingCount} pending
            </div>
          )}
        </div>

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
        <div className="glass-card rounded-xl overflow-hidden">
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
    </MainLayout>
  );
}
