import { createBrowserRouter, Navigate } from "react-router-dom";
import { AppLayout } from "./shared/layout/AppLayout";
import { DashboardPage } from "./views/dashboard/DashboardPage";
import { DocumentsPage } from "./views/documents/DocumentsPage";
import { DocumentDetailsPage } from "./views/documents/DocumentDetailsPage";
import { AnnouncementsPage } from "./views/announcements/AnnouncementsPage";
import { AnnouncementDetailPage } from "./views/announcements/AnnouncementDetailPage";
import { AssistantPage } from "./views/assistant/AssistantPage";
import { AnalyticsPage } from "./views/analytics/AnalyticsPage";
import { SettingsPage } from "./views/settings/SettingsPage";
import { ProtectedRoute } from "./features/auth/ProtectedRoute";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    children: [
      { index: true, element: <DashboardPage /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "documents", element: <DocumentsPage /> },
          { path: "documents/:id", element: <DocumentDetailsPage /> },
          { path: "announcements", element: <AnnouncementsPage /> },
          { path: "announcements/:id", element: <AnnouncementDetailPage /> },
          { path: "assistant", element: <AssistantPage /> },
          { path: "analytics", element: <AnalyticsPage /> }
        ]
      },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/" replace /> }
    ]
  }
]);
