const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  console.log("--- Checking Clients ---");
  const clients = await prisma.client.findMany();
  console.log(JSON.stringify(clients, null, 2));

  console.log("\n--- Checking ImportTracking (Legacy) ---");
  const legacy = await prisma.importTracking.findMany();
  console.log(JSON.stringify(legacy, null, 2));

  console.log("\n--- Checking LogisticsImport (Enterprise) ---");
  const enterprise = await prisma.logisticsImport.findMany();
  console.log(JSON.stringify(enterprise, null, 2));

  console.log("\n--- Checking LogisticsDocument ---");
  const docs = await prisma.logisticsDocument.findMany();
  console.log(JSON.stringify(docs, null, 2));

  await prisma.$disconnect();
}

checkData();
