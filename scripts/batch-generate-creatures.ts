// scripts/batch-generate-creatures.ts
import { makeCreatureSmile, getCreatureGender, getCreatureDescription } from '../lib/generative-ai';
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execPromise = promisify(exec);

dotenv.config();

// Helper function to read a local file and convert it to a data URL
function localFileToDataUrl(filePath: string, mimeType: string): string {
  // filePath is already an absolute path
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found at path: ${filePath}`);
  }
  const fileBuffer = fs.readFileSync(filePath);
  const base64Data = fileBuffer.toString('base64');
  return `data:${mimeType};base64,${base64Data}`;
}

async function batchGenerate() {
  console.log("Starting batch generation of creature images...");

  const imagePaths = [
    'public/creature/creature2.avif',
   /*  'public/creature/creature2.avif',
    'public/creature/creature3.avif',
    'public/creature/creature4.avif',
    'public/creature/creature5.avif',
    'public/creature/creature6.avif',
    'public/creature/creature7.avif', */
  ];

  const religions = [
   // 'Muslim',
    'Christian',
    //'Jewish',
    //'Hindu',
    //'Satanic',
    //'Buddhist',
   ];

  // Create an output directory if it doesn't exist
  const outputDir = path.join(process.cwd(), 'generated-creatures');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir);
  }

  // Create a temporary directory for PNG conversions
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'creature-png-'));
  console.log(`Created temporary directory for PNG conversions: ${tempDir}`);

  for (let i = 0; i < religions.length; i++) {
    const religion = religions[i];
    const avifPath = imagePaths[i];
    const tempPngPath = path.join(tempDir, `creature${i + 1}.png`);

    console.log(`\n--- Processing [${i + 1}/${religions.length}]: Religion: ${religion}, Image: ${avifPath} ---`);

    try {
      // 1. Convert AVIF to PNG using ImageMagick
      console.log(`Converting ${avifPath} to ${tempPngPath} using ImageMagick...`);
      const { stdout, stderr } = await execPromise(`convert ${avifPath} ${tempPngPath}`);
      if (stdout) console.log('Convert stdout:', stdout);
      if (stderr) console.error('Convert stderr:', stderr);
      console.log("Conversion command executed.");

      // Verify file existence before proceeding
      console.log(`Checking if ${tempPngPath} exists: ${fs.existsSync(tempPngPath)}`);

      // 2. Convert temporary PNG file path to data URL
      const imageDataUrl = localFileToDataUrl(tempPngPath, 'image/png');
      console.log("Converted image to data URL.");

      // 3. Get creature gender and description
      console.log("Analyzing creature for gender and description...");
      const gender = await getCreatureGender(imageDataUrl);
      const description = await getCreatureDescription(imageDataUrl);
      console.log(`Analysis complete: Gender - ${gender}, Description - ${description}`);

      // 4. Call makeCreatureSmile to get the styled image
      console.log("Calling AI to generate styled image... This may take a moment.");
      const newImageUrl = await makeCreatureSmile(imageDataUrl, religion, gender, description);

      if (newImageUrl) {
        // 5. Decode and save the new image
        const [meta, base64Data] = newImageUrl.split(',');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const outputPath = path.join(outputDir, `generated-${religion}.png`);
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`✅ Successfully generated and saved image to: ${outputPath}`);
      } else {
        console.error(`❌ Failed to generate image for ${religion}.`);
      }
    } catch (error) {
      console.error(`❌ An error occurred while processing ${religion}:`, error);
    } finally {
      // Clean up temporary PNG file
      if (fs.existsSync(tempPngPath)) {
        fs.unlinkSync(tempPngPath);
        console.log(`Cleaned up temporary file: ${tempPngPath}`);
      }
    }
  }

  // Clean up temporary directory
  fs.rmdirSync(tempDir, { recursive: true });
  console.log(`Cleaned up temporary directory: ${tempDir}`);

  console.log("\n--- Batch generation complete! ---");
  console.log(`Check the "${outputDir}" directory for your images.`);
}

// Run the script
batchGenerate();
