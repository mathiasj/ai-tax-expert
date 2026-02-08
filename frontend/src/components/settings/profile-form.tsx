import { useState } from "react";
import { useAuthContext } from "@/contexts/auth-context";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function ProfileForm() {
	const { user } = useAuthContext();
	const [name, setName] = useState(user?.name ?? "");

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
			<Button disabled title="Profilredigering är inte tillgänglig ännu">
				Spara
			</Button>
			<p className="text-xs text-gray-400 dark:text-gray-500">
				Profilredigering kommer i en framtida uppdatering.
			</p>
		</div>
	);
}
