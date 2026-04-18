import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate, useParams } from "react-router-dom";
import { Suspense, lazy, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { I18nProvider } from "@/lib/i18n";
import { CartProvider } from "@/contexts/CartContext";
import { ContentProvider } from "@/contexts/ContentContext";
import ChatBot from "@/components/ChatBot";
import { InstallPrompt } from "@/components/InstallPrompt";
import Index from "./pages/Index.tsx";
import Landing from "./pages/Landing.tsx";
import ProductDetail from "./pages/ProductDetail.tsx";
import CategoryPage from "./pages/CategoryPage.tsx";
import BookReader from "./pages/BookReader.tsx";
import BooksPage from "./pages/BooksPage.tsx";
import CartPage from "./pages/CartPage.tsx";
import CheckoutPage from "./pages/CheckoutPage.tsx";
import OrderConfirmation from "./pages/OrderConfirmation.tsx";
import NotFound from "./pages/NotFound.tsx";
import CustomerAuth from "./pages/CustomerAuth.tsx";
import ForgotPassword from "./pages/ForgotPassword.tsx";
import ResetPassword from "./pages/ResetPassword.tsx";
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
import PrintPricingManagement from "./admin/pages/PrintPricingManagement.tsx";
import DatabaseManager from "./admin/pages/DatabaseManager.tsx";
import SchemaManager from "./admin/pages/SchemaManager.tsx";
import DatabaseMigrationManager from "./admin/pages/DatabaseMigrationManager.tsx";
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
import ApiSettings from "./admin/pages/ApiSettings.tsx";
import AssetsManager from "./admin/pages/AssetsManager.tsx";
import SmartImportPage from "./admin/pages/SmartImportPage.tsx";
import SvgTemplatesAdmin from "./admin/pages/SvgTemplatesAdmin.tsx";
import UsersAdmin from "./admin/pages/UsersAdmin.tsx";
import PermissionsAdmin from "./admin/pages/PermissionsAdmin.tsx";
import CmsAdmin from "./admin/pages/CmsAdmin.tsx";
import UserPermissionsAdmin from "./admin/pages/UserPermissionsAdmin.tsx";
import TrackOrder from "./pages/TrackOrder.tsx";
import TemplatesGallery from "./pages/TemplatesGallery.tsx";
import StudioHome from "./pages/studio/StudioHome.tsx";
import StudioTemplates from "./pages/studio/StudioTemplates.tsx";
import StudioEditor from "./pages/studio/StudioEditor.tsx";
import StudioAdmin from "./admin/pages/StudioAdmin.tsx";
import QueueManager from "./admin/pages/QueueManager.tsx";
import AutoHealCenter from "./admin/pages/AutoHealCenter.tsx";
import SubscriptionsAdmin from "./admin/pages/SubscriptionsAdmin.tsx";
import BillingPage from "./pages/BillingPage.tsx";
import DeployMonitor from "./admin/pages/DeployMonitor.tsx";
import { useAutoDeploy } from "@/hooks/useAutoDeploy";

// Lazy-load the heavy editor and viewer so non-editable assets never pull
// the full editor bundle (and vice versa).
const TemplateEditor = lazy(() => import("./pages/TemplateEditor.tsx"));
const AssetViewer = lazy(() => import("./pages/AssetViewer.tsx"));

const PageFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const queryClient = new QueryClient();

const ProductRedirect = () => {
  const { id } = useParams();
  return <Navigate to={`/book/${id}`} replace />;
};

const AppShell = ({ children }: { children: ReactNode }) => {
  useAutoDeploy();
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ContentProvider>
      <I18nProvider>
        <CartProvider>
          <TooltipProvider>
            <AppShell>
            <Toaster />
            <Sonner />
            <ChatBot />
            <InstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/home" element={<Index />} />
            <Route path="/books" element={<BooksPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/order-confirmation/:id" element={<OrderConfirmation />} />
            <Route path="/track-order" element={<TrackOrder />} />
            <Route path="/category/:category" element={<CategoryPage />} />
            <Route path="/product/:id" element={<ProductRedirect />} />
            <Route path="/book/:id" element={<ProductDetail />} />
            <Route path="/carte-visite" element={<CarteVisite />} />
            <Route path="/tablou" element={<TablouPage />} />
            <Route path="/tablou/:id" element={<TablouDetail />} />
            <Route path="/read/:id" element={<BookReader />} />
            <Route path="/document-processing" element={<DocumentProcessing />} />
            <Route path="/templates" element={<TemplatesGallery />} />
            {/* Studio (same domain, shared auth/db/admin) */}
            <Route path="/studio" element={<StudioHome />} />
            <Route path="/studio/templates" element={<StudioTemplates />} />
            <Route path="/studio/editor/:slug" element={<StudioEditor />} />
            <Route
              path="/editor/:slug"
              element={<Suspense fallback={<PageFallback />}><TemplateEditor /></Suspense>}
            />
            <Route
              path="/viewer/:id"
              element={<Suspense fallback={<PageFallback />}><AssetViewer /></Suspense>}
            />
            <Route path="/auth" element={<CustomerAuth />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/my-orders" element={<MyOrders />} />
            <Route path="/billing" element={<BillingPage />} />
            
            
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
              <Route path="print-pricing" element={<PrintPricingManagement />} />
              <Route path="database" element={<DatabaseManager />} />
              <Route path="schema-manager" element={<SchemaManager />} />
              <Route path="database-manager" element={<DatabaseMigrationManager />} />
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
              <Route path="api-settings" element={<ApiSettings />} />
              <Route path="assets" element={<AssetsManager />} />
              <Route path="smart-import" element={<SmartImportPage />} />
              <Route path="svg-templates" element={<SvgTemplatesAdmin />} />
              <Route path="users" element={<UsersAdmin />} />
              <Route path="permissions" element={<PermissionsAdmin />} />
              <Route path="cms" element={<CmsAdmin />} />
              <Route path="user-permissions" element={<UserPermissionsAdmin />} />
              <Route path="studio" element={<StudioAdmin />} />
              <Route path="queue" element={<QueueManager />} />
              <Route path="auto-heal" element={<AutoHealCenter />} />
              <Route path="subscriptions" element={<SubscriptionsAdmin />} />
              <Route path="deploy" element={<DeployMonitor />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
            </AppShell>
      </TooltipProvider>
        </CartProvider>
      </I18nProvider>
    </ContentProvider>
  </QueryClientProvider>
);

export default App;
