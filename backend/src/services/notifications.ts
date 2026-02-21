import { prisma } from '../server.js';

/**
 * Create a notification record in the database.
 * Used by various route handlers to trigger notifications on actions.
 */
export async function createNotification(
    userId: string,
    title: string,
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' = 'INFO',
    data?: Record<string, any>
) {
    return prisma.notification.create({
        data: {
            userId,
            title,
            message,
            type,
            data: data ? JSON.stringify(data) : null,
        },
    });
}

/**
 * Create notifications for all admins (e.g., when a client is flagged).
 */
export async function notifyAllAdmins(
    title: string,
    message: string,
    type: 'INFO' | 'WARNING' | 'SUCCESS' | 'ERROR' = 'WARNING',
    data?: Record<string, any>
) {
    const admins = await prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { id: true },
    });

    const notifications = admins.map((admin) => ({
        userId: admin.id,
        title,
        message,
        type,
        data: data ? JSON.stringify(data) : null,
    }));

    if (notifications.length > 0) {
        await prisma.notification.createMany({ data: notifications });
    }
}
