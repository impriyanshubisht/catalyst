import { NextResponse } from 'next/server';
import { mockCandidates } from '@/data/candidates';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  try {
    const { jd } = await req.json();

    if (!jd || jd.trim().length === 0) {
      return NextResponse.json({ error: "Job description is required" }, { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Fallback if no API key is provided
    if (!apiKey) {
      console.warn("No GEMINI_API_KEY found. Using mock scoring.");
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate delay
      
      const scoredCandidates = mockCandidates.map(c => {
        // Pseudo-random score based on id string
        const score = 70 + (c.id.charCodeAt(1) % 25);
        return {
          ...c,
          matchScore: score,
          matchExplanation: `Strong match due to background in ${c.skills.slice(0, 2).join(' and ')} which aligns with the JD.`,
          interestScore: 0 // Default
        };
      }).sort((a, b) => b.matchScore - a.matchScore);

      return NextResponse.json({ candidates: scoredCandidates });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

const minimalCandidates = mockCandidates.map(c => ({
      id: c.id,
      role: c.role,
      skills: c.skills,
      experience: c.experience,
      bio: c.bio
    }));

    const prompt = `
You are an expert technical recruiter AI. 
Here is a Job Description:
"""
${jd}
"""

Here is a list of candidate profiles in JSON format:
${JSON.stringify(minimalCandidates, null, 2)}

For each candidate, calculate a "Match Score" from 0 to 100 based on how well their skills, experience, and role align with the Job Description. 
Also, provide a 1-sentence (10-15 words) "Match Explanation" that highlights a specific, compelling reason why they fit.

Return a JSON array where each object has:
- "id": The candidate's id
- "matchScore": The calculated score (integer)
- "matchExplanation": The 1-sentence explanation

Respond ONLY with valid JSON. Do not include markdown formatting like \`\`\`json.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsedResults = JSON.parse(text);

    // Merge results with candidate data
    const scoredCandidates = mockCandidates.map(c => {
      const match = parsedResults.find((r: any) => r.id === c.id);
      return {
        ...c,
        matchScore: match ? match.matchScore : 50,
        matchExplanation: match ? match.matchExplanation : "Average match.",
        interestScore: 0
      };
    }).sort((a, b) => b.matchScore - a.matchScore);

    return NextResponse.json({ candidates: scoredCandidates });

  } catch (error: any) {
    console.error("Match API Error:", error);
    if (error.status === 429 || error.message?.includes('429')) {
      const scoredCandidates = mockCandidates.map(c => {
        const score = 70 + (c.id.charCodeAt(1) % 25);
        return {
          ...c,
          matchScore: score,
          matchExplanation: `Strong match based on skills. (Rate limit fallback)`,
          interestScore: 0
        };
      }).sort((a, b) => b.matchScore - a.matchScore);
      return NextResponse.json({ candidates: scoredCandidates });
    }
    return NextResponse.json({ error: "Failed to process matching" }, { status: 500 });
  }
}
