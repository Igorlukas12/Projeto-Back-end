// Executado antes de cada arquivo de teste: banco em memória e pasta temporária de uploads.
const os = require('os');
const path = require('path');

process.env.NODE_ENV = 'test';
process.env.APP_URL = 'http://localhost:3000';
process.env.JWT_SECRET = 'test-secret';
process.env.UPLOAD_DIR = path.join(os.tmpdir(), `projeto-backend-uploads-${process.pid}`);
