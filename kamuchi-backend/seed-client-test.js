const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function seedClientTest() {
  console.log("Seeding Client Test Mock Data...");

  try {
    // 0. Cleanup old test data to prevent ID mismatch
    await prisma.logisticsDocument.deleteMany({
      where: {
        OR: [
          { originalName: { contains: 'Shipment_001' } },
          { originalName: { contains: 'Madrid' } }
        ]
      }
    });
    await prisma.importTracking.deleteMany({
      where: {
        OR: [
          { reference: 'CLI-TEST-001' },
          { reference: 'CLI-TEST-002' }
        ]
      }
    });

    // 1. Create a Test Client
    const client = await prisma.client.upsert({
      where: { reference: 'CLI-TEST-001' },
      update: {},
      create: {
        reference: 'CLI-TEST-001',
        name: 'Mediterranean Trade Co',
        accessCode: 'TEST-MAP'
      }
    });

    console.log(`Created Client: ${client.name} (Access Code: ${client.accessCode})`);

    // 2. Create an ImportTracking record for this client
    const shipment = await prisma.importTracking.create({
      data: {
        reference: client.reference,
        clientId: client.id,
        matricule: 'MOCK-SHIP-001',
        dateEmbarque: '2026-04-28',
        exportador: 'Iberia Steel',
        destinateur: 'Kamuchi Trans',
        location: 'Algeciras',
        date: '2026-04-29',
        sortie: 'Port Tanger Méditerranée',
        tracteurImport: 'TR-MOCK-01',
        dateLivraison: '2026-04-30',
        prixAchat: '2500',
        prixVente: '3500',
        dechargement: 'Tanger Free Zone',
        status: 'Started'
      }
    });

    console.log(`Created Shipment Tracking for ${client.reference}`);

    // 3. Create another test client for a different route
    const client2 = await prisma.client.upsert({
      where: { reference: 'CLI-TEST-002' },
      update: {},
      create: {
        reference: 'CLI-TEST-002',
        name: 'Euro Logistics S.A.',
        accessCode: 'TEST-MAP-2'
      }
    });

    await prisma.importTracking.create({
      data: {
        reference: client2.reference,
        clientId: client2.id,
        matricule: 'MOCK-SHIP-002',
        dateEmbarque: '2026-04-25',
        exportador: 'Madrid Auto Parts',
        destinateur: 'Kamuchi Trans',
        location: 'Madrid',
        date: '2026-04-26',
        sortie: 'Casablanca',
        status: 'Started'
      }
    });

    console.log(`Created Shipment Tracking for ${client2.reference} (TEST-MAP-2)`);

    // 4. Create mock documents for CLI-TEST-001
    await prisma.logisticsDocument.createMany({
      data: [
        {
          operationType: 'IMPORT',
          operationId: shipment.id,
          documentType: 'CMR',
          fileName: 'mock-cmr.pdf',
          originalName: 'CMR_Shipment_001.pdf'
        },
        {
          operationType: 'IMPORT',
          operationId: shipment.id,
          documentType: 'BL',
          fileName: 'mock-bl.pdf',
          originalName: 'Bill_of_Lading_Algeciras.pdf'
        }
      ]
    });

    // 5. Create mock documents for CLI-TEST-002
    await prisma.logisticsDocument.createMany({
      data: [
        {
          operationType: 'IMPORT',
          operationId: 2, // Assuming second record is ID 2
          documentType: 'DECLARATION',
          fileName: 'mock-dec.pdf',
          originalName: 'Customs_Declaration_Madrid.pdf'
        }
      ]
    });

    console.log("Mock Documents Seeded!");

    // 6. Add notifications
    await prisma.notification.createMany({
      data: [
        {
          role: 'CLIENT',
          title: 'Documents Available',
          message: 'Authenticated CMR and BL files have been uploaded to your vault.',
          type: 'SUCCESS'
        }
      ]
    });

    console.log("Seeding complete! Codes: TEST-MAP, TEST-MAP-2");

  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
  }
}

seedClientTest();
