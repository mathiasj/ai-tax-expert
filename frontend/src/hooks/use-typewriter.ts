import { useCallback, useEffect, useRef, useState } from "react";

interface UseTypewriterOptions {
	questions: string[];
	enabled: boolean;
	typeSpeed?: number;
	eraseSpeed?: number;
	pauseMs?: number;
}

export function useTypewriter({
	questions,
	enabled,
	typeSpeed = 50,
	eraseSpeed = 30,
	pauseMs = 2000,
}: UseTypewriterOptions): string {
	const [display, setDisplay] = useState("");
	const indexRef = useRef(0);
	const charRef = useRef(0);
	const phaseRef = useRef<"typing" | "pausing" | "erasing">("typing");
	const timerRef = useRef<ReturnType<typeof setTimeout>>();

	const tick = useCallback(() => {
		if (!enabled || questions.length === 0) return;

		const current = questions[indexRef.current % questions.length] as string;

		if (phaseRef.current === "typing") {
			charRef.current++;
			setDisplay(current.slice(0, charRef.current));
			if (charRef.current >= current.length) {
				phaseRef.current = "pausing";
				timerRef.current = setTimeout(tick, pauseMs);
			} else {
				timerRef.current = setTimeout(tick, typeSpeed);
			}
		} else if (phaseRef.current === "pausing") {
			phaseRef.current = "erasing";
			timerRef.current = setTimeout(tick, eraseSpeed);
		} else {
			charRef.current--;
			setDisplay(current.slice(0, charRef.current));
			if (charRef.current <= 0) {
				phaseRef.current = "typing";
				indexRef.current = (indexRef.current + 1) % questions.length;
				timerRef.current = setTimeout(tick, typeSpeed + 200);
			} else {
				timerRef.current = setTimeout(tick, eraseSpeed);
			}
		}
	}, [enabled, questions, typeSpeed, eraseSpeed, pauseMs]);

	useEffect(() => {
		if (enabled && questions.length > 0) {
			// Reset on questions change
			indexRef.current = 0;
			charRef.current = 0;
			phaseRef.current = "typing";
			setDisplay("");
			timerRef.current = setTimeout(tick, typeSpeed + 400);
		} else {
			setDisplay("");
		}
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [enabled, questions, tick, typeSpeed]);

	return display;
}
