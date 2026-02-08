export interface EvalQuestion {
	id: string;
	question: string;
	category: string;
	relevanceScore: number;
	faithfulnessScore: number;
	citationAccuracy: number;
	overallScore: number;
}

export interface EvalSummary {
	totalQuestions: number;
	avgRelevance: number;
	avgFaithfulness: number;
	avgCitationAccuracy: number;
	avgOverall: number;
	runDate: string;
}

export const sampleEvalSummary: EvalSummary = {
	totalQuestions: 17,
	avgRelevance: 0.82,
	avgFaithfulness: 0.88,
	avgCitationAccuracy: 0.75,
	avgOverall: 0.82,
	runDate: "2025-12-15T10:30:00Z",
};

export const sampleEvalQuestions: EvalQuestion[] = [
	{
		id: "1",
		question: "Hur beskattas kapitalvinst vid bostadsförsäljning?",
		category: "Kapitalvinst",
		relevanceScore: 0.9,
		faithfulnessScore: 0.95,
		citationAccuracy: 0.8,
		overallScore: 0.88,
	},
	{
		id: "2",
		question: "Vilka avdrag kan man göra som privatperson?",
		category: "Avdrag",
		relevanceScore: 0.85,
		faithfulnessScore: 0.9,
		citationAccuracy: 0.7,
		overallScore: 0.82,
	},
	{
		id: "3",
		question: "Hur fungerar 3:12-reglerna?",
		category: "Företagsbeskattning",
		relevanceScore: 0.75,
		faithfulnessScore: 0.85,
		citationAccuracy: 0.65,
		overallScore: 0.75,
	},
	{
		id: "4",
		question: "Vad gäller för moms vid internationell handel?",
		category: "Moms",
		relevanceScore: 0.8,
		faithfulnessScore: 0.88,
		citationAccuracy: 0.78,
		overallScore: 0.82,
	},
	{
		id: "5",
		question: "Hur beskattas kryptovalutor i Sverige?",
		category: "Kapitalvinst",
		relevanceScore: 0.7,
		faithfulnessScore: 0.82,
		citationAccuracy: 0.6,
		overallScore: 0.71,
	},
	{
		id: "6",
		question: "Vilka regler gäller för ROT- och RUT-avdrag?",
		category: "Avdrag",
		relevanceScore: 0.92,
		faithfulnessScore: 0.95,
		citationAccuracy: 0.88,
		overallScore: 0.92,
	},
	{
		id: "7",
		question: "Hur fungerar ränteavdraget?",
		category: "Avdrag",
		relevanceScore: 0.88,
		faithfulnessScore: 0.9,
		citationAccuracy: 0.82,
		overallScore: 0.87,
	},
	{
		id: "8",
		question: "Vad är skillnaden mellan inkomstskatt och kapitalskatt?",
		category: "Grundläggande",
		relevanceScore: 0.85,
		faithfulnessScore: 0.92,
		citationAccuracy: 0.75,
		overallScore: 0.84,
	},
];
