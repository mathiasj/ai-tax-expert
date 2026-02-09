import { useCallback, useEffect, useRef, useState } from "react";

interface UseTypewriterOptions {
	questions: string[];
	enabled: boolean;
	typeSpeed?: number;
	jitter?: number;
	pauseMin?: number;
	pauseMax?: number;
}

type Phase = "typing" | "pausing" | "clearing" | "typo-pause" | "typo-delete" | "typo-correct";

function randBetween(min: number, max: number): number {
	return min + Math.random() * (max - min);
}

function typingDelay(speed: number, jit: number): number {
	return Math.max(15, speed + randBetween(-jit, jit));
}

// Pick a random typo position in the middle 60% of a question
function pickTypoIndex(len: number): number {
	const start = Math.floor(len * 0.2);
	const end = Math.floor(len * 0.8);
	return start + Math.floor(Math.random() * (end - start));
}

// Nearby keys on a Swedish QWERTY layout
const NEIGHBORS: Record<string, string> = {
	a: "sq",
	b: "vn",
	c: "xv",
	d: "sf",
	e: "wr",
	f: "dg",
	g: "fh",
	h: "gj",
	i: "uo",
	j: "hk",
	k: "jl",
	l: "kö",
	m: "n",
	n: "bm",
	o: "ip",
	p: "oå",
	q: "w",
	r: "et",
	s: "ad",
	t: "ry",
	u: "yi",
	v: "cb",
	w: "qe",
	x: "zc",
	y: "tu",
	z: "x",
	å: "pä",
	ä: "åö",
	ö: "lä",
};

function nearbyChar(ch: string): string {
	const lower = ch.toLowerCase();
	const pool = NEIGHBORS[lower];
	if (!pool) return ch;
	const picked = pool[Math.floor(Math.random() * pool.length)] as string;
	return ch === lower ? picked : picked.toUpperCase();
}

export function useTypewriter({
	questions,
	enabled,
	typeSpeed = 55,
	jitter = 50,
	pauseMin = 2000,
	pauseMax = 4000,
}: UseTypewriterOptions): string {
	const [display, setDisplay] = useState("");
	const indexRef = useRef(0);
	const charRef = useRef(0);
	const phaseRef = useRef<Phase>("typing");
	const timerRef = useRef<ReturnType<typeof setTimeout>>();
	const typoIndexRef = useRef(-1);

	const tick = useCallback(() => {
		if (!enabled || questions.length === 0) return;

		const current = questions[indexRef.current % questions.length] as string;
		const phase = phaseRef.current;

		switch (phase) {
			case "typing": {
				const ch = current[charRef.current] as string;
				const isTypoPos = charRef.current === typoIndexRef.current && /[a-zåäö]/i.test(ch);

				if (isTypoPos) {
					charRef.current++;
					setDisplay(current.slice(0, charRef.current - 1) + nearbyChar(ch));
					phaseRef.current = "typo-pause";
					timerRef.current = setTimeout(tick, randBetween(200, 400));
				} else {
					charRef.current++;
					setDisplay(current.slice(0, charRef.current));
					if (charRef.current >= current.length) {
						phaseRef.current = "pausing";
						timerRef.current = setTimeout(tick, randBetween(pauseMin, pauseMax));
					} else {
						timerRef.current = setTimeout(tick, typingDelay(typeSpeed, jitter));
					}
				}
				break;
			}
			case "typo-pause":
				charRef.current--;
				setDisplay(current.slice(0, charRef.current));
				phaseRef.current = "typo-delete";
				timerRef.current = setTimeout(tick, randBetween(100, 200));
				break;
			case "typo-delete":
				charRef.current++;
				setDisplay(current.slice(0, charRef.current));
				phaseRef.current = "typo-correct";
				timerRef.current = setTimeout(tick, randBetween(60, 120));
				break;
			case "typo-correct":
				phaseRef.current = "typing";
				if (charRef.current >= current.length) {
					phaseRef.current = "pausing";
					timerRef.current = setTimeout(tick, randBetween(pauseMin, pauseMax));
				} else {
					timerRef.current = setTimeout(tick, typingDelay(typeSpeed, jitter));
				}
				break;
			case "pausing":
				charRef.current = 0;
				setDisplay("");
				phaseRef.current = "clearing";
				timerRef.current = setTimeout(tick, randBetween(300, 600));
				break;
			case "clearing": {
				indexRef.current = (indexRef.current + 1) % questions.length;
				const next = questions[indexRef.current % questions.length] as string;
				typoIndexRef.current = pickTypoIndex(next.length);
				charRef.current = 0;
				phaseRef.current = "typing";
				timerRef.current = setTimeout(tick, typingDelay(typeSpeed, jitter));
				break;
			}
		}
	}, [enabled, questions, typeSpeed, jitter, pauseMin, pauseMax]);

	useEffect(() => {
		if (enabled && questions.length > 0) {
			indexRef.current = 0;
			charRef.current = 0;
			phaseRef.current = "typing";
			typoIndexRef.current = pickTypoIndex((questions[0] as string).length);
			setDisplay("");
			timerRef.current = setTimeout(tick, randBetween(400, 700));
		} else {
			setDisplay("");
		}
		return () => {
			if (timerRef.current) clearTimeout(timerRef.current);
		};
	}, [enabled, questions, tick]);

	return display;
}
