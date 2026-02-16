import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import NewLayout from "./components/layout/NewLayout";
import Dashboard from "./pages/Dashboard";
import Assets from "./pages/Assets";
import People from "./pages/People";
import Locations from "./pages/Locations";
import Reports from "./pages/Reports";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import PrintHandover from "./pages/PrintHandover";
import Auth from "./pages/Auth";
import { UserProvider } from "@/contexts/UserContext";

const queryClient = new QueryClient();

const App = () => (
  // Main App Component with Auth Provider
  <QueryClientProvider client={queryClient}>
    <UserProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Auth />} />
            <Route
              path="/*"
              element={
                <NewLayout>
                  <Routes>
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/assets" element={<Assets />} />
                    <Route path="/people" element={<People />} />
                    <Route path="/locations" element={<Locations />} />
                    <Route path="/reports" element={<Reports />} />
                    <Route path="/settings" element={<Settings />} />
                    <Route path="/print-handover/:type/:id" element={<PrintHandover />} />
                    <Route path="*" element={<NotFound />} />
                  </Routes>
                </NewLayout>
              }
            />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </UserProvider>
  </QueryClientProvider>
);

export default App;
