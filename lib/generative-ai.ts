// lib/generative-ai.ts
import genai from "@google/genai";
import { HarmCategory, HarmBlockThreshold } from "@google/generative-ai";
import dotenv from "dotenv";

dotenv.config();

const API_KEY = process.env.GEMINI_GENERATIVE_API_KEY;

if (!API_KEY) {
  throw new Error("GEMINI_GENERATIVE_API_KEY is not set");
}

const genAI = new genai.GoogleGenAI({ apiKey: API_KEY });

async function urlToGenerativePart(url: string, mimeType: string) {
  if (url.startsWith('data:')) {
    const [meta, base64Data] = url.split(',');
    const [_, inferredMimeType] = meta.split(':');
    return {
      inlineData: {
        data: base64Data,
        mimeType: inferredMimeType.split(';')[0],
      },
    };
  }
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return {
    inlineData: {
      data: Buffer.from(buffer).toString("base64"),
      mimeType,
    },
  };
}

export async function getCreatureGender(imageUrl: string): Promise<string> {
  try {
    const imagePart = await urlToGenerativePart(imageUrl, "image/png");
    const prompt = "Analyze the creature in this image. Does it appear male or female? Respond with only one word: 'male', 'female', or 'unknown'.";

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [{ role: "user", parts: [{ text: prompt }, imagePart] }],
      //@ts-ignore
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const part = result.candidates?.[0]?.content?.parts?.[0];
    if (part && 'text' in part) {
      //@ts-ignore
      const gender = part.text.trim().toLowerCase();
      if (['male', 'female', 'unknown'].includes(gender)) {
        return gender;
      }
    }
    return 'unknown';
  } catch (error) {
    console.error("Error calling Gemini API for gender analysis:", error);
    return 'unknown';
  }
}

export async function getCreatureDescription(imageUrl: string): Promise<string> {
  try {
    const imagePart = await urlToGenerativePart(imageUrl, "image/png");
    const prompt = "Analyze the creature in this image. Describe its key visual features, such as its species, colors, textures, and overall style, in a short phrase.";

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [{ role: "user", parts: [{ text: prompt }, imagePart] }],
      //@ts-ignore
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    });

    const part = result.candidates?.[0]?.content?.parts?.[0];
    if (part && 'text' in part) {
      //@ts-ignore
      return part.text.trim();
    }
    return 'a creature';
  } catch (error) {
    console.error("Error calling Gemini API for description analysis:", error);
    return 'a creature';
  }
}

export async function makeCreatureSmile(imageUrl: string, religion: string, gender: string, description: string): Promise<string | null> {
  try {
    const imagePart = await urlToGenerativePart(imageUrl, "image/png");

    const religiousItems: { [key: string]: string } = {
      Muslim: 'the Holy Quran',
      Christian: 'the Holy Bible',
      Jewish: 'a Torah scroll',
      Hindu: 'the Vedas',
      Satanic: 'a book of shadows',
      Buddhist: 'prayer beads',
    };

    const expressions = ['a confident expression', 'a gentle smile', 'an energized expression, like it is ready for action'];
    let randomExpression = expressions[Math.floor(Math.random() * expressions.length)];

    let clankerLogoInstruction = 'Clanker logo (A logo with a solid purple circular background. Inside the circle, there are three vertical white bars of increasing height, arranged from left to right, resembling a signal strength indicator or a simplified bar graph.))';
    let farcasterLogoInstruction = 'Farcaster logo ((A logo consisting of a solid purple square with a white, inverted U-shape (like an archway or a stylized \'A\') cut out from its center, leaving the purple as the dominant shape))';

    const thematicBackgrounds: { [key: string]: string } = {
      Muslim: 'a background with rich and varied Islamic architectural patterns, geometric designs, or elements suggesting a vibrant, peaceful oasis or a scholarly setting, with a soft, warm ambiance',
      Christian: 'a background with subtle Christian iconography, or a serene and contemplative atmosphere',
      Jewish: 'a background with subtle Jewish cultural motifs, or a wise and ancient scholarly feel',
      Hindu: 'a background with subtle Hindu artistic elements, or a vibrant and spiritual energy',
      Buddhist: 'a background with subtle Buddhist symbols, or a calm and meditative environment',
      Satanic: 'a background with subtle dark aesthetic elements, or a powerful and mysterious atmosphere',
    };

    const warpletteBackgrounds = [
      'a sleek, dark-themed background with glowing purple geometric patterns, reminiscent of modern crypto wallets. Subtle text like "$DEGEN" or "37" might be integrated into the patterns.',
      //'a minimalist background with the Farcaster logo (the purple arch) subtly watermarked. The phrase "clank clank" appears in a clean, bold font in a corner.',
      //'a vibrant, abstract background with purple and magenta gradients, with the number "37" floating as a bold, stylized element.'
    ];
    thematicBackgrounds.Warplette = warpletteBackgrounds[Math.floor(Math.random() * warpletteBackgrounds.length)];

    const baseInstruction = `Given the image of this ${gender} creature, which looks like ${description}, redraw it. The creature's core appearance and species must remain the same.`;
    let poseInstruction = `It should be in a cool, dynamic, and interesting pose.`;
    if (religion === 'Christian') {
      poseInstruction = `Keep the pose exactly as it is in the original image.`;
    }
    const finalInstruction = `Return only the final image, with no text or annotations.`;

    let expressionInstruction = `It should have ${randomExpression} on its face.`;
    if (religion === 'Satanic') {
      expressionInstruction = `It should have a powerful, intense, or mischievous expression on its face, not a smile.`;
    } else if (religion === 'Christian') {
      expressionInstruction = `Do not give the creature any new emotions. Keep the facial expression exactly as it is in the original image.`;
    }



    let outfitInstruction = '';
    if (religion === 'Christian') {
      outfitInstruction = `Remove any existing hat or headgear from the character. Then place a red-and-white Christmas Santa hat on their head so it fully covers their blue hair. The hat must fit naturally with the side-profile pose, resting on the hair and following the head shape with proper shadows. Match the anime lineart, shading, and colors so the hat blends perfectly with the original style. Do not change the face, ear, cigarette, jacket, background, or anything else.`;
    } else if (religion === 'Jewish') {
      outfitInstruction = `Dress it in unique, modern religious Jewish attire, making it look like it's in its 40s.`;
    } else if (religion === 'Warplette') {
      if (gender === 'male') {
        const warpletteMaleStyles = [
          'a black cap with "37" boldly written on it',
          'a black cap with "67" boldly written on it',
          `a black cap featuring the ${clankerLogoInstruction}`,
          `a black cap featuring the ${farcasterLogoInstruction}`,
          'a black cap featuring the Farcaster logo (a purple circle with white bars)',
          'a black cap featuring the Clanker logo (a purple bridge-like shape)',
          'a white shirt saying "i ❤️ farcaster" in purple color',
          `a white shirt saying "i ${clankerLogoInstruction} farcaster" in purple color`,

        ];
        const randomWarpletteMaleStyle = warpletteMaleStyles[Math.floor(Math.random() * warpletteMaleStyles.length)];
        outfitInstruction = `Dress it in crypto bros, retardio style dressing attire, including ${randomWarpletteMaleStyle}.`;
      } else { // Female Warplette
        const warpletteFemaleStyles = [
          'a modern tech-inspired outfit with subtle Farcaster purple accents',
          'a white shirt saying "i ❤️ farcaster" in purple color',
          'a purple shirt saying "i ❤️ farcaster" in white color',
        ];
        const randomWarpletteFemaleStyle = warpletteFemaleStyles[Math.floor(Math.random() * warpletteFemaleStyles.length)];
        outfitInstruction = `Dress it in crypto bros, retardio style attire, including ${randomWarpletteFemaleStyle}.`;
      }
    } else {
      outfitInstruction = `Dress it in unique, modern religious ${religion} attire.`;
    }
    outfitInstruction += ` The outfit should be inspired by the creature's original appearance.`;

    let itemInstruction = '';
    if (Math.random() < 0.5 && religiousItems[religion] && religion !== 'Christian') {
      itemInstruction = `The creature can be holding ${religiousItems[religion]}.`;
    }

    // Warplette specific instructions
    let warpletteSpecificInstructions = '';
    if (religion === 'Warplette') {
      warpletteSpecificInstructions += `Before applying new attire, remove any existing clothes from the creature.`;

      // Random tattoo logic
      if (Math.random() < 0.5) { // 50% chance for a tattoo
        const tattooOptions = [
          'a tattoo on its cheek saying "37"',
          'a tattoo on its cheek saying "67"',
          'a tattoo on its forehead saying "clank clank" very bodly written',
        ];
        const randomTattoo = tattooOptions[Math.floor(Math.random() * tattooOptions.length)];
        warpletteSpecificInstructions += ` It should also have ${randomTattoo}.`;
      }
    }

    let backgroundInstruction = `The background must be a ${thematicBackgrounds[religion] || 'simple, single solid color that complements the colors of the new outfit.'} and match the outfit's style.`;
    if (religion === 'Christian') {
      backgroundInstruction = `Do not change the background. Keep the background exactly as it is in the original image.`;
    }

    const prompt = [
      baseInstruction,
      outfitInstruction,
      expressionInstruction,
      poseInstruction,
      itemInstruction,
      warpletteSpecificInstructions, // Add Warplette specific instructions here
      backgroundInstruction,
      finalInstruction,
    ].filter(Boolean).join(' ');

    const result = await genAI.models.generateContent({
      model: "gemini-2.5-flash-image-preview",
      contents: [{
        role: "user", parts: [
          { text: prompt },
          imagePart
        ]
      }],
      // @ts-ignore
      safetySettings: [
        {
          category: HarmCategory.HARM_CATEGORY_HARASSMENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        },
        {
          category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
          threshold: HarmBlockThreshold.BLOCK_NONE,
        }
      ],
    });

    const part = result.candidates?.[0]?.content?.parts?.[0];

    if (part && 'inlineData' in part) {
      const generatedImage = part.inlineData;
      //@ts-ignore
      return `data:${generatedImage.mimeType};base64,${generatedImage.data}`;
    }

    return null;

  } catch (error) {
    console.error("Error calling Gemini API:", error);
    return null;
  }
}
