import { Toaster } from "@/components/ui/toaster";
import { Toaster as ToasterSonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { SiteLayout } from "@/components/site/SiteLayout";
import AIChatbot from "@/components/AIChatbot/AIChatbot";

// Site público
import Home from "./pages/Home";
import AreasAtuacao from "./pages/AreasAtuacao";
import Sobre from "./pages/Sobre";
import Contato from "./pages/Contato";
import PoliticaDePrivacidade from "./pages/PoliticaDePrivacidade";
import TermosDeUso from "./pages/TermosDeUso";
import Calculadora from "./pages/Calculadora";
import NotFound from "./pages/NotFound";

// Área administrativa
import Login from "./pages/Login";
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import Dashboard from "./pages/admin/Dashboard";
import Processos from "./pages/admin/Processos";
import ProcessoNovo from "./pages/admin/ProcessoNovo";
import ProcessoDetalhe from "./pages/admin/ProcessoDetalhe";
import Configuracoes from "./pages/admin/Configuracoes";
import Notificacoes from "./pages/admin/Notificacoes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <ToasterSonner />
      <BrowserRouter>
        <Routes>
          {/* ─── Site público ─── */}
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/areas-de-atuacao" element={<AreasAtuacao />} />
            <Route path="/sobre" element={<Sobre />} />
            <Route path="/contato" element={<Contato />} />
            <Route path="/politica-de-privacidade" element={<PoliticaDePrivacidade />} />
            <Route path="/termos-de-uso" element={<TermosDeUso />} />
            <Route path="/calculadora" element={<Calculadora />} />
          </Route>

          {/* ─── Autenticação ─── */}
          <Route path="/login" element={<Login />} />

          {/* ─── Área administrativa (protegida) ─── */}
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Dashboard />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/processos"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Processos />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/processos/novo"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ProcessoNovo />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/processos/:id"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ProcessoDetalhe />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/configuracoes"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Configuracoes />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/notificacoes"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Notificacoes />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Redirect /admin/* desconhecido */}
          <Route path="/admin/*" element={<Navigate to="/admin" replace />} />

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>

        {/* Chatbot só no site público */}
        <Routes>
          <Route path="/" element={<AIChatbot />} />
          <Route path="/areas-de-atuacao" element={<AIChatbot />} />
          <Route path="/sobre" element={<AIChatbot />} />
          <Route path="/contato" element={<AIChatbot />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
