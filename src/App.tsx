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
import { RequirePage } from "./components/RequirePage";
import { UserProvider } from "@/contexts/UserContext";
import { PageLoader } from "@/components/app/primitives";
import { lazyPage } from "@/lib/lazyPage";

// Pages load on demand so the first visit only downloads the shell and the page being opened.
const Dashboard = lazyPage(() => import("./pages/Dashboard"));
const Assets = lazyPage(() => import("./pages/Assets"));
const AssetDetail = lazyPage(() => import("./pages/AssetDetail"));
const AssetNew = lazyPage(() => import("./pages/AssetNew"));
const AssetImport = lazyPage(() => import("./pages/AssetImport"));
const ReceiveDelivery = lazyPage(() => import("./pages/ReceiveDelivery"));
const Purchases = lazyPage(() => import("./pages/Purchases"));
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
                        <Route path="/" element={<RequirePage perm="dashboard.view" redirectTo="/me"><Dashboard /></RequirePage>} />
                        <Route path="/assets" element={<RequirePage perm="assets.view"><Assets /></RequirePage>} />
                        <Route path="/assets/new" element={<RequirePage perm="assets.view"><AssetNew /></RequirePage>} />
                        <Route path="/assets/import" element={<RequirePage perm="assets.view"><AssetImport /></RequirePage>} />
                        <Route path="/assets/receive" element={<RequirePage perm="assets.view"><ReceiveDelivery /></RequirePage>} />
                        <Route path="/purchases" element={<RequirePage perm="assets.view"><Purchases /></RequirePage>} />
                        {/* Asset pages check access themselves: staff with Assets, or the employee holding it. */}
                        <Route path="/assets/:id" element={<AssetDetail />} />
                        <Route path="/people" element={<RequirePage perm="people.view"><People /></RequirePage>} />
                        <Route path="/people/:id" element={<RequirePage perm="people.view"><PersonProfile /></RequirePage>} />
                        <Route path="/locations" element={<RequirePage perm="locations.view"><Locations /></RequirePage>} />
                        <Route path="/maintenance" element={<RequirePage perm="maintenance.view"><Maintenance /></RequirePage>} />
                        <Route path="/audits" element={<RequirePage perm="audits.view"><Audits /></RequirePage>} />
                        <Route path="/audits/:id" element={<RequirePage perm="audits.view"><AuditRun /></RequirePage>} />
                        <Route path="/sign/:id" element={<SignHandover />} />
                        <Route path="/me" element={<MyAssets />} />
                        <Route path="/reports" element={<RequirePage perm="reports.view"><Reports /></RequirePage>} />
                        <Route path="/notifications" element={<RequirePage perm="dashboard.view"><Notifications /></RequirePage>} />
                        <Route path="/settings" element={<RequirePage perm="settings.view"><Settings /></RequirePage>} />
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
