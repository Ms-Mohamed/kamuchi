const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('JWT_SECRET environment variable is not set — server cannot start without it');

const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid or expired token.' });
    }
};

const adminMiddleware = (req, res, next) => {
    const allowedRoles = ['ADMIN', 'OPS_MANAGER', 'IMPORT_WORKER', 'EXPORT_WORKER'];
    if (req.user && allowedRoles.includes(req.user.role)) {
        next();
    } else {
        res.status(403).json({ error: 'Access denied. Admin privileges required.' });
    }
};

module.exports = { authMiddleware, adminMiddleware, JWT_SECRET };
