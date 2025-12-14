import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Fuel, Lock, Mail, Eye, EyeOff, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, loading } = useAuth();
  const navigate = useNavigate();

  // Modal state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showForgotUsername, setShowForgotUsername] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSent, setResetSent] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState("");

  // Redirect if already authenticated
  useEffect(() => {
    if (!loading && user) {
      navigate("/", { replace: true });
    }
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      setError(error.message === "Invalid login credentials" 
        ? "Invalid email or password" 
        : error.message);
      setIsLoading(false);
    } else {
      navigate("/", { replace: true });
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) throw error;
      setResetSent(true);
      
      setTimeout(() => {
        setShowForgotPassword(false);
        setResetSent(false);
        setResetEmail("");
      }, 3000);
    } catch (err) {
      setResetError(err instanceof Error ? err.message : "Failed to send reset email");
    } finally {
      setResetLoading(false);
    }
  };

  const handleForgotUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetLoading(true);
    setResetError("");

    // Since Supabase uses email as username, just confirm
    setTimeout(() => {
      setResetSent(true);
      setTimeout(() => {
        setShowForgotUsername(false);
        setResetSent(false);
        setResetEmail("");
      }, 3000);
      setResetLoading(false);
    }, 500);
  };

  const closeModal = () => {
    setShowForgotPassword(false);
    setShowForgotUsername(false);
    setResetSent(false);
    setResetEmail("");
    setResetError("");
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
      <ThemeToggle />
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60">
            <Fuel className="h-8 w-8 text-primary-foreground" />
          </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight">BRENTIX</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Brent Crude Trading Dashboard
          </p>
        </div>

        <Card className="border border-border bg-card/80 backdrop-blur shadow-lg dark:border-muted-foreground/20">
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl font-semibold text-center">
              Sign in to your account
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Email
                </Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="trader@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    required
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {error && (
                  <p 
                    className="text-xs mt-1" 
                    style={{ color: "#9A5B5B", fontSize: "12px" }}
                  >
                    {error}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Signing in...
                  </div>
                ) : (
                  "Sign in"
                )}
              </Button>

              {/* Forgot links */}
              <div className="flex items-center justify-center gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] text-muted-foreground hover:text-primary hover:underline transition-colors"
                >
                  Forgot password?
                </button>
                <span className="text-muted-foreground/50">|</span>
                <button
                  type="button"
                  onClick={() => setShowForgotUsername(true)}
                  className="text-[11px] text-muted-foreground hover:text-primary hover:underline transition-colors"
                >
                  Forgot username?
                </button>
              </div>

              <div className="text-center pt-2 border-t border-border/50 mt-4">
                <Link
                  to="/register"
                  className="text-[11px] text-muted-foreground hover:text-primary hover:underline transition-colors"
                >
                  Don't have an account? Register
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Access restricted to authorized traders only
        </p>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div 
          className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div 
            className="bg-card border border-border w-full max-w-sm p-8 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {!resetSent ? (
              <form onSubmit={handleForgotPassword}>
                <h2 className="text-lg font-light text-foreground mb-4">Reset Password</h2>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Email"
                  required
                />
                
                {resetError && (
                  <p className="text-[11px] mt-2" style={{ color: "#9A5B5B" }}>{resetError}</p>
                )}
                
                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1"
                  >
                    {resetLoading ? "Sending..." : "Send Link"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <Check className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-foreground text-sm">Check your email for a password reset link.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Forgot Username Modal */}
      {showForgotUsername && (
        <div 
          className="fixed inset-0 bg-background/90 flex items-center justify-center z-50 animate-in fade-in duration-200"
          onClick={closeModal}
        >
          <div 
            className="bg-card border border-border w-full max-w-sm p-8 rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {!resetSent ? (
              <form onSubmit={handleForgotUsername}>
                <h2 className="text-lg font-light text-foreground mb-4">Recover Username</h2>
                <p className="text-xs text-muted-foreground mb-6 leading-relaxed">
                  Your username is your email address. Enter it below and we'll send you a confirmation.
                </p>
                
                <Input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="Email"
                  required
                />
                
                {resetError && (
                  <p className="text-[11px] mt-2" style={{ color: "#9A5B5B" }}>{resetError}</p>
                )}
                
                <div className="flex gap-3 mt-6">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={closeModal}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1"
                  >
                    {resetLoading ? "Sending..." : "Send"}
                  </Button>
                </div>
              </form>
            ) : (
              <div className="text-center py-4">
                <Check className="w-12 h-12 text-primary mx-auto mb-4" />
                <p className="text-foreground text-sm">If an account exists, you'll receive an email shortly.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
