import { useState } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { api } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
			<div className="space-y-2">
				<Label htmlFor="profile-email">E-post</Label>
				<Input
					id="profile-email"
					value={user?.email ?? ""}
					disabled
					readOnly
				/>
			</div>
			<div className="space-y-2">
				<Label htmlFor="profile-name">Namn</Label>
				<Input
					id="profile-name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					placeholder="Ditt namn"
				/>
			</div>
			<Button disabled={!hasChanged || isSaving} onClick={handleSave}>
				{isSaving ? "Sparar..." : "Spara"}
			</Button>
			{message && (
				<p className="text-xs text-muted-foreground">{message}</p>
			)}
		</div>
	);
}
