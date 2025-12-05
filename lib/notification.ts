import type { MiniAppNotificationDetails } from "@farcaster/miniapp-sdk";
import prisma from '@/lib/prisma';
import { withRetry } from "./retry";

export async function getUserNotificationDetails(
  fid: number
): Promise<MiniAppNotificationDetails | null> {
  try {
    const user = await withRetry(() => prisma.user.findUnique({
      where: {
        fid: BigInt(fid),
      },
      select: {
        notificationToken: true,
      },
    }));

    if (!user || !user.notificationToken) {
      return null;
    }

    return JSON.parse(user.notificationToken) as MiniAppNotificationDetails;
  } catch (error) {
    console.error("Failed to get user notification details:", error);
    return null; // Return null on error to prevent crashes
  }
}

export async function setUserNotificationDetails(
  fid: number,
  notificationDetails: MiniAppNotificationDetails
): Promise<void> {
  try {
    const tokenString = JSON.stringify(notificationDetails);

    await withRetry(() => prisma.user.update({
      where: {
        fid: BigInt(fid),
      },
      data: {
        notificationToken: tokenString,
      },
    }));
  } catch (error) {
    console.error("Failed to set user notification details:", error);
  }
}

export async function deleteUserNotificationDetails(
  fid: number
): Promise<void> {
  try {
    await prisma.user.update({
      where: {
        fid: BigInt(fid),
      },
      data: {
        notificationToken: null,
      },
    });
  } catch (error: any) {
    if (error.code !== 'P2025') {
        console.error("Failed to delete user notification details:", error);
    }
  }
}