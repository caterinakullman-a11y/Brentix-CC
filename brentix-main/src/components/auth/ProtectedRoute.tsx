import { Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Clock, XCircle } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireApproval?: boolean;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ 
  children, 
  requireApproval = true,
  requireAdmin = false 
}: ProtectedRouteProps) {
  const { user, loading, profile, isApproved, isPending, isRejected, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Show pending state
  if (requireApproval && isPending) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-warning/10 mx-auto mb-6">
            <Clock className="h-8 w-8 text-warning" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Awaiting Approval</h1>
          <p className="text-muted-foreground mb-6">
            Your account is pending approval from an administrator. 
            You'll be notified once your account has been reviewed.
          </p>
          <p className="text-xs text-muted-foreground">
            Registered: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : "N/A"}
          </p>
        </div>
      </div>
    );
  }

  // Show rejected state
  if (requireApproval && isRejected) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mx-auto mb-6">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            Your account application has been rejected.
          </p>
          {profile?.rejection_reason && (
            <p className="text-sm text-muted-foreground bg-muted/50 p-4 rounded-lg mb-6">
              "{profile.rejection_reason}"
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Please contact support if you believe this is an error.
          </p>
        </div>
      </div>
    );
  }

  // Check admin requirement
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
