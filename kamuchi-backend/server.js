require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();
const app = express();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir);
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadsDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});
const upload = multer({ storage: storage });

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadsDir));

// ==========================================

app.get('/api/clients', async (req, res) => {
    try {
        const clients = await prisma.client.findMany();
        res.json(clients);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/clients', async (req, res) => {
    try {
        const { reference, name, accessCode } = req.body;
        const newClient = await prisma.client.create({
            data: {
                reference,
                name,
                accessCode
            }
        });
        res.status(201).json(newClient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// IMPORTS API
// ==========================================

app.get('/api/imports', async (req, res) => {
    try {
        const imports = await prisma.importTracking.findMany({
            include: { client: true }
        });
        res.json(imports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/imports', async (req, res) => {
    try {
        const newImport = await prisma.importTracking.create({
            data: req.body
        });
        res.status(201).json(newImport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/imports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const updatedImport = await prisma.importTracking.update({
            where: { id: Number(id) },
            data: req.body
        });
        res.json(updatedImport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/imports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        // First, delete related chat messages to avoid foreign key constraints
        await prisma.chatMessage.deleteMany({
            where: { importId: Number(id) }
        });
        // Then delete the import
        const deletedImport = await prisma.importTracking.delete({
            where: { id: Number(id) }
        });
        res.json(deletedImport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// CHAT API
// ==========================================

app.get('/api/chat/:importId', async (req, res) => {
    const { importId } = req.params;
    try {
        const messages = await prisma.chatMessage.findMany({
            where: { importId: Number(importId) },
            orderBy: { timestamp: 'asc' }
        });
        res.json(messages);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/chat/:importId', upload.single('file'), async (req, res) => {
    const { importId } = req.params;
    const { senderType, text, type, fileType } = req.body;
    let fileName = null;

    if (req.file) {
        fileName = req.file.filename;
    }

    try {
        const newMessage = await prisma.chatMessage.create({
            data: {
                importId: Number(importId),
                senderType,
                text,
                type,
                fileType,
                fileName
            }
        });
        res.status(201).json(newMessage);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// SETUP & UTILS 
// ==========================================

app.post('/api/setup', async (req, res) => {
    try {
        const client = await prisma.client.upsert({
            where: { reference: 'CLI-1234' },
            update: {},
            create: {
                reference: 'CLI-1234',
                name: 'Kamuchi Prototype Client',
                accessCode: 'secret123'
            }
        });

        const sampleImport = await prisma.importTracking.create({
            data: {
                reference: 'CLI-1234',
                clientId: client.id,
                matricule: '1234-A-50',
                dateEmbarque: '2026-03-01',
                exportador: 'Acme Corp',
                destinateur: 'Kamuchi',
                location: 'Zone Franche',
                date: '2026-03-02',
                sortie: 'Port Tanger',
                tracteurImport: 'TR-999',
                dateLivraison: '2026-03-05',
                prixAchat: '5000',
                prixVente: '6500',
                dechargement: 'Casa',
                pesage: '100',
                visite: '50',
                fraisBad: '200',
                avisArrive: 'Yes',
                montantFacture: '5350',
                status: 'Started'
            }
        });

        await prisma.chatMessage.create({
            data: {
                importId: sampleImport.id,
                senderType: 'System',
                text: 'Chat initialized and connected to database.',
                type: 'text'
            }
        });

        res.json({ message: 'Database Seeded Successfully', client, sampleImport });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(5000, () => {
    console.log('Kamuchi Backend running on http://localhost:5000');
});
