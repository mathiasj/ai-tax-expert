import { useState } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { UpdateProfileResponse } from "@/types/api";

export function ProfileForm() {
	const { user, setUser } = useAuthContext();
	const [name, setName] = useState(user?.name ?? "");
	const [isSaving, setIsSaving] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const hasChanged = name.trim() !== (user?.name ?? "");

	const handleSave = async () => {
		if (!hasChanged || !name.trim()) return;
		setIsSaving(true);
		setMessage(null);
		try {
			const res = await api.patch<UpdateProfileResponse>("/api/auth/me", {
				name: name.trim(),
			});
			setUser(res.user);
			setMessage("Profilen har uppdaterats");
		} catch {
			setMessage("Kunde inte spara profilen");
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="space-y-4">
			<Input
				id="profile-email"
				label="E-post"
				value={user?.email ?? ""}
				disabled
				readOnly
			/>
			<Input
				id="profile-name"
				label="Namn"
				value={name}
				onChange={(e) => setName(e.target.value)}
				placeholder="Ditt namn"
			/>
			<Button disabled={!hasChanged || isSaving} onClick={handleSave}>
				{isSaving ? "Sparar..." : "Spara"}
			</Button>
			{message && (
				<p className="text-xs text-gray-500 dark:text-gray-400">{message}</p>
			)}
		</div>
	);
}
