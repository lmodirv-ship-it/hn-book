import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import ChatBot from "@/components/ChatBot";
import Index from "./pages/Index.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import BookReader from "./pages/BookReader.tsx";
import NotFound from "./pages/NotFound.tsx";
import CustomerAuth from "./pages/CustomerAuth.tsx";
import Profile from "./pages/Profile.tsx";
import AdminLayout from "./admin/layouts/AdminLayout.tsx";
import AdminDashboard from "./admin/pages/Dashboard.tsx";
import AdminProducts from "./admin/pages/Products.tsx";
import AdminOrders from "./admin/pages/Orders.tsx";
import AdminCustomers from "./admin/pages/Customers.tsx";
import AdminEarnings from "./admin/pages/Earnings.tsx";
import AdminSettings from "./admin/pages/AdminSettings.tsx";
import AdminLogin from "./admin/pages/AdminLogin.tsx";
import RequireAdmin from "./admin/components/RequireAdmin.tsx";
import CouponsManagement from "./admin/pages/CouponsManagement.tsx";
import PageManagement from "./admin/pages/PageManagement.tsx";
import VisitorAnalytics from "./admin/pages/VisitorAnalytics.tsx";
import SystemHealthCheck from "./admin/pages/SystemHealthCheck.tsx";
import BookGeneration from "./admin/pages/BookGeneration.tsx";
import WebBookSearch from "./admin/pages/WebBookSearch.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <ChatBot />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product/:id" element={<ProductDetail />} />
            <Route path="/read/:id" element={<BookReader />} />
            <Route path="/auth" element={<CustomerAuth />} />
            <Route path="/profile" element={<Profile />} />
            
            {/* Admin Login */}
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Protected Admin Panel */}
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="book-generation" element={<BookGeneration />} />
              <Route path="web-search" element={<WebBookSearch />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="earnings" element={<AdminEarnings />} />
              <Route path="coupons" element={<CouponsManagement />} />
              <Route path="pages" element={<PageManagement />} />
              <Route path="analytics" element={<VisitorAnalytics />} />
              <Route path="health-check" element={<SystemHealthCheck />} />
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
