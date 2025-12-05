// scripts/list-models.ts
import dotenv from "dotenv";

dotenv.config();

async function listModels() {
  try {
    const API_KEY = process.env.GEMINI_GENERATIVE_API_KEY;
    if (!API_KEY) {
      console.error("GEMINI_GENERATIVE_API_KEY is not set in your environment variables.");
      return;
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${API_KEY}`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log("Available Models:", data.models);
  } catch (error) {
    console.error("Error listing models:", error);
  }
}

listModels();
