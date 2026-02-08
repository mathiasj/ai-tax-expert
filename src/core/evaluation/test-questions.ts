import type { TestQuestion } from "./types.js";

export const TEST_QUESTIONS: TestQuestion[] = [
	// Inkomstskatt
	{
		id: "ink-1",
		question: "Hur beskattas kapitalvinst vid försäljning av privatbostad?",
		category: "kapitalvinst",
		difficulty: "basic",
		expectedKeywords: ["kapitalvinst", "privatbostad", "22/30", "uppskov"],
		expectedLawRefs: ["45 kap. IL", "47 kap. IL"],
	},
	{
		id: "ink-2",
		question: "Vilka avdrag kan en anställd göra i sin inkomstdeklaration?",
		category: "avdrag",
		difficulty: "basic",
		expectedKeywords: ["resor", "arbetsresor", "hemarbete", "dubbel bosättning"],
		expectedLawRefs: ["12 kap. IL"],
	},
	{
		id: "ink-3",
		question: "Hur fungerar skiktgränsen för statlig inkomstskatt?",
		category: "inkomstskatt",
		difficulty: "basic",
		expectedKeywords: ["skiktgräns", "statlig", "kommunal", "grundavdrag"],
		expectedLawRefs: ["65 kap. IL"],
	},
	{
		id: "ink-4",
		question: "Vad innebär 3:12-reglerna för fåmansföretagsägare?",
		category: "foretag",
		difficulty: "advanced",
		expectedKeywords: ["fåmansföretag", "utdelning", "gränsbelopp", "lönebaserat"],
		expectedLawRefs: ["56 kap. IL", "57 kap. IL"],
	},
	{
		id: "ink-5",
		question: "Hur beskattas utdelning från ett aktiebolag till en fysisk person?",
		category: "kapitalvinst",
		difficulty: "intermediate",
		expectedKeywords: ["utdelning", "kapitalinkomst", "30%", "K10"],
		expectedLawRefs: ["42 kap. IL"],
	},

	// Moms
	{
		id: "moms-1",
		question: "Vilka momssatser gäller i Sverige och vad omfattar den reducerade satsen?",
		category: "moms",
		difficulty: "basic",
		expectedKeywords: ["25%", "12%", "6%", "livsmedel", "böcker"],
		expectedLawRefs: ["7 kap. ML"],
	},
	{
		id: "moms-2",
		question: "När ska ett företag momsregistrera sig och vilka gränsvärden gäller?",
		category: "moms",
		difficulty: "intermediate",
		expectedKeywords: ["registrering", "omsättningsgräns", "80 000"],
	},
	{
		id: "moms-3",
		question: "Hur fungerar omvänd skattskyldighet vid byggtjänster?",
		category: "moms",
		difficulty: "advanced",
		expectedKeywords: ["omvänd skattskyldighet", "byggtjänster", "underentreprenör"],
		expectedLawRefs: ["1 kap. ML"],
	},

	// Kapitalvinst
	{
		id: "kap-1",
		question: "Hur beräknas kapitalvinst vid försäljning av aktier?",
		category: "kapitalvinst",
		difficulty: "basic",
		expectedKeywords: ["genomsnittsmetoden", "schablonmetoden", "omkostnadsbelopp"],
		expectedLawRefs: ["44 kap. IL", "48 kap. IL"],
	},
	{
		id: "kap-2",
		question: "Vad gäller vid försäljning av en bostadsrätt som varit privatbostad?",
		category: "kapitalvinst",
		difficulty: "intermediate",
		expectedKeywords: ["bostadsrätt", "privatbostad", "kapitalvinst", "uppskov"],
		expectedLawRefs: ["46 kap. IL", "47 kap. IL"],
	},

	// Företag
	{
		id: "for-1",
		question: "Vilka regler gäller för representation och avdragsrätt?",
		category: "foretag",
		difficulty: "intermediate",
		expectedKeywords: ["representation", "avdrag", "måltid", "belopp"],
		expectedLawRefs: ["16 kap. IL"],
	},
	{
		id: "for-2",
		question: "Hur beskattas en enskild firma och vad innebär egenavgifter?",
		category: "foretag",
		difficulty: "basic",
		expectedKeywords: ["enskild firma", "egenavgifter", "F-skatt", "näringsverksamhet"],
		expectedLawRefs: ["13 kap. IL"],
	},
	{
		id: "for-3",
		question: "Vilka regler gäller för koncernbidrag mellan aktiebolag?",
		category: "foretag",
		difficulty: "advanced",
		expectedKeywords: ["koncernbidrag", "moderbolag", "dotterbolag", "ägarandel"],
		expectedLawRefs: ["35 kap. IL"],
	},

	// Avdrag
	{
		id: "avd-1",
		question: "Vad gäller för ROT- och RUT-avdrag och vilka belopp kan man få?",
		category: "avdrag",
		difficulty: "basic",
		expectedKeywords: ["ROT", "RUT", "skattereduktion", "hushåll"],
		expectedLawRefs: ["67 kap. IL"],
	},
	{
		id: "avd-2",
		question: "Hur fungerar ränteavdrag för privatpersoner?",
		category: "avdrag",
		difficulty: "intermediate",
		expectedKeywords: ["ränteavdrag", "kapital", "30%", "underskott"],
		expectedLawRefs: ["42 kap. IL"],
	},

	// Övrigt
	{
		id: "ovr-1",
		question: "Vilka regler gäller för skattefria gåvor från arbetsgivare?",
		category: "ovrigt",
		difficulty: "intermediate",
		expectedKeywords: ["gåvor", "julgåva", "jubileumsgåva", "skattefri"],
		expectedLawRefs: ["11 kap. IL"],
	},
	{
		id: "ovr-2",
		question: "Hur beskattas kryptovalutor i Sverige?",
		category: "ovrigt",
		difficulty: "advanced",
		expectedKeywords: ["kryptovaluta", "kapitalvinst", "deklaration", "växling"],
		expectedLawRefs: ["44 kap. IL", "52 kap. IL"],
	},
];
