import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface Toast {
	id: string;
	message: string;
	type: "success" | "error" | "info";
}

let addToast: (message: string, type: Toast["type"]) => void = () => {};

export function toast(message: string, type: Toast["type"] = "info") {
	addToast(message, type);
}

export function ToastContainer() {
	const [toasts, setToasts] = useState<Toast[]>([]);

	useEffect(() => {
		addToast = (message, type) => {
			const id = crypto.randomUUID();
			setToasts((prev) => [...prev, { id, message, type }]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, 4000);
		};
	}, []);

	return (
		<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
			{toasts.map((t) => (
				<div
					key={t.id}
					className={cn(
						"animate-in slide-in-from-right rounded-lg px-4 py-3 text-sm font-medium shadow-lg",
						t.type === "success" && "bg-green-600 text-white",
						t.type === "error" && "bg-red-600 text-white",
						t.type === "info" && "bg-gray-800 text-white dark:bg-gray-200 dark:text-gray-900",
					)}
				>
					{t.message}
				</div>
			))}
		</div>
	);
}
