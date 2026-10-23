import { Suspense, lazy } from "react";
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
import ConteudoJuridico from "./pages/ConteudoJuridico";
import ArtigoDetalhe from "./pages/ArtigoDetalhe";
import NotFound from "./pages/NotFound";

// Área administrativa (Code-Splitting com React.lazy)
import { ProtectedRoute } from "@/components/admin/ProtectedRoute";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { AdminLoadingFallback } from "@/components/admin/AdminLoadingFallback";

const Login = lazy(() => import("./pages/Login"));
const Dashboard = lazy(() => import("./pages/admin/Dashboard"));
const Processos = lazy(() => import("./pages/admin/Processos"));
const ProcessoNovo = lazy(() => import("./pages/admin/ProcessoNovo"));
const ProcessoDetalhe = lazy(() => import("./pages/admin/ProcessoDetalhe"));
const Configuracoes = lazy(() => import("./pages/admin/Configuracoes"));
const Notificacoes = lazy(() => import("./pages/admin/Notificacoes"));
const ArtigosLista = lazy(() => import("./pages/admin/ArtigosLista"));
const ArtigoEditor = lazy(() => import("./pages/admin/ArtigoEditor"));
const BancoDeImagens = lazy(() => import("./pages/admin/BancoDeImagens"));
const Clientes = lazy(() => import("./pages/admin/Clientes"));
const ClienteForm = lazy(() => import("./pages/admin/ClienteForm"));
const ClienteDetalhe = lazy(() => import("./pages/admin/ClienteDetalhe"));
const FunilProcessual = lazy(() => import("./pages/admin/FunilProcessual"));
const Casos = lazy(() => import("./pages/admin/Casos"));
const CasoForm = lazy(() => import("./pages/admin/CasoForm"));
const CasoDetalhe = lazy(() => import("./pages/admin/CasoDetalhe"));
const Agenda = lazy(() => import("./pages/admin/Agenda"));
const PendenciaForm = lazy(() => import("./pages/admin/PendenciaForm"));
const ModelosMinutas = lazy(() => import("./pages/admin/ModelosMinutas"));
const BackupCentral = lazy(() => import("./pages/admin/BackupCentral"));
const GerarDocumentos = lazy(() => import("./pages/admin/GerarDocumentos"));
const TrocarSenha = lazy(() => import("./pages/admin/TrocarSenha"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <ToasterSonner />
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
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
            <Route path="/conteudo-juridico" element={<ConteudoJuridico />} />
            <Route path="/conteudo-juridico/:slug" element={<ArtigoDetalhe />} />
          </Route>

          {/* ─── Autenticação ─── */}
          <Route path="/login" element={<Suspense fallback={<AdminLoadingFallback />}><Login /></Suspense>} />

          {/* ─── Área administrativa (protegida) ─── */}
          <Route
            path="/admin/trocar-senha"
            element={
              <ProtectedRoute>
                <Suspense fallback={<AdminLoadingFallback />}><TrocarSenha /></Suspense>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute>
                <Navigate to="/admin/crm/funil" replace />
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
          <Route
            path="/admin/artigos"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ArtigosLista />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/artigos/novo"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ArtigoEditor />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/artigos/:id/editar"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ArtigoEditor />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/artigos/imagens"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <BancoDeImagens />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* ─── CRM Jurídico ─── */}
          <Route
            path="/admin/crm/funil"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <FunilProcessual />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/clientes"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Clientes />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/clientes/novo"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ClienteForm />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/clientes/:id"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ClienteDetalhe />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/clientes/:id/editar"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ClienteForm />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Rotas de Casos (Issue #4) */}
          <Route
            path="/admin/crm/casos"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Casos />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/casos/novo"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CasoForm />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/casos/:id"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CasoDetalhe />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/casos/:id/editar"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <CasoForm />
                </AdminLayout>
              </ProtectedRoute>
            }
          />

          {/* Rotas de Agenda & Prazos (Issue #6) */}
          <Route
            path="/admin/crm/agenda"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <Agenda />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/agenda/novo"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <PendenciaForm />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/documentos"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <GerarDocumentos />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/modelos"
            element={
              <ProtectedRoute>
                <AdminLayout>
                  <ModelosMinutas />
                </AdminLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin/crm/backup"
            element={
              <ProtectedRoute requires={{ modulo: 'relatorios', acao: 'visualizar' }}>
                <AdminLayout>
                  <BackupCentral />
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
