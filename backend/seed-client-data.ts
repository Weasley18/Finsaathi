import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
    const clientId = 'cmlwbizw400068ziigc5v9mbi';
    
    // Check if client exists
    const client = await prisma.user.findUnique({ where: { id: clientId } });
    if (!client) {
        console.log('Client not found');
        return;
    }
    
    // Add some goals if none
    const goalsCount = await prisma.goal.count({ where: { userId: clientId } });
    if (goalsCount === 0) {
        await prisma.goal.createMany({
            data: [
                { userId: clientId, name: 'Emergency Fund', targetAmount: 100000, currentAmount: 25000, status: 'ACTIVE' },
                { userId: clientId, name: 'New Car', targetAmount: 500000, currentAmount: 150000, status: 'ACTIVE' }
            ]
        });
        console.log('Created mock goals');
    } else {
        console.log('Client already has goals');
    }

    // Add some transactions if none
    const txCount = await prisma.transaction.count({ where: { userId: clientId } });
    if (txCount === 0) {
        const transactions = [];
        const now = new Date();
        for (let i = 0; i < 6; i++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 15);
            transactions.push({ userId: clientId, amount: 60000, type: 'INCOME', category: 'Salary', date: monthDate });
            transactions.push({ userId: clientId, amount: 35000, type: 'EXPENSE', category: 'Food', date: monthDate });
        }
        await prisma.transaction.createMany({ data: transactions });
        console.log('Created mock transactions');
    } else {
        console.log('Client already has transactions');
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());
