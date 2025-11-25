import { GoogleGenAI } from "@google/genai";

const getClient = () => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) throw new Error("API Key not found");
  return new GoogleGenAI({ apiKey });
};

export const generateEducationalContent = async (
  query: string,
  simulationContext: string
): Promise<string> => {
  try {
    const client = getClient();
    const model = client.models;
    
    const prompt = `
    You are an expert Network Engineer explaining time synchronization protocols (NTP, PTP, IEEE 1588, 802.11mc).
    The user is looking at a simulation of a Master clock and Slave devices.
    
    Current Simulation Context:
    ${simulationContext}

    User Question: ${query}

    Goal: Explain the concept simply but technically. Focus on how legitimate synchronization works (timestamps, round trip time calculation). 
    If the user asks about "hacking" or "intercepting" signals, pivot to explaining the security mechanisms of these protocols (like PTP authentication) or how Wi-Fi Fine Timing Measurement (FTM) works securely.
    Keep the response under 150 words. Use Markdown.
    `;

    const response = await model.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "I couldn't generate a response at this time.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Error connecting to the AI knowledge base. Please check your API key.";
  }
};
