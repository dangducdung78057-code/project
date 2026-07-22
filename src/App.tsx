import { lazy, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppShell } from "@/components/AppShell";
import { AuthProvider } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { RootErrorBoundary } from "@/components/RootErrorBoundary";
import { RouteHead } from "@/components/RouteHead";
import Workspace from "./pages/Workspace";
import Projects from "./pages/Projects";
import ProjectEditor from "./pages/ProjectEditor";
import ProjectWizard from "./pages/ProjectWizard";
import ProjectDetail from "./pages/ProjectDetail";
import Modules from "./pages/Modules";
import Exports from "./pages/Exports";
import SettingsPage from "./pages/Settings";
import AuthPage from "./pages/Auth";
import Formation3D from "./pages/Formation3D";
import Stage2DPro from "./pages/Stage2DPro";
import NotFound from "./pages/NotFound";
import ScrollToTop from "./components/ScrollToTop";

// 2.5D 舞台预览工作台（含 pixi.js，体积较大）按路由懒加载，避免拖慢首屏
const Stage25DPreview = lazy(() => import("./pages/Stage25DPreview"));

const queryClient = new QueryClient();

const previewFallback = (
  <div className="flex h-96 items-center justify-center text-sm text-muted-foreground">
    正在加载 2.5D 舞台预览…
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <HelmetProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <RootErrorBoundary>
            <AuthProvider>
              <RouteHead />
              <ScrollToTop />
              <Routes>
                <Route path="/auth" element={<AuthPage />} />
                <Route path="/formation-3d" element={<Formation3D />} />
                <Route path="/stage-2d" element={<Stage2DPro />} />
                <Route path="/index" element={<Navigate to="/" replace />} />
                <Route
                  path="/*"
                  element={
                    <ProtectedRoute>
                      <AppShell>
                        <Routes>
                          <Route path="/" element={<Workspace />} />
                          <Route path="/projects" element={<Projects />} />
                          <Route path="/projects/new" element={<ProjectEditor />} />
                          <Route path="/projects/new/wizard" element={<ProjectWizard />} />
                          <Route path="/projects/:id/edit" element={<ProjectEditor />} />
                          <Route path="/projects/:id" element={<ProjectDetail />} />
                          <Route
                            path="/projects/:id/preview-25d"
                            element={
                              <Suspense fallback={previewFallback}>
                                <Stage25DPreview />
                              </Suspense>
                            }
                          />
                          {/* B1:文档约定的固定入口,项目 id 走 ?project=<id> 查询参数 */}
                          <Route
                            path="/workbench/preview"
                            element={
                              <Suspense fallback={previewFallback}>
                                <Stage25DPreview />
                              </Suspense>
                            }
                          />
                          <Route path="/modules" element={<Modules />} />
                          <Route path="/exports" element={<Exports />} />
                          <Route path="/settings" element={<SettingsPage />} />
                          <Route path="*" element={<NotFound />} />
                        </Routes>
                      </AppShell>
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </AuthProvider>
          </RootErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </HelmetProvider>
  </QueryClientProvider>
);

export default App;
