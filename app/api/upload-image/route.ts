import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import { withRetry } from "@/lib/retry";
import axios from 'axios';

export async function POST(request: NextRequest) {
    if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
        return NextResponse.json({ message: "Server configuration error: Missing Pinata credentials." }, { status: 500 });
    }

    const fid = await isAuthenticated(request);
    if (fid instanceof NextResponse) {
        return fid;
    }

    try {
        const { imageData } = await request.json();

        if (!imageData) {
            return NextResponse.json({ message: "Missing image data" }, { status: 400 });
        }

        const pinataApiKey = process.env.PINATA_API_KEY!;
        const pinataSecretApiKey = process.env.PINATA_API_SECRET!;

        const imageBuffer = Buffer.from(imageData.split(",")[1], "base64");
        const imageBlob = new Blob([imageBuffer], { type: "image/png" });

        const form = new FormData();
        form.append("file", imageBlob, `Warplet_Generated_${fid}_${Date.now()}.png`);
        form.append("pinataMetadata", JSON.stringify({ name: `Warplet Generated Image for FID ${fid}` }));
        form.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

        const pinFileResponse = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", form, {
            headers: {
                'pinata_api_key': pinataApiKey,
                'pinata_secret_api_key': pinataSecretApiKey,
            },
        });

        const { IpfsHash } = pinFileResponse.data;
        // Use a public gateway or the dedicated one if available
        const publicUrl = `https://gateway.pinata.cloud/ipfs/${IpfsHash}`;

        return NextResponse.json({ url: publicUrl }, { status: 200 });

    } catch (error) {
        console.error("Error uploading image:", error);
        return NextResponse.json({ message: "Failed to upload image" }, { status: 500 });
    }
}
