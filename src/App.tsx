import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Suspense } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ProtectedRoute from "./components/ProtectedRoute";
import { UserProvider } from "@/contexts/UserContext";
import { PageLoader } from "@/components/app/primitives";
import { lazyPage } from "@/lib/lazyPage";

// Pages load on demand so the first visit only downloads the shell and the page being opened.
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const Assets = lazyPage(() => import("./pages/Assets"));
const AssetDetail = lazyPage(() => import("./pages/AssetDetail"));
const AssetNew = lazyPage(() => import("./pages/AssetNew"));
const AssetImport = lazyPage(() => import("./pages/AssetImport"));
const People = lazyPage(() => import("./pages/People"));
const PersonProfile = lazyPage(() => import("./pages/PersonProfile"));
const Locations = lazyPage(() => import("./pages/Locations"));
const Maintenance = lazyPage(() => import("./pages/Maintenance"));
const Audits = lazyPage(() => import("./pages/Audits"));
const AuditRun = lazyPage(() => import("./pages/AuditRun"));
const SignHandover = lazyPage(() => import("./pages/SignHandover"));
const MyAssets = lazyPage(() => import("./pages/MyAssets"));
const Reports = lazyPage(() => import("./pages/Reports"));
const Notifications = lazyPage(() => import("./pages/Notifications"));
const Settings = lazyPage(() => import("./pages/Settings"));
const NotFound = lazyPage(() => import("./pages/NotFound"));
const PrintHandover = lazyPage(() => import("./pages/PrintHandover"));

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, refetchOnWindowFocus: false } },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="bottom-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <AppShell>
                    <Suspense fallback={<PageLoader />}>
                      <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/assets" element={<Assets />} />
                        <Route path="/assets/new" element={<AssetNew />} />
                        <Route path="/assets/import" element={<AssetImport />} />
                        <Route path="/assets/:id" element={<AssetDetail />} />
                        <Route path="/people" element={<People />} />
                        <Route path="/people/:id" element={<PersonProfile />} />
                        <Route path="/locations" element={<Locations />} />
                        <Route path="/maintenance" element={<Maintenance />} />
                        <Route path="/audits" element={<Audits />} />
                        <Route path="/audits/:id" element={<AuditRun />} />
                        <Route path="/sign/:id" element={<SignHandover />} />
                        <Route path="/me" element={<MyAssets />} />
                        <Route path="/reports" element={<Reports />} />
                        <Route path="/notifications" element={<Notifications />} />
                        <Route path="/settings" element={<Settings />} />
                        <Route path="/print-handover/:type/:id" element={<PrintHandover />} />
                        <Route path="*" element={<NotFound />} />
                      </Routes>
                    </Suspense>
                  </AppShell>
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
