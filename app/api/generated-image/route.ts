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
                hasMinted: existingImage.hasMinted,
            });
        }

        return NextResponse.json({ hasGenerated: false, imageUrl: null, hasMinted: false });
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
            create: { ownerFid: BigInt(fid), imageUrl, hasMinted: false },
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

export async function PATCH(request: NextRequest) {
    const fid = await isAuthenticated(request);
    if (fid instanceof NextResponse) {
        return fid;
    }

    try {
        await prisma.generatedImage.update({
            where: { ownerFid: BigInt(fid) },
            data: { hasMinted: true, updatedAt: new Date() },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Error marking as minted:", error);
        return NextResponse.json(
            { message: "Failed to mark as minted" },
            { status: 500 }
        );
    }
}

