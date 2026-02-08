import { Card } from "@/components/ui/card";
import { ProfileForm } from "@/components/settings/profile-form";
import { ThemeToggle } from "@/components/settings/theme-toggle";
import { useTheme } from "@/hooks/use-theme";

export function SettingsPage() {
	const { theme, setTheme } = useTheme();

	return (
		<div className="mx-auto max-w-2xl p-6">
			<h2 className="mb-6 text-xl font-bold text-gray-900 dark:text-gray-100">Inställningar</h2>

			<div className="space-y-6">
				<Card>
					<h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Profil</h3>
					<ProfileForm />
				</Card>

				<Card>
					<h3 className="mb-4 font-semibold text-gray-900 dark:text-gray-100">Utseende</h3>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-sm text-gray-700 dark:text-gray-300">Tema</p>
							<p className="text-xs text-gray-500 dark:text-gray-400">
								Välj mellan ljust, mörkt eller systemets inställning
							</p>
						</div>
						<ThemeToggle theme={theme} onChange={setTheme} />
					</div>
				</Card>
			</div>
		</div>
	);
}
