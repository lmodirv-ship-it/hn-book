import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import Index from "./pages/Index.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import NotFound from "./pages/NotFound.tsx";
import AdminLayout from "./admin/layouts/AdminLayout.tsx";
import AdminDashboard from "./admin/pages/Dashboard.tsx";
import AdminProducts from "./admin/pages/Products.tsx";
import AdminOrders from "./admin/pages/Orders.tsx";
import AdminCustomers from "./admin/pages/Customers.tsx";
import AdminEarnings from "./admin/pages/Earnings.tsx";
import AdminSettings from "./admin/pages/AdminSettings.tsx";
import AdminLogin from "./admin/pages/AdminLogin.tsx";
import RequireAdmin from "./admin/components/RequireAdmin.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            
            {/* Admin Login */}
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Protected Admin Panel */}
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="earnings" element={<AdminEarnings />} />
              <Route path="settings" element={<AdminSettings />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
