import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "@/lib/auth";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
    const fid = await isAuthenticated(request);
    if (fid instanceof NextResponse) {
        return fid;
    }

    try {
        const existingImage = await prisma.generatedImage.findUnique({
            where: { ownerFid: BigInt(fid) },
        });

        if (existingImage) {
            return NextResponse.json({
                hasGenerated: true,
                imageUrl: existingImage.imageUrl,
            });
        }

        return NextResponse.json({ hasGenerated: false, imageUrl: null });
    } catch (error) {
        console.error("Error checking generated image:", error);
        return NextResponse.json(
            { message: "Failed to check generated image" },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const fid = await isAuthenticated(request);
    if (fid instanceof NextResponse) {
        return fid;
    }

    try {
        const { imageUrl } = await request.json();

        if (!imageUrl) {
            return NextResponse.json({ message: "Missing image URL" }, { status: 400 });
        }

        await prisma.generatedImage.upsert({
            where: { ownerFid: BigInt(fid) },
            update: { imageUrl, updatedAt: new Date() },
            create: { ownerFid: BigInt(fid), imageUrl },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error saving generated image:", error);
        return NextResponse.json(
            { message: "Failed to save generated image" },
            { status: 500 }
        );
    }
}
