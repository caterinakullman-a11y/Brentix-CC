import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { HelpChat } from "@/components/help";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

// Page loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="space-y-4 w-full max-w-md p-8">
      <Skeleton className="h-8 w-3/4" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
      <Skeleton className="h-32 w-full" />
    </div>
  </div>
);

// Wrapper to conditionally show HelpChat only for logged-in users
const AuthenticatedHelpChat = () => {
  const { user } = useAuth();
  return user ? <HelpChat /> : null;
};

// Lazy load pages for code splitting
const Index = lazy(() => import("./pages/Index"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const PendingApproval = lazy(() => import("./pages/PendingApproval"));
const Admin = lazy(() => import("./pages/Admin"));
const Signals = lazy(() => import("./pages/Signals"));
const Trades = lazy(() => import("./pages/Trades"));
const History = lazy(() => import("./pages/History"));
const HistoricalData = lazy(() => import("./pages/HistoricalData"));
const Analysis = lazy(() => import("./pages/Analysis"));
const Performance = lazy(() => import("./pages/Performance"));
const Reports = lazy(() => import("./pages/Reports"));
const Settings = lazy(() => import("./pages/Settings"));
const Rules = lazy(() => import("./pages/Rules"));
const Pairs = lazy(() => import("./pages/Pairs"));
const Safety = lazy(() => import("./pages/Safety"));
const PaperHistory = lazy(() => import("./pages/PaperHistory"));
const PriceHistory = lazy(() => import("./pages/PriceHistory"));
const BacktestHistory = lazy(() => import("./pages/BacktestHistory"));
const NotFound = lazy(() => import("./pages/NotFound"));

// Prisanalys pages (lazy loaded)
const PrisanalysDashboard = lazy(() => import("./pages/prisanalys/Dashboard"));
const PrisanalysHistorik = lazy(() => import("./pages/prisanalys/Historik"));
const PrisanalysStatistik = lazy(() => import("./pages/prisanalys/Statistik"));
const PrisanalysRegler = lazy(() => import("./pages/prisanalys/Regler"));
const PrisanalysBacktest = lazy(() => import("./pages/prisanalys/Backtest"));
const PrisanalysAI = lazy(() => import("./pages/prisanalys/AI"));

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
        <TooltipProvider>
          <NetworkStatusBanner />
          <Toaster />
          <Sonner />
        <BrowserRouter>
        <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/pending" element={<PendingApproval />} />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireAdmin>
                <Admin />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Index />
              </ProtectedRoute>
            }
          />
          <Route
            path="/signals"
            element={
              <ProtectedRoute>
                <Signals />
              </ProtectedRoute>
            }
          />
          <Route
            path="/trades"
            element={
              <ProtectedRoute>
                <Trades />
              </ProtectedRoute>
            }
          />
          <Route
            path="/analysis"
            element={
              <ProtectedRoute>
                <Analysis />
              </ProtectedRoute>
            }
          />
          <Route
            path="/history"
            element={
              <ProtectedRoute>
                <History />
              </ProtectedRoute>
            }
          />
          <Route
            path="/historical-data"
            element={
              <ProtectedRoute>
                <HistoricalData />
              </ProtectedRoute>
            }
          />
          <Route
            path="/performance"
            element={
              <ProtectedRoute>
                <Performance />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/rules"
            element={
              <ProtectedRoute>
                <Rules />
              </ProtectedRoute>
            }
          />
          <Route
            path="/pairs"
            element={
              <ProtectedRoute>
                <Pairs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/safety"
            element={
              <ProtectedRoute>
                <Safety />
              </ProtectedRoute>
            }
          />
          <Route
            path="/paper-history"
            element={
              <ProtectedRoute>
                <PaperHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/price-history"
            element={
              <ProtectedRoute>
                <PriceHistory />
              </ProtectedRoute>
            }
          />
          <Route
            path="/backtest-history"
            element={
              <ProtectedRoute>
                <BacktestHistory />
              </ProtectedRoute>
            }
          />
          {/* Prisanalys Routes */}
          <Route
            path="/prisanalys"
            element={
              <ProtectedRoute>
                <PrisanalysDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prisanalys/historik"
            element={
              <ProtectedRoute>
                <PrisanalysHistorik />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prisanalys/statistik"
            element={
              <ProtectedRoute>
                <PrisanalysStatistik />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prisanalys/regler"
            element={
              <ProtectedRoute>
                <PrisanalysRegler />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prisanalys/backtest"
            element={
              <ProtectedRoute>
                <PrisanalysBacktest />
              </ProtectedRoute>
            }
          />
          <Route
            path="/prisanalys/ai"
            element={
              <ProtectedRoute>
                <PrisanalysAI />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
        </Suspense>
        </BrowserRouter>
        <AuthenticatedHelpChat />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
