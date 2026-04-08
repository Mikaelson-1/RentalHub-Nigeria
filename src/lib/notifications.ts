import prisma from "@/lib/prisma";
import { NotificationType, Role } from "@prisma/client";

interface NotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  link?: string;
}

export async function notifyUser(input: NotificationInput): Promise<void> {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? "SYSTEM",
        link: input.link ?? null,
      },
    });
  } catch (error) {
    console.error("[NOTIFICATION CREATE ERROR]", error);
  }
}

export async function notifyUsers(inputs: NotificationInput[]): Promise<void> {
  if (inputs.length === 0) return;

  try {
    await prisma.notification.createMany({
      data: inputs.map((input) => ({
        userId: input.userId,
        title: input.title,
        message: input.message,
        type: input.type ?? "SYSTEM",
        link: input.link ?? null,
      })),
    });
  } catch (error) {
    console.error("[NOTIFICATION BULK CREATE ERROR]", error);
  }
}

export async function notifyRole(
  role: Role,
  title: string,
  message: string,
  type: NotificationType = "SYSTEM",
  link?: string,
): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      where: { role },
      select: { id: true },
    });

    await notifyUsers(
      users.map((user) => ({
        userId: user.id,
        title,
        message,
        type,
        link,
      })),
    );
  } catch (error) {
    console.error("[NOTIFICATION ROLE CREATE ERROR]", error);
  }
}

