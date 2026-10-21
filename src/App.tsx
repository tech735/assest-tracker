import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AppShell from "./components/layout/AppShell";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import AssetDetail from "./pages/AssetDetail";
import AssetNew from "./pages/AssetNew";
import AssetImport from "./pages/AssetImport";
import People from "./pages/People";
import PersonProfile from "./pages/PersonProfile";
import Locations from "./pages/Locations";
import Maintenance from "./pages/Maintenance";
import Audits from "./pages/Audits";
import Reports from "./pages/Reports";
import Notifications from "./pages/Notifications";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PrintHandover from "./pages/PrintHandover";
import Auth from "./pages/Auth";
import AuthCallback from "./pages/AuthCallback";
import ProtectedRoute from "./components/ProtectedRoute";
import { UserProvider } from "@/contexts/UserContext";

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
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/notifications" element={<Notifications />} />
                      <Route path="/settings" element={<Settings />} />
                      <Route path="/print-handover/:type/:id" element={<PrintHandover />} />
                      <Route path="*" element={<NotFound />} />
                    </Routes>
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
