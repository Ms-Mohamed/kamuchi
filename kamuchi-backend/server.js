require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware, adminMiddleware, JWT_SECRET } = require('./middleware/auth');

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
// HELPERS
// ==========================================

async function logAction(userId, username, action, entityType, entityId, details) {
    try {
        await prisma.auditLog.create({
            data: {
                userId: userId ? Number(userId) : null,
                username,
                action,
                entityType,
                entityId: Number(entityId),
                details: typeof details === 'string' ? details : JSON.stringify(details)
            }
        });
    } catch (error) {
        console.error('Failed to log action:', error);
    }
}

async function createNotification(role, title, message, type = 'INFO', userId = null) {
    try {
        await prisma.notification.create({
            data: { 
                role: role ? role.toUpperCase() : null, 
                title, 
                message, 
                type, 
                userId: userId ? Number(userId) : null 
            }
        });
    } catch (error) {
        console.error('Failed to create notification:', error);
    }
}

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
        const { reference, name, accessCode, paymentTerms } = req.body;
        const newClient = await prisma.client.create({
            data: {
                reference,
                name,
                accessCode,
                paymentTerms: paymentTerms ? parseInt(paymentTerms) : 30
            }
        });
        res.status(201).json(newClient);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { name, accessCode, paymentTerms } = req.body;
        const updated = await prisma.client.update({
            where: { id: Number(id) },
            data: {
                name,
                accessCode,
                paymentTerms: paymentTerms ? parseInt(paymentTerms) : undefined
            }
        });
        res.json(updated);
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

app.post('/api/imports', authMiddleware, async (req, res) => {
    try {
        const newImport = await prisma.importTracking.create({
            data: req.body
        });
        res.status(201).json(newImport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/imports/:id', authMiddleware, async (req, res) => {
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

app.delete('/api/imports/:id', authMiddleware, async (req, res) => {
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
// LOGISTICS IMPORTS API
// ==========================================

app.get('/api/logistics-imports', async (req, res) => {
    try {
        const imports = await prisma.logisticsImport.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(imports);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/logistics-imports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const operation = await prisma.logisticsImport.findUnique({
            where: { id: Number(id) }
        });
        if (!operation) return res.status(404).json({ error: 'Operation not found' });
        res.json(operation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/logistics-imports', authMiddleware, async (req, res) => {
    try {
        const newImport = await prisma.logisticsImport.create({
            data: req.body
        });
        
        await logAction(null, 'System', 'CREATE', 'IMPORT', newImport.id, newImport);
        await createNotification('ADMIN', 'New Import Operation', `Reference ${newImport.reference} has been created.`, 'INFO');
        
        res.status(201).json(newImport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/logistics-imports/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const oldImport = await prisma.logisticsImport.findUnique({ where: { id: Number(id) } });
        const updatedImport = await prisma.logisticsImport.update({
            where: { id: Number(id) },
            data: req.body
        });

        // Log if status changed
        if (oldImport.status !== updatedImport.status) {
            await logAction(null, 'System', 'STATUS_CHANGE', 'IMPORT', id, { from: oldImport.status, to: updatedImport.status });
            await createNotification('ADMIN', 'Import Status Updated', `Operation ${updatedImport.reference} is now ${updatedImport.status}.`, 'SUCCESS');
        } else {
            await logAction(null, 'System', 'UPDATE', 'IMPORT', id, req.body);
        }

        res.json(updatedImport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/logistics-imports/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const deletedImport = await prisma.logisticsImport.delete({
            where: { id: Number(id) }
        });
        
        await logAction(null, 'System', 'DELETE', 'IMPORT', id, deletedImport);
        
        res.json(deletedImport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/logistics-imports/:id/link-export', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const importOp = await prisma.logisticsImport.findUnique({ where: { id: Number(id) } });
        if (!importOp) return res.status(404).json({ error: 'Import operation not found' });

        // Use existing groupId or create new one
        const groupId = importOp.groupId || require('crypto').randomUUID();

        // Update Import with groupId if it doesn't have one
        if (!importOp.groupId) {
            await prisma.logisticsImport.update({
                where: { id: Number(id) },
                data: { groupId }
            });
        }

        // Create linked Export
        const newExport = await prisma.logisticsExport.create({
            data: {
                reference: importOp.reference,
                clientReference: importOp.clientReference,
                clientName: importOp.clientName,
                groupId: groupId,
                status: 'Not Started'
            }
        });

        await logAction(null, 'System', 'LINK_EXPORT', 'IMPORT', id, { groupId, exportId: newExport.id });
        
        res.status(201).json(newExport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// LOGISTICS EXPORTS API
// ==========================================

app.get('/api/logistics-exports', async (req, res) => {
    try {
        const exportsList = await prisma.logisticsExport.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(exportsList);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/logistics-exports/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const operation = await prisma.logisticsExport.findUnique({
            where: { id: Number(id) }
        });
        if (!operation) return res.status(404).json({ error: 'Operation not found' });
        res.json(operation);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/logistics-exports', authMiddleware, async (req, res) => {
    try {
        const newExport = await prisma.logisticsExport.create({
            data: req.body
        });
        
        await logAction(null, 'System', 'CREATE', 'EXPORT', newExport.id, newExport);
        await createNotification('ADMIN', 'New Export Operation', `Reference ${newExport.reference} has been created.`, 'INFO');

        res.status(201).json(newExport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/logistics-exports/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const oldExport = await prisma.logisticsExport.findUnique({ where: { id: Number(id) } });
        const updatedExport = await prisma.logisticsExport.update({
            where: { id: Number(id) },
            data: req.body
        });

        // Log if status changed
        if (oldExport.status !== updatedExport.status) {
            await logAction(null, 'System', 'STATUS_CHANGE', 'EXPORT', id, { from: oldExport.status, to: updatedExport.status });
            await createNotification('ADMIN', 'Export Status Updated', `Operation ${updatedExport.reference} is now ${updatedExport.status}.`, 'SUCCESS');
        } else {
            await logAction(null, 'System', 'UPDATE', 'EXPORT', id, req.body);
        }

        res.json(updatedExport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/logistics-exports/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const deletedExport = await prisma.logisticsExport.delete({
            where: { id: Number(id) }
        });
        
        await logAction(null, 'System', 'DELETE', 'EXPORT', id, deletedExport);

        res.json(deletedExport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/logistics-exports/:id/link-import', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const exportOp = await prisma.logisticsExport.findUnique({ where: { id: Number(id) } });
        if (!exportOp) return res.status(404).json({ error: 'Export operation not found' });

        // Use existing groupId or create new one
        const groupId = exportOp.groupId || require('crypto').randomUUID();

        // Update Export with groupId if it doesn't have one
        if (!exportOp.groupId) {
            await prisma.logisticsExport.update({
                where: { id: Number(id) },
                data: { groupId }
            });
        }

        // Create linked Import
        const newImport = await prisma.logisticsImport.create({
            data: {
                reference: exportOp.reference,
                clientReference: exportOp.clientReference,
                clientName: exportOp.clientName,
                groupId: groupId,
                status: 'Not Started'
            }
        });

        await logAction(null, 'System', 'LINK_IMPORT', 'EXPORT', id, { groupId, importId: newImport.id });
        
        res.status(201).json(newImport);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// LOGISTICS DOCUMENTS API
// ==========================================

app.get('/api/logistics-documents/:operationType/:operationId', async (req, res) => {
    const { operationType, operationId } = req.params;
    try {
        const documents = await prisma.logisticsDocument.findMany({
            where: {
                operationType: operationType.toUpperCase(),
                operationId: Number(operationId)
            },
            orderBy: { createdAt: 'desc' }
        });
        res.json(documents);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/logistics-documents/:operationType/:operationId/:documentType', authMiddleware, upload.single('file'), async (req, res) => {
    const { operationType, operationId, documentType } = req.params;
    
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    try {
        const newDoc = await prisma.logisticsDocument.create({
            data: {
                operationType: operationType.toUpperCase(),
                operationId: Number(operationId),
                documentType: documentType.toUpperCase(),
                fileName: req.file.filename,
                originalName: req.file.originalname
            }
        });

        await logAction(null, 'System', 'FILE_UPLOAD', 'DOCUMENT', newDoc.id, { operationType, operationId, originalName: req.file.originalname });
        
        res.status(201).json(newDoc);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/logistics-documents/:id', authMiddleware, async (req, res) => {
    const { id } = req.params;
    try {
        const doc = await prisma.logisticsDocument.findUnique({
            where: { id: Number(id) }
        });

        if (doc) {
            const filePath = path.join(uploadsDir, doc.fileName);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
            await prisma.logisticsDocument.delete({
                where: { id: Number(id) }
            });
        }
        res.json({ message: 'Document deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// AUTH API
// ==========================================

app.post('/api/auth/login', async (req, res) => {
    const { username, identifier, password } = req.body;
    const loginId = identifier || username;

    try {
        // 1. Try to find a system user (Admin/Worker)
        let user = await prisma.user.findUnique({ where: { username: loginId } });
        
        if (user) {
            let isMatch = false;
            let isRecovery = false;

            // Check standard password
            isMatch = await bcrypt.compare(password, user.password);

            // Check recovery code if not matched
            if (!isMatch && user.recoveryCode && user.recoveryCode === password && !user.recoveryCodeUsed) {
                isMatch = true;
                isRecovery = true;
            }

            if (!isMatch) {
                return res.status(401).json({ error: 'Invalid username or password' });
            }

            // If recovery code was used, mark it as used
            if (isRecovery) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { recoveryCodeUsed: true, recoveryCode: null }
                });
            }

            const token = jwt.sign(
                { userId: user.id, username: user.username, role: user.role },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.json({
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    role: user.role
                }
            });
        }

        // 2. Try to find a client
        const client = await prisma.client.findUnique({
            where: { reference: loginId }
        });

        if (client) {
            if (client.accessCode !== password) {
                return res.status(401).json({ error: 'Invalid reference or access code' });
            }

            const token = jwt.sign(
                { clientId: client.id, reference: client.reference, role: 'CLIENT' },
                JWT_SECRET,
                { expiresIn: '24h' }
            );

            return res.json({
                token,
                user: {
                    id: client.id,
                    username: client.name || client.reference,
                    role: 'CLIENT',
                    reference: client.reference
                }
            });
        }

        // 3. Neither found
        return res.status(401).json({ error: 'Invalid credentials' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
            select: { id: true, username: true, role: true }
        });
        if (!user) return res.status(404).json({ error: 'User not found' });
        res.json(user);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// USER MANAGEMENT API
// ==========================================

app.get('/api/users', async (req, res) => {
    try {
        const users = await prisma.user.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users', authMiddleware, adminMiddleware, async (req, res) => {
    const { username, role, password } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password || 'kamuchi123', 10);
        const newUser = await prisma.user.create({
            data: { 
                username, 
                role: role.toUpperCase(),
                password: hashedPassword
            }
        });
        res.status(201).json(newUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        const updatedUser = await prisma.user.update({
            where: { id: Number(id) },
            data: { role: role.toUpperCase() }
        });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.user.delete({
            where: { id: Number(id) }
        });
        res.json({ message: 'User deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/users/:id/generate-recovery', async (req, res) => {
    const { id } = req.params;
    try {
        const code = Math.floor(100000 + Math.random() * 900000).toString(); // 6 digit code
        const user = await prisma.user.update({
            where: { id: Number(id) },
            data: { 
                recoveryCode: code,
                recoveryCodeUsed: false
            }
        });
        res.json({ recoveryCode: code });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Seed initial Admin if none exists
async function seedAdmin() {
    const count = await prisma.user.count();
    if (count === 0) {
        const hashedPassword = await bcrypt.hash('admin123', 10);
        await prisma.user.create({
            data: { 
                username: 'Admin', 
                password: hashedPassword,
                role: 'ADMIN' 
            }
        });
        console.log('Seeded initial admin user (Admin/admin123)');

        // Role 1: Imports Only
        const importPass = await bcrypt.hash('import123', 10);
        await prisma.user.create({
            data: { username: 'ImportWorker', password: importPass, role: 'IMPORT_WORKER' }
        });

        // Role 2: Exports Only
        const exportPass = await bcrypt.hash('export123', 10);
        await prisma.user.create({
            data: { username: 'ExportWorker', password: exportPass, role: 'EXPORT_WORKER' }
        });

        // Role 3: Operations Manager
        const opsPass = await bcrypt.hash('ops123', 10);
        await prisma.user.create({
            data: { username: 'OpsManager', password: opsPass, role: 'OPS_MANAGER' }
        });

        console.log('Seeded specialized worker users');
    }
}
seedAdmin();

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
// NOTIFICATIONS API
// ==========================================

app.get('/api/notifications', async (req, res) => {
    const { role, userId } = req.query;
    try {
        const where = { isRead: false };
        if (role) where.role = role.toUpperCase();
        if (userId) where.userId = Number(userId);

        const notifications = await prisma.notification.findMany({
            where,
            orderBy: { createdAt: 'desc' },
            take: 20
        });
        res.json(notifications);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/notifications/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
        await prisma.notification.update({
            where: { id: Number(id) },
            data: { isRead: true }
        });
        res.json({ message: 'Notification marked as read' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/notifications/clear', async (req, res) => {
    const { role, userId } = req.query;
    try {
        const where = {};
        if (role) where.role = role.toUpperCase();
        if (userId) where.userId = Number(userId);

        await prisma.notification.updateMany({
            where,
            data: { isRead: true }
        });
        res.json({ message: 'All notifications cleared' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// AUDIT LOGS API
// ==========================================

app.get('/api/audit-logs', async (req, res) => {
    try {
        const logs = await prisma.auditLog.findMany({
            orderBy: { createdAt: 'desc' },
            take: 100
        });
        res.json(logs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// FOURNISSEUR API
// ==========================================

app.get('/api/fournisseurs', async (req, res) => {
    try {
        const fournisseurs = await prisma.fournisseur.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(fournisseurs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/fournisseurs', async (req, res) => {
    try {
        const newFournisseur = await prisma.fournisseur.create({
            data: req.body
        });
        await logAction(null, 'System', 'CREATE', 'FOURNISSEUR', newFournisseur.id, newFournisseur);
        res.status(201).json(newFournisseur);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/fournisseurs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const updated = await prisma.fournisseur.update({
            where: { id: Number(id) },
            data: req.body
        });
        await logAction(null, 'System', 'UPDATE', 'FOURNISSEUR', id, req.body);
        res.json(updated);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/fournisseurs/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const deleted = await prisma.fournisseur.delete({
            where: { id: Number(id) }
        });
        await logAction(null, 'System', 'DELETE', 'FOURNISSEUR', id, deleted);
        res.json(deleted);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// SUPPLIER API
// ==========================================

app.get('/api/suppliers', async (req, res) => {
    try {
        const suppliers = await prisma.supplier.findMany({
            orderBy: { name: 'asc' }
        });
        res.json(suppliers);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/suppliers', async (req, res) => {
    const { name } = req.body;
    try {
        const newSupplier = await prisma.supplier.create({
            data: { name }
        });
        res.status(201).json(newSupplier);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/backup', (req, res) => {
    const dbPath = path.join(__dirname, 'prisma', 'dev.db');
    if (fs.existsSync(dbPath)) {
        res.download(dbPath, 'kamuchi_backup.db');
    } else {
        res.status(404).json({ error: 'Database file not found' });
    }
});

// ==========================================
// SETUP & UTILS 
// ==========================================

app.post('/api/setup', async (req, res) => {
    try {
        // 1. Create multiple clients
        const clientsData = [
            { reference: 'CLI-A001', name: 'Global Logistics Corp', accessCode: 'logistics123' },
            { reference: 'CLI-B202', name: 'Mediterranean Trade Co', accessCode: 'trade456' },
            { reference: 'CLI-C303', name: 'Atlas Express', accessCode: 'atlas789' },
            { reference: 'CLI-D404', name: 'Nordic Trans-Continental', accessCode: 'nordic321' },
            { reference: 'CLI-E505', name: 'Sunset Shipping Lines', accessCode: 'sunset654' }
        ];

        const createdClients = [];
        for (const clientData of clientsData) {
            const client = await prisma.client.upsert({
                where: { reference: clientData.reference },
                update: {},
                create: clientData
            });
            createdClients.push(client);
        }

        // 2. Create multiple imports for each client
        const statuses = ['Not Started', 'Started', 'Completed'];
        const locations = ['Port Tanger Méditerranée', 'Zone Franche Tanger', 'Port Casablanca', 'Dépôt Safi', 'Terminal Agadir'];
        const exporters = ['Acme Corp International', 'GMBH Steel', 'Al-Wahid Textiles', 'Oceanic Foods S.A.', 'TechGlobal Components'];

        const importsToCreate = [];
        
        // Create 15 mock imports
        for (let i = 0; i < 15; i++) {
            const client = createdClients[i % createdClients.length];
            const status = statuses[i % statuses.length];
            const refDate = (i % 28) + 1;
            
            const importData = {
                reference: client.reference,
                clientId: client.id,
                matricule: `${2000 + i}-W-${50 + i}`,
                dateEmbarque: `2026-03-${refDate.toString().padStart(2, '0')}`,
                exportador: exporters[i % exporters.length],
                destinateur: 'Kamuchi Trans',
                location: locations[i % locations.length],
                date: `2026-03-${(refDate + 1).toString().padStart(2, '0')}`,
                sortie: locations[(i + 1) % locations.length],
                tracteurImport: `TR-${300 + i}`,
                dateLivraison: `2026-03-${(refDate + 4).toString().padStart(2, '0')}`,
                prixAchat: (5000 + i * 100).toString(),
                prixVente: (6500 + i * 100).toString(),
                dechargement: 'Warehouse A',
                pesage: (100 + i).toString(),
                visite: (50 + i).toString(),
                fraisBad: (200 + i).toString(),
                avisArrive: i % 2 === 0 ? 'Yes' : 'No',
                montantFacture: (5350 + i * 100).toString(),
                status: status
            };
            
            const newImport = await prisma.importTracking.create({
                data: importData
            });
            
            // Add initial chat message
            await prisma.chatMessage.create({
                data: {
                    importId: newImport.id,
                    senderType: 'System',
                    text: `Tracking session initialized for reference ${client.reference}. Status set to ${status}.`,
                    type: 'text'
                }
            });
            
            importsToCreate.push(newImport);
        }

        // 3. Create mock Logistics Imports and Exports
        for (let i = 0; i < 5; i++) {
            const client = createdClients[i % createdClients.length];
            
            // Create Logistics Import
            await prisma.logisticsImport.create({
                data: {
                    reference: client.reference,
                    clientName: client.name || client.reference,
                    dateEmbarquement: `2026-04-${(10 + i).toString().padStart(2, '0')}`,
                    matriculeRemorque: `REM-${1000 + i}`,
                    matriculeTracteur: `TRAC-${500 + i}`,
                    trajet: 'Tanger-Casablanca',
                    portOfEntry: i % 2 === 0 ? 'Motril' : 'Algeciras',
                    status: i % 3 === 0 ? 'Completed' : 'Started'
                }
            });

            // Create Logistics Export
            await prisma.logisticsExport.create({
                data: {
                    reference: client.reference,
                    clientName: client.name || client.reference,
                    dateChargement: `2026-04-${(15 + i).toString().padStart(2, '0')}`,
                    matriculeRemorque: `EXP-${2000 + i}`,
                    chargement: 'Fruits & Vegetables',
                    dechargement: 'Madrid Logistics Center',
                    tracteur: `TRAC-EXP-${700 + i}`,
                    embarquementAvec: 'FRS Ferry',
                    portOfEntry: i % 2 === 0 ? 'Algeciras' : 'Motril',
                    status: i % 2 === 0 ? 'Completed' : 'Not Started'
                }
            });
        }

        res.json({ 
            message: 'Database Seeded Successfully with 5 Clients, 15 Tracking Imports, and 10 Logistics Operations', 
            clientsCreated: createdClients.length,
            trackingImportsCreated: importsToCreate.length,
            logisticsCreated: 10
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- Invoice Endpoints ---
app.get('/api/invoices', async (req, res) => {
    try {
        const invoices = await prisma.invoice.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(invoices);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/invoices', async (req, res) => {
    try {
        const { invoiceNumber, clientName, reference, dateFacture, montant, status, operationType, operationId, paymentDetail, paymentDate } = req.body;
        
        // Check if invoice already exists for this operation
        const existing = await prisma.invoice.findFirst({
            where: { operationId: operationId.toString(), operationType }
        });
        if (existing) return res.json(existing);

        // Fetch client to get payment terms
        const client = await prisma.client.findUnique({
            where: { reference: reference }
        });
        const terms = client ? client.paymentTerms : 30; // Default to 30 if client not found

        // Calculate Due Date
        let dueDate = null;
        if (dateFacture) {
            const date = new Date(dateFacture);
            date.setDate(date.getDate() + terms);
            dueDate = date.toISOString().split('T')[0];
        }

        const invoice = await prisma.invoice.create({
            data: { 
                invoiceNumber, 
                clientName, 
                reference, 
                dateFacture, 
                montant: parseFloat(montant), 
                status: status || 'Unpaid', 
                operationType, 
                operationId: operationId.toString(),
                paymentDetail,
                paymentDate,
                dueDate
            }
        });
        res.status(201).json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/invoices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { status, paymentDetail, paymentDate, paymentType } = req.body;
        const invoice = await prisma.invoice.update({
            where: { id: parseInt(id) },
            data: { status, paymentDetail, paymentDate, paymentType }
        });
        res.json(invoice);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/invoices/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.invoice.delete({ where: { id: parseInt(id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// TRACTEURS
// ==========================================

app.get('/api/tracteurs', async (req, res) => {
    try {
        const tracteurs = await prisma.tracteur.findMany({
            orderBy: { createdAt: 'desc' }
        });
        res.json(tracteurs);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/tracteurs', async (req, res) => {
    try {
        const data = req.body;
        // Convert string fields to Float if needed, though they should be sent as numbers
        const floatFields = ['autres', 'autoroute', 'gasoil', 'deplacement', 'salaire', 'lavage', 'huil', 'reparation', 'traite', 'amende', 'prix'];
        floatFields.forEach(f => {
            if (data[f] !== undefined && data[f] !== null) {
                data[f] = parseFloat(data[f]) || null;
            }
        });
        const tracteur = await prisma.tracteur.create({ data });
        res.status(201).json(tracteur);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.put('/api/tracteurs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.body;
        const floatFields = ['autres', 'autoroute', 'gasoil', 'deplacement', 'salaire', 'lavage', 'huil', 'reparation', 'traite', 'amende', 'prix'];
        floatFields.forEach(f => {
            if (data[f] !== undefined && data[f] !== null) {
                data[f] = parseFloat(data[f]) || null;
            }
        });
        const tracteur = await prisma.tracteur.update({
            where: { id: parseInt(id) },
            data
        });
        res.json(tracteur);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.delete('/api/tracteurs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await prisma.tracteur.delete({ where: { id: parseInt(id) } });
        res.status(204).send();
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// ANALYTICS & DASHBOARD STATS
// ==========================================
app.get('/api/analytics/financials', async (req, res) => {
    try {
        // 1. Revenue (Paid Invoices)
        const paidInvoices = await prisma.invoice.findMany({ where: { status: 'Paid' }});
        const totalRevenue = paidInvoices.reduce((acc, inv) => acc + (inv.montant || 0), 0);

        // 2. Unpaid Invoices
        const unpaidInvoices = await prisma.invoice.findMany({ where: { status: 'Unpaid' }});
        const totalUnpaid = unpaidInvoices.reduce((acc, inv) => acc + (inv.montant || 0), 0);

        // 3. Tracteur Expenses
        const tracteurs = await prisma.tracteur.findMany();
        const tracteurExpenses = tracteurs.reduce((acc, t) => {
            return acc + 
                (t.autres || 0) + (t.autoroute || 0) + (t.gasoil || 0) + 
                (t.deplacement || 0) + (t.salaire || 0) + (t.lavage || 0) + 
                (t.huil || 0) + (t.reparation || 0) + (t.traite || 0) + (t.amende || 0);
        }, 0);

        // 4. Fournisseur Expenses
        const fournisseurs = await prisma.fournisseur.findMany();
        const fournisseurExpenses = fournisseurs.reduce((acc, f) => acc + (f.montant || 0), 0);

        const totalExpenses = tracteurExpenses + fournisseurExpenses;
        const netProfit = totalRevenue - totalExpenses;

        res.json({
            totalRevenue,
            totalUnpaid,
            totalExpenses,
            tracteurExpenses,
            fournisseurExpenses,
            netProfit
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ==========================================
// STATIC FRONTEND SERVING (Production)
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));
app.use((req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(5000, '0.0.0.0', () => {
    console.log('Kamuchi Backend running on port 5000 (accessible on local network)');
});
