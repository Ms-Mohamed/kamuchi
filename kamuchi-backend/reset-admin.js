const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
    const defaultPassword = 'admin123';
    const hashedPassword = await bcrypt.hash(defaultPassword, 10);

    await prisma.user.updateMany({
        where: {
            username: 'Admin'
        },
        data: {
            password: hashedPassword
        }
    });

    console.log(`Password for Admin reset to: ${defaultPassword}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
