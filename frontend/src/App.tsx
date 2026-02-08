import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "@/contexts/auth-context";
import { AppLayout } from "@/components/layout/app-layout";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { LoginPage } from "@/pages/login-page";
import { RegisterPage } from "@/pages/register-page";
import { ChatPage } from "@/pages/chat-page";
import { DashboardPage } from "@/pages/dashboard-page";
import { DocumentsPage } from "@/pages/documents-page";
import { EvaluationPage } from "@/pages/evaluation-page";
import { SettingsPage } from "@/pages/settings-page";

export function App() {
	return (
		<BrowserRouter>
			<AuthProvider>
				<Routes>
					<Route path="/login" element={<LoginPage />} />
					<Route path="/register" element={<RegisterPage />} />
					<Route
						element={
							<ProtectedRoute>
								<AppLayout />
							</ProtectedRoute>
						}
					>
						<Route path="/" element={<ChatPage />} />
						<Route path="/dashboard" element={<DashboardPage />} />
						<Route path="/documents" element={<DocumentsPage />} />
						<Route path="/evaluation" element={<EvaluationPage />} />
						<Route path="/settings" element={<SettingsPage />} />
					</Route>
					<Route path="*" element={<Navigate to="/" replace />} />
				</Routes>
			</AuthProvider>
		</BrowserRouter>
	);
}
