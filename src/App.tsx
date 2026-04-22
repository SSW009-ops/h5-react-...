import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import OrderHall from "./pages/OrderHall";
import CreateOrder from "./pages/CreateOrder";
import MyOrders from "./pages/MyOrders";
import MerchantOnboarding from "./pages/MerchantOnboarding";
import MerchantDetail from "./pages/MerchantDetail";
import NearbyList from "./pages/NearbyList";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner duration={2000} />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/hall" element={<OrderHall />} />
            <Route path="/create" element={<CreateOrder />} />
            <Route path="/mine" element={<MyOrders />} />
            <Route path="/merchant-onboarding" element={<MerchantOnboarding />} />
            <Route path="/merchant/:id" element={<MerchantDetail />} />
            <Route path="/nearby" element={<NearbyList />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
