import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button } from "./button";

interface Props {
	children: ReactNode;
	fallback?: ReactNode;
}

interface State {
	hasError: boolean;
	error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = { hasError: false, error: null };
	}

	static getDerivedStateFromError(error: Error): State {
		return { hasError: true, error };
	}

	componentDidCatch(error: Error, info: ErrorInfo) {
		console.error("ErrorBoundary caught:", error, info);
	}

	render() {
		if (this.state.hasError) {
			if (this.props.fallback) return this.props.fallback;
			return (
				<div className="flex flex-col items-center justify-center p-8 text-center">
					<h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
						Något gick fel
					</h2>
					<p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
						{this.state.error?.message}
					</p>
					<Button
						variant="secondary"
						className="mt-4"
						onClick={() => this.setState({ hasError: false, error: null })}
					>
						Försök igen
					</Button>
				</div>
			);
		}
		return this.props.children;
	}
}
