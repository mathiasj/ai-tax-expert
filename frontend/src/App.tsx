import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth-context";
import { AppLayout } from "@/components/layout/app-layout";
import { AdminLayout } from "@/components/admin/admin-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AdminRoute } from "@/components/auth/admin-route";
import { LoginPage } from "@/pages/login-page";
import { RegisterPage } from "@/pages/register-page";
import { LandingPage } from "@/pages/landing-page";
import { ChatPage } from "@/pages/chat-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { DocumentsPage } from "@/pages/documents-page";
import { EvaluationPage } from "@/pages/evaluation-page";
import { SettingsPage } from "@/pages/settings-page";
import { AdminLoginPage } from "@/pages/admin/admin-login-page";
import { AdminOverviewPage } from "@/pages/admin/admin-overview-page";
import { AdminDocumentsPage } from "@/pages/admin/admin-documents-page";
import { AdminSourcesPage } from "@/pages/admin/admin-sources-page";
import { AdminQueriesPage } from "@/pages/admin/admin-queries-page";
import { AdminSystemPage } from "@/pages/admin/admin-system-page";

export function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/" element={<LandingPage />} />
					<Route path="/login" element={<LoginPage />} />
					<Route path="/register" element={<RegisterPage />} />

					{/* User routes */}
					<Route
						element={
							<ProtectedRoute>
								<AppLayout />
							</ProtectedRoute>
						}
					>
						<Route path="/chat" element={<ChatPage />} />
						<Route path="/dashboard" element={<DashboardPage />} />
						<Route path="/documents" element={<DocumentsPage />} />
						<Route path="/evaluation" element={<EvaluationPage />} />
						<Route path="/settings" element={<SettingsPage />} />
					</Route>

					{/* Admin routes */}
					<Route path="/admin/login" element={<AdminLoginPage />} />
					<Route
						element={
							<AdminRoute>
								<AdminLayout />
							</AdminRoute>
						}
					>
						<Route path="/admin" element={<AdminOverviewPage />} />
						<Route path="/admin/documents" element={<AdminDocumentsPage />} />
						<Route path="/admin/sources" element={<AdminSourcesPage />} />
						<Route path="/admin/queries" element={<AdminQueriesPage />} />
						<Route path="/admin/system" element={<AdminSystemPage />} />
					</Route>

					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}
