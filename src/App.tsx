import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { CartProvider } from "@/contexts/CartContext";
import ChatBot from "@/components/ChatBot";
import Index from "./pages/Index.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import BookReader from "./pages/BookReader.tsx";
import BooksPage from "./pages/BooksPage.tsx";
import CartPage from "./pages/CartPage.tsx";
import CheckoutPage from "./pages/CheckoutPage.tsx";
import OrderConfirmation from "./pages/OrderConfirmation.tsx";
import NotFound from "./pages/NotFound.tsx";
import CustomerAuth from "./pages/CustomerAuth.tsx";
import Profile from "./pages/Profile.tsx";
import MyOrders from "./pages/MyOrders.tsx";
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
import BulkPdfUpload from "./admin/pages/BulkPdfUpload.tsx";
import DocumentProcessing from "./pages/DocumentProcessing.tsx";
import DocumentProcessor from "./admin/pages/DocumentProcessor.tsx";
import CategoryManagement from "./admin/pages/CategoryManagement.tsx";
import PricingManagement from "./admin/pages/PricingManagement.tsx";
import DatabaseManager from "./admin/pages/DatabaseManager.tsx";
import SalesManagement from "./admin/pages/SalesManagement.tsx";
import RecommendationsManagement from "./admin/pages/RecommendationsManagement.tsx";
import PrintOrdersAdmin from "./admin/pages/PrintOrdersAdmin.tsx";
import CardTemplatesAdmin from "./admin/pages/CardTemplatesAdmin.tsx";
import LogosAdmin from "./admin/pages/LogosAdmin.tsx";
import CarteVisite from "./pages/CarteVisite.tsx";
import TablouPage from "./pages/TablouPage.tsx";
import TablouDetail from "./pages/TablouDetail.tsx";
import TablouAdmin from "./admin/pages/TablouAdmin.tsx";
import AIClassifier from "./admin/pages/AIClassifier.tsx";
import FeatureManager from "./admin/pages/FeatureManager.tsx";
import SystemMonitoring from "./admin/pages/SystemMonitoring.tsx";
import ApiIntegrationsAdmin from "./admin/pages/ApiIntegrationsAdmin.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <I18nProvider>
      <CartProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ChatBot />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="/product/:id" element={<ProductRedirect />} />
            <Route path="/book/:id" element={<ProductDetail />} />
            <Route path="/carte-visite" element={<CarteVisite />} />
            <Route path="/tablou" element={<TablouPage />} />
            <Route path="/tablou/:id" element={<TablouDetail />} />
            <Route path="/read/:id" element={<BookReader />} />
            <Route path="/document-processing" element={<DocumentProcessing />} />
            <Route path="/auth" element={<CustomerAuth />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-orders" element={<MyOrders />} />
            
            {/* Admin Login */}
            <Route path="/admin/login" element={<AdminLogin />} />
            
            {/* Protected Admin Panel */}
            <Route path="/admin" element={<RequireAdmin><AdminLayout /></RequireAdmin>}>
              <Route index element={<AdminDashboard />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="categories" element={<CategoryManagement />} />
              <Route path="book-generation" element={<BookGeneration />} />
              <Route path="web-search" element={<WebBookSearch />} />
              <Route path="bulk-pdf" element={<BulkPdfUpload />} />
              <Route path="doc-processor" element={<DocumentProcessor />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="customers" element={<AdminCustomers />} />
              <Route path="earnings" element={<AdminEarnings />} />
              <Route path="coupons" element={<CouponsManagement />} />
              <Route path="pages" element={<PageManagement />} />
              <Route path="analytics" element={<VisitorAnalytics />} />
              <Route path="health-check" element={<SystemHealthCheck />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="pricing" element={<PricingManagement />} />
              <Route path="database" element={<DatabaseManager />} />
              <Route path="sales" element={<SalesManagement />} />
              <Route path="recommendations" element={<RecommendationsManagement />} />
              <Route path="print-orders" element={<PrintOrdersAdmin />} />
              <Route path="card-templates" element={<CardTemplatesAdmin />} />
              <Route path="logos" element={<LogosAdmin />} />
              <Route path="tablou" element={<TablouAdmin />} />
              <Route path="ai-classifier" element={<AIClassifier />} />
              <Route path="features" element={<FeatureManager />} />
              <Route path="monitoring" element={<SystemMonitoring />} />
              <Route path="api-integrations" element={<ApiIntegrationsAdmin />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
      </CartProvider>
    </I18nProvider>
  </QueryClientProvider>
);

export default App;
