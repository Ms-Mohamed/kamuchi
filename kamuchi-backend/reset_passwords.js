const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const defaultPassword = 'password123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.updateMany({
        where: {
            username: { in: ['ImportWorker', 'ExportWorker'] }
        },
        data: {
            password: hashedPassword
        }
    });

    console.log(`Passwords for ImportWorker and ExportWorker reset to: ${defaultPassword}`);
}

main().finally(() => prisma.$disconnect());
