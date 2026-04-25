import { NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: Request) {
  let messages: any[] = [];
  try {
    const body = await req.json();
    messages = body.messages || [];
    const { candidate, jd } = body;

    const apiKey = process.env.GEMINI_API_KEY;
    
    // Fallback if no API key
    if (!apiKey) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const isCandidateInterested = messages[messages.length - 1].content.toLowerCase().includes('yes') || messages[messages.length - 1].content.toLowerCase().includes('interest');
      const interestScore = isCandidateInterested ? 85 : 40;
      return NextResponse.json({ 
        reply: "This is a simulated response since no API key is set. To test the real AI, please add a GEMINI_API_KEY to your .env file.",
        interestScore 
      });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-2.5-flash",
      generationConfig: { responseMimeType: "application/json" }
    });

    // Format the conversation history for the prompt
    const chatHistoryText = messages.map((m: any) => `${m.role === 'user' ? 'Candidate' : 'AI Recruiter'}: ${m.content}`).join('\n');

    const prompt = `
You are an expert AI Technical Recruiter named Catalyst. You are chatting with a candidate to assess their genuine interest in a role.
Here is the Job Description:
"""
${jd}
"""

Here is the Candidate's Profile:
${JSON.stringify(candidate, null, 2)}

Here is the conversation so far:
${chatHistoryText}

Your task:
1. Generate the next message from the AI Recruiter. You should be professional, engaging, and try to gauge their interest. Keep your response brief (1-3 sentences max). IMPORTANT: If the candidate clearly expresses that they are NOT interested or says "no", politely conclude the conversation immediately and wish them well. Do not pressure them or ask further questions.
2. Calculate the current "Interest Score" from 0 to 100 based on the candidate's enthusiasm, responsiveness, and alignment in the chat history.

Return your response ONLY as a JSON object with two fields:
- "reply": The text of your next message
- "interestScore": The calculated interest score (integer)

Do not include markdown formatting like \`\`\`json.
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const parsedResult = JSON.parse(text);

    return NextResponse.json({ 
      reply: parsedResult.reply,
      interestScore: parsedResult.interestScore
    });

  } catch (error: any) {
    console.error("Chat API Error:", error);
    if (error.status === 429 || error.message?.includes('429')) {
      const isCandidateInterested = messages[messages.length - 1]?.content.toLowerCase().includes('yes') || messages[messages.length - 1]?.content.toLowerCase().includes('interest');
      return NextResponse.json({ 
        reply: "I understand. (Simulated response due to API rate limit, please wait 30s)",
        interestScore: isCandidateInterested ? 85 : 40
      });
    }
    return NextResponse.json({ error: "Failed to process chat" }, { status: 500 });
  }
}
