import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TopAppBar } from "@/components/layout/top-app-bar";
import { BottomNavigation } from "@/components/layout/bottom-navigation";
import { FloatingActionButton } from "@/components/layout/floating-action-button";
import { Footer } from "@/components/layout/footer";
import Dashboard from "@/pages/dashboard";
import Scanner from "@/pages/scanner";
import ProductDetail from "@/pages/product-detail";
import AddProduct from "@/pages/add-product";
import EventLog from "@/pages/event-log";
import Products from "@/pages/products";
import Settings from "@/pages/settings";
import Users from "@/pages/users";
import Notifications from "@/pages/notifications";
import LoanOverview from "@/pages/loan-overview";
import Export from "@/pages/export";
import Login from "@/pages/login";
import GS1Sync from "@/pages/gs1-sync";
import Profile from "@/pages/profile";
import Stories from "@/pages/stories";
import ShareStory from "@/pages/share-story";
import EditStory from "@/pages/edit-story";
import CreateProductStory from "@/pages/create-product-story";
import GtinRegistry from "@/pages/gtin-registry";
import NotFound from "@/pages/not-found";
import DPPPage from "@/pages/dpp";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gwc-primary mx-auto mb-4"></div>
          <p>Laden...</p>
        </div>
      </div>
    );
  }

  // Public routes (no authentication required)
  return (
    <Switch>
      <Route path="/dpp/:gtin" component={DPPPage} />
      {!isAuthenticated && <Route component={Login} />}
      {isAuthenticated && (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/scanner" component={Scanner} />
          <Route path="/products" component={Products} />
          <Route path="/settings" component={Settings} />
          <Route path="/users" component={Users} />
          <Route path="/notifications" component={Notifications} />
          <Route path="/loans" component={LoanOverview} />
          <Route path="/export" component={Export} />
          <Route path="/gs1-sync" component={GS1Sync} />
          <Route path="/gtin-registry" component={GtinRegistry} />
          <Route path="/profile" component={Profile} />
          <Route path="/stories" component={Stories} />
          <Route path="/share-story" component={ShareStory} />
          <Route path="/edit-story/:id" component={EditStory} />
          <Route path="/create-product-story/:productId" component={CreateProductStory} />
          <Route path="/create-product-story/gtin/:gtin" component={CreateProductStory} />
          <Route path="/product/:id" component={ProductDetail} />
          <Route path="/product/gtin/:gtin" component={ProductDetail} />
          <Route path="/add-product" component={AddProduct} />
          <Route path="/event-log/:productId" component={EventLog} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white relative">
          <TopAppBar />
          <main className="flex-1 overflow-hidden">
            <Router />
          </main>
          <Footer />
          <BottomNavigation />
          <FloatingActionButton />
        </div>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
