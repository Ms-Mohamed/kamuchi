const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.importTracking.findUnique({where: {id: 19}}).then(r => console.log(JSON.stringify(r, null, 2))).finally(() => prisma.$disconnect());
