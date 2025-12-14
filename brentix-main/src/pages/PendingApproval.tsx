import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

export default function PendingApproval() {
  const { user, profile, signOut, isApproved, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !user) {
      navigate("/login", { replace: true });
    }
    if (!loading && isApproved) {
      navigate("/", { replace: true });
    }
  }, [user, isApproved, loading, navigate]);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login", { replace: true });
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="text-center max-w-md">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-warning/10 mx-auto mb-6">
          <Clock className="h-10 w-10 text-warning" />
        </div>
        <h1 className="text-2xl font-bold text-foreground mb-2">Awaiting Approval</h1>
        <p className="text-muted-foreground mb-6">
          Your account is pending approval from an administrator. 
          You'll receive access once your account has been reviewed.
        </p>
        
        <div className="bg-muted/30 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs text-muted-foreground mb-1">Registered email</p>
          <p className="text-sm text-foreground font-mono">{profile?.email || user?.email}</p>
        </div>

        <Button variant="outline" onClick={handleSignOut} className="gap-2">
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}
