import type { TestQuestion } from "./types.js";

/**
 * Test questions sourced from Skatteverket's public FAQ (svar på vanliga frågor).
 * Each question includes the reference answer from Skatteverket for comparison.
 * These are used as an evaluation benchmark — not as training data.
 */
export const FAQ_QUESTIONS: TestQuestion[] = [
	// ─── Avdrag: resor ──────────────────────────────────────────
	{
		id: "faq-avd-1",
		question: "Jag åker kollektivt till mitt arbete. Vilket avdrag kan jag få?",
		category: "avdrag",
		difficulty: "basic",
		expectedKeywords: ["kollektivtrafik", "11 000", "2 kilometer", "avdrag"],
		referenceAnswer:
			"Om du reser med kollektivtrafik kan du få avdrag om avståndet mellan bostad och arbetsplats är minst 2 km. Bara kostnader som överstiger 11 000 kr per år är avdragsgilla.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80003674.html",
	},
	{
		id: "faq-avd-2",
		question: "Jag kör bil till mitt arbete. Vilket avdrag kan jag få?",
		category: "avdrag",
		difficulty: "basic",
		expectedKeywords: ["bil", "5 kilometer", "2 timmar", "25 kr", "11 000"],
		referenceAnswer:
			"Bilavdrag kräver minst 5 km avstånd och att du sparar minst 2 timmar per dag jämfört med kollektivtrafik. Avdrag är 25 kr/mil (2025–2026), bara den del som överstiger 11 000 kr.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80003674.html",
	},
	{
		id: "faq-avd-3",
		question: "Jag arbetar på en annan ort än där jag bor. Kan jag få avdrag för hemresor?",
		category: "avdrag",
		difficulty: "intermediate",
		expectedKeywords: ["hemresor", "50 km", "övernattning", "veckopendla"],
		referenceAnswer:
			"Hemresor är avdragsgilla om arbetsorten är mer än 50 km från bostaden och du övernattnar på arbetsorten.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80003674.html",
	},

	// ─── Avdrag: tjänsteresa ────────────────────────────────────
	{
		id: "faq-avd-4",
		question: "Kan jag få avdrag för ökade levnadskostnader när jag är på tjänsteresa i Sverige?",
		category: "avdrag",
		difficulty: "intermediate",
		expectedKeywords: ["tjänsteresa", "50 km", "övernattning", "290 kr", "traktamente"],
		referenceAnswer:
			"Vid tjänsteresa i Sverige (under 3 månader) med minst 50 km avstånd och övernattning kan du få avdrag med schablon 290 kr/dag (2025).",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80003674.html",
	},
	{
		id: "faq-avd-5",
		question: "Vilka regler gäller för avdrag för dubbel bosättning vid anställning i Sverige?",
		category: "avdrag",
		difficulty: "advanced",
		expectedKeywords: ["dubbel bosättning", "87 kr", "logi", "2 år"],
		referenceAnswer:
			"Avdrag för dubbel bosättning ger 87 kr/dag för måltider första månaden och faktiska logikostnader i upp till 2 år (2025).",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80003674.html",
	},

	// ─── Deklaration ────────────────────────────────────────────
	{
		id: "faq-dek-1",
		question: "Behöver jag spara några underlag när jag har deklarerat?",
		category: "deklaration",
		difficulty: "basic",
		expectedKeywords: ["spara", "6 år", "underlag", "avdrag"],
		referenceAnswer: "Spara dokumentation i sex år för att kunna styrka avdrag vid eventuell granskning.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80004754.html",
	},
	{
		id: "faq-dek-2",
		question: "Ska mitt barn lämna in en deklaration?",
		category: "deklaration",
		difficulty: "basic",
		expectedKeywords: ["barn", "24 873", "deklaration"],
		referenceAnswer:
			"Barn som tjänar under 24 873 kr eller bara har rapporterad kapitalinkomst behöver inte deklarera.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80004754.html",
	},
	{
		id: "faq-dek-3",
		question: "Varför har jag fått kvarskatt?",
		category: "deklaration",
		difficulty: "basic",
		expectedKeywords: ["kvarskatt", "preliminärskatt", "arbetsgivare", "schablonintäkt"],
		referenceAnswer:
			"Kvarskatt kan bero på för låg preliminärskatt, flera arbetsgivare, schablonintäkt på investeringssparkonto eller fastighetsskatt.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80004754.html",
	},
	{
		id: "faq-dek-4",
		question: "Jag har inte lämnat min deklaration i tid, kommer jag att få betala förseningsavgift?",
		category: "deklaration",
		difficulty: "basic",
		expectedKeywords: ["förseningsavgift", "4 maj", "3 750"],
		referenceAnswer:
			"Deklaration efter 4 maj utan anstånd ger förseningsavgift upp till 3 750 kr.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80004754.html",
	},

	// ─── Inkomst av tjänst ──────────────────────────────────────
	{
		id: "faq-ink-1",
		question: "Jag ska sommarjobba, behöver jag betala skatt?",
		category: "inkomstskatt",
		difficulty: "basic",
		expectedKeywords: ["sommarjobb", "25 042", "skattefri", "jämkning"],
		referenceAnswer:
			"Sommarjobb under 25 042 kr (2026) är skattefritt med rätt dokumentation till arbetsgivaren.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80002849.html",
	},
	{
		id: "faq-ink-2",
		question: "Jag får lön från två olika arbetsgivare. Hur gör jag för att undvika kvarskatt?",
		category: "inkomstskatt",
		difficulty: "intermediate",
		expectedKeywords: ["två arbetsgivare", "30%", "skattetabell", "kvarskatt"],
		referenceAnswer:
			"Bara den arbetsgivare som betalar mest använder skattetabell. Övriga drar 30 % preliminärskatt, vilket kan ge kvarskatt.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80002849.html",
	},
	{
		id: "faq-ink-3",
		question: "När ska man betala statlig inkomstskatt och hur hög är den?",
		category: "inkomstskatt",
		difficulty: "basic",
		expectedKeywords: ["statlig inkomstskatt", "20%", "643 000", "skiktgräns"],
		referenceAnswer:
			"Statlig inkomstskatt 2026 är 20 % på beskattningsbar förvärvsinkomst över 643 000 kr.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80002849.html",
	},

	// ─── ROT & RUT ──────────────────────────────────────────────
	{
		id: "faq-rot-1",
		question: "Vilket trädgårdsarbete ger rätt till rutavdrag?",
		category: "rot_rut",
		difficulty: "basic",
		expectedKeywords: ["trädgård", "gräsklippning", "häck", "ogräs", "rutavdrag"],
		referenceAnswer:
			"Gräsklippning, häckklippning, ogräsrensning och trädfällning ger rutavdrag. Plantering och stenläggning ger inte avdrag.",
		referenceUrl: "https://www.skatteverket.se/4.383cc9f31134f01c98a80003923.html",
	},
	{
		id: "faq-rot-2",
		question: "Kan jag få rotavdrag för målning av fönster på utsidan?",
		category: "rot_rut",
		difficulty: "basic",
		expectedKeywords: ["rotavdrag", "fönster", "insida", "utsida"],
		referenceAnswer:
			"Bara arbete på insidan av fönster ger rotavdrag. Utvändigt arbete och karmarbete ger inte avdrag.",
		referenceUrl: "https://www.skatteverket.se/4.383cc9f31134f01c98a80003923.html",
	},
	{
		id: "faq-rot-3",
		question: "Kan jag få rutavdrag för flytt av bohag?",
		category: "rot_rut",
		difficulty: "basic",
		expectedKeywords: ["flytt", "bohag", "rutavdrag", "bostad"],
		referenceAnswer:
			"Flytt av bohag mellan bostäder och till förråd ger rutavdrag. Bortforsling till avfallsstation ger inte avdrag.",
		referenceUrl: "https://www.skatteverket.se/4.383cc9f31134f01c98a80003923.html",
	},

	// ─── Värdepapper ────────────────────────────────────────────
	{
		id: "faq-vp-1",
		question: "Kan jag kvitta vinster mot förluster vid försäljning av värdepapper?",
		category: "vardepapper",
		difficulty: "intermediate",
		expectedKeywords: ["kvitta", "förlust", "vinst", "70%", "marknadsnoterad"],
		referenceAnswer:
			"Förluster kvittas mot vinster till 100 % för marknadsnoterade värdepapper. Resterande förlust är avdragsgill till 70 %.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80001694.html",
	},
	{
		id: "faq-vp-2",
		question: "Vad är en schablonintäkt på fondandelar?",
		category: "vardepapper",
		difficulty: "basic",
		expectedKeywords: ["schablonintäkt", "fondandelar", "0,4%", "1 januari", "30%"],
		referenceAnswer:
			"Fondandelar beskattas med schablonintäkt på 0,4 % av värdet den 1 januari, som sedan beskattas med 30 % kapitalskatt (0,12 % effektiv skatt).",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80001694.html",
	},
	{
		id: "faq-vp-3",
		question: "Jag har sålt marknadsnoterade aktier. Hur beräknar jag omkostnadsbeloppet?",
		category: "vardepapper",
		difficulty: "intermediate",
		expectedKeywords: ["genomsnittsmetoden", "schablonmetoden", "20%", "omkostnadsbelopp"],
		referenceAnswer:
			"Använd genomsnittsmetoden (snitt av alla köp) eller schablonmetoden (20 % av försäljningspriset). Justera för splits och emissioner.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80001694.html",
	},

	// ─── Fastighet ──────────────────────────────────────────────
	{
		id: "faq-fast-1",
		question: "Jag äger en villa. Vilken fastighetsskatt ska jag betala?",
		category: "fastighet",
		difficulty: "basic",
		expectedKeywords: ["fastighetsavgift", "0,75%", "taxeringsvärde", "nybyggd"],
		referenceAnswer:
			"Kommunal fastighetsavgift är max 8 349 kr (2020) eller 0,75 % av taxeringsvärdet, det lägre beloppet. Nybyggda hus får nedsättning.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80001400.html",
	},
	{
		id: "faq-fast-2",
		question: "Jag har en obebyggd tomt avsedd för småhus. Hur stor fastighetsskatt ska jag betala?",
		category: "fastighet",
		difficulty: "basic",
		expectedKeywords: ["obebyggd tomt", "1,0%", "fastighetsskatt", "taxeringsvärde"],
		referenceAnswer: "Obebyggd tomtmark för småhus beskattas med 1,0 % av taxeringsvärdet.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80001400.html",
	},
	{
		id: "faq-fast-3",
		question: "Jag har sålt min fastighet i februari. För vilken tid ska jag betala fastighetsavgift?",
		category: "fastighet",
		difficulty: "intermediate",
		expectedKeywords: ["1 januari", "hela året", "ägare", "fastighetsavgift"],
		referenceAnswer:
			"Den som äger fastigheten den 1 januari inkomståret betalar fastighetsavgift för hela året, oavsett när försäljning sker.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80001400.html",
	},

	// ─── Fordonsskatt ───────────────────────────────────────────
	{
		id: "faq-ford-1",
		question: "Hur stor är fordonsskatten och hur beräknas den?",
		category: "fordonsskatt",
		difficulty: "basic",
		expectedKeywords: ["bränsle", "koldioxid", "vikt", "CO2"],
		referenceAnswer:
			"Fordonsskatt beror på bränsletyp, CO2-utsläpp eller vikt. Ytterligare faktorer är kommun, antal axlar och användningssätt.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80004093.html",
	},
	{
		id: "faq-ford-2",
		question: "Vad händer om jag inte betalar fordonsskatten?",
		category: "fordonsskatt",
		difficulty: "basic",
		expectedKeywords: ["körförbud", "påminnelse", "dröjsmålsavgift", "Kronofogden"],
		referenceAnswer:
			"Körförbud utfärdas, påminnelse skickas och dröjsmålsavgift tillkommer. Skatten kan skickas till Kronofogden.",
		referenceUrl: "https://www.skatteverket.se/4.18e1b10334ebe8bc80004093.html",
	},
];
