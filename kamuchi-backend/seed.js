const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding mock data for Logistics Imports & Exports...");

  // Insert mock Logistics Imports
  await prisma.logisticsImport.createMany({
    data: [
      {
        reference: "IMP-MOCK-001",
        clientName: "Acme Corp Logistics",
        dateEmbarquement: "2026-05-01",
        matriculeRemorque: "1234-A-50",
        matriculeTracteur: "TR-999-B",
        dateSortiePort: "2026-05-03",
        dateLivraison: "2026-05-04",
        trajet: "ALGECIRAS - Tanger MED - TFZ",
        montant: 2800,
        extras: "Changement de câble",
        status: "Not Started"
      },
      {
        reference: "IMP-MOCK-002",
        clientName: "Global Trade Inc",
        dateEmbarquement: "2026-04-20",
        matriculeRemorque: "9876-C-40",
        matriculeTracteur: "TR-111-Z",
        dateSortiePort: "2026-04-22",
        dateLivraison: "2026-04-22",
        trajet: "ALGECIRAS - Tanger MED - Casablanca",
        montant: 3500,
        extras: "",
        status: "Started"
      },
      {
        reference: "IMP-MOCK-003",
        clientName: "Tech Supply Co",
        dateEmbarquement: "2026-03-10",
        matriculeRemorque: "5555-D-10",
        matriculeTracteur: "TR-222-Y",
        dateSortiePort: "2026-03-12",
        dateLivraison: "2026-03-15",
        trajet: "ALGECIRAS - Tanger MED - Rabat",
        montant: 4800,
        extras: "Frais de réparation de pneu",
        status: "Completed"
      }
    ]
  });

  // Insert mock Logistics Exports
  await prisma.logisticsExport.createMany({
    data: [
      {
        reference: "EXP-MOCK-001",
        clientName: "Acme Corp Logistics",
        dateChargement: "2026-05-10",
        matriculeRemorque: "1234-A-50",
        chargement: "Usine TFZ",
        dechargement: "Port Tanger MED",
        tracteur: "TR-999-B",
        embarquementAvec: "Navire X",
        redCode: "RC-404",
        fraisSupp: "200 MAD",
        commentaires: "Urgent delivery",
        status: "Not Started"
      },
      {
        reference: "EXP-MOCK-002",
        clientName: "Euro Export LLC",
        dateChargement: "2026-04-25",
        matriculeRemorque: "4444-F-20",
        chargement: "Entrepôt Casablanca",
        dechargement: "Port Tanger MED",
        tracteur: "TR-333-X",
        embarquementAvec: "Navire Y",
        redCode: "RC-505",
        fraisSupp: "",
        commentaires: "",
        status: "Started"
      },
      {
        reference: "EXP-MOCK-003",
        clientName: "Tech Supply Co",
        dateChargement: "2026-03-20",
        matriculeRemorque: "5555-D-10",
        chargement: "Usine Kenitra",
        dechargement: "Port Tanger MED",
        tracteur: "TR-222-Y",
        embarquementAvec: "Navire Z",
        redCode: "RC-606",
        fraisSupp: "500 MAD",
        commentaires: "Retard au chargement",
        status: "Completed"
      }
    ]
  });

  console.log("Seeding complete!");
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
