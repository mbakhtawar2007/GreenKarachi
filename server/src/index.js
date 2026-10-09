"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const node_net_1 = __importDefault(require("node:net"));
const auth_1 = __importDefault(require("./routes/auth"));
const env_1 = require("./config/env");
const app = (0, express_1.default)();
const preferredPort = Number(process.env.PORT ?? process.env.SERVER_PORT ?? env_1.config.PORT);
const allowedOrigins = env_1.config.CORS_ORIGIN.split(',').map((origin) => origin.trim());
const getAvailablePort = (candidatePort) => new Promise((resolve, reject) => {
    const tester = node_net_1.default.createServer();
    tester.once('error', (error) => {
        if (error.code === 'EADDRINUSE') {
            resolve(getAvailablePort(candidatePort + 1));
            return;
        }
        reject(error);
    });
    tester.once('listening', () => {
        const address = tester.address();
        const port = typeof address === 'object' && address ? address.port : candidatePort;
        tester.close(() => resolve(port));
    });
    tester.listen(candidatePort, '0.0.0.0');
});
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: (origin, callback) => callback(null, !origin || allowedOrigins.includes(origin)),
    credentials: true
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        message: 'GreenKarachi API is healthy'
    });
});
app.use('/api/auth', auth_1.default);
app.get('/', (req, res) => {
    res.json({
        name: 'GreenKarachi API',
        version: '0.0.1',
        description: 'B2B plant marketplace backend',
        health: '/api/health',
        auth: '/api/auth'
    });
});
app.use((error, req, res, _next) => {
    console.error('Unhandled API error:', error);
    res.status(500).json({ message: 'Internal server error.' });
});
const startServer = async () => {
    const PORT = await getAvailablePort(preferredPort);
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Health check: http://localhost:${PORT}/api/health`);
    });
};
startServer().catch((error) => {
    console.error('Failed to start GreenKarachi server:', error);
    process.exit(1);
});
exports.default = app;
