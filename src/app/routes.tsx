import { type ReactNode } from 'react';
import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { AuthGate } from './AuthGate';
import { AppShell } from './AppShell';
import { LoginPage } from '../auth/LoginPage';
import { LandingPage } from '../landing/LandingPage';
import { ClassesPage } from '../classes/ClassesPage';
import { CollectionsPage } from '../collections/CollectionsPage';
import { CollectionDetailPage } from '../collections/CollectionDetailPage';
import { OfficialDocumentPage } from '../tasks/OfficialDocumentPage';
import { InboxPage } from '../inbox/InboxPage';
import { TaskListPage } from '../tasks/TaskListPage';
import { TemplatesPage } from '../templates/TemplatesPage';
import { CalendarPage } from '../calendar/CalendarPage';

function PublicOnlyRoute({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <p className="route-loading">로딩 중...</p>;
  }

  if (user) {
    return <Navigate to="/app/inbox" replace />;
  }

  return <>{children}</>;
}

export function AppRoutes() {
  return (
    <>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route
          path="/login"
          element={
            <PublicOnlyRoute>
              <LoginPage />
            </PublicOnlyRoute>
          }
        />
        <Route
          path="/app"
          element={
            <AuthGate
              fallback={<Navigate to="/login" replace />}
              loadingFallback={<p className="route-loading">인증 확인 중...</p>}
            >
              <AppShell>
                <Outlet />
              </AppShell>
            </AuthGate>
          }
        >
          <Route index element={<Navigate to="inbox" replace />} />
          <Route path="inbox" element={<InboxPage />} />
          <Route path="tasks" element={<TaskListPage />} />
          <Route path="tasks/:taskId" element={<OfficialDocumentPage />} />
          <Route path="classes" element={<ClassesPage />} />
          <Route path="collections" element={<CollectionsPage />} />
          <Route path="collections/:collectionId" element={<CollectionDetailPage />} />
          <Route path="templates" element={<TemplatesPage />} />
          <Route path="calendar" element={<CalendarPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
