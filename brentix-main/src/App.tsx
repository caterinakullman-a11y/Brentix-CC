import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { HelmetProvider } from "react-helmet-async";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AuthenticatedLayout } from "@/components/layout/AuthenticatedLayout";
import ErrorBoundary from "@/components/ErrorBoundary";
import { NetworkStatusBanner } from "@/components/NetworkStatusBanner";
import { HelpChat } from "@/components/help";
import { useAuth } from "@/hooks/useAuth";
import { Skeleton } from "@/components/ui/skeleton";

// Page loading fallback for non-authenticated pages
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
        <Routes>
          {/* Public routes - no layout */}
          <Route path="/login" element={<Suspense fallback={<PageLoader />}><Login /></Suspense>} />
          <Route path="/register" element={<Suspense fallback={<PageLoader />}><Register /></Suspense>} />
          <Route path="/reset-password" element={<Suspense fallback={<PageLoader />}><ResetPassword /></Suspense>} />
          <Route path="/pending" element={<Suspense fallback={<PageLoader />}><PendingApproval /></Suspense>} />

          {/* Protected routes with persistent layout */}
          <Route element={<ProtectedRoute><AuthenticatedLayout /></ProtectedRoute>}>
            <Route path="/" element={<Index />} />
            <Route path="/signals" element={<Signals />} />
            <Route path="/trades" element={<Trades />} />
            <Route path="/analysis" element={<Analysis />} />
            <Route path="/history" element={<History />} />
            <Route path="/historical-data" element={<HistoricalData />} />
            <Route path="/performance" element={<Performance />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/rules" element={<Rules />} />
            <Route path="/pairs" element={<Pairs />} />
            <Route path="/safety" element={<Safety />} />
            <Route path="/paper-history" element={<PaperHistory />} />
            <Route path="/backtest-history" element={<BacktestHistory />} />

            {/* Prisanalys Routes */}
            <Route path="/prisanalys" element={<PrisanalysDashboard />} />
            <Route path="/prisanalys/historik" element={<PrisanalysHistorik />} />
            <Route path="/prisanalys/statistik" element={<PrisanalysStatistik />} />
            <Route path="/prisanalys/regler" element={<PrisanalysRegler />} />
            <Route path="/prisanalys/backtest" element={<PrisanalysBacktest />} />
            <Route path="/prisanalys/ai" element={<PrisanalysAI />} />
          </Route>

          {/* Admin route with persistent layout */}
          <Route element={<ProtectedRoute requireAdmin><AuthenticatedLayout /></ProtectedRoute>}>
            <Route path="/admin" element={<Admin />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Suspense fallback={<PageLoader />}><NotFound /></Suspense>} />
        </Routes>
        </BrowserRouter>
        <AuthenticatedHelpChat />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
    </HelmetProvider>
  </ErrorBoundary>
);

export default App;
