import http from 'node:http';
import { config } from './config.js';
import { AuditController } from './controllers/auditController.js';

const parseJsonBody = (req) => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(new Error('JSON malformado en el cuerpo de la solicitud'));
      }
    });
    req.on('error', reject);
  });
};

const sendJson = (res, statusCode, data) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(data, null, 2));
};

export const createServer = () => {
  return http.createServer(async (req, res) => {
    const { method, url } = req;

    // CORS básico para integración
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    try {
      if (method === 'GET' && url === '/health') {
        sendJson(res, 200, {
          status: 'UP',
          service: 'Auditoria Verification Backend',
          version: '1.0.0',
          schemaVersion: config.supportedSchemaVersion,
          timestamp: new Date().toISOString(),
        });
        return;
      }

      if (method === 'POST' && url === '/api/v1/evidence/verify') {
        const body = await parseJsonBody(req);
        if (!body.manifest) {
          sendJson(res, 400, { error: 'Se requiere el campo "manifest" en el cuerpo' });
          return;
        }

        const report = AuditController.verifyBatch({
          manifestData: body.manifest,
          filesMap: body.filesBase64
            ? Object.fromEntries(
                Object.entries(body.filesBase64).map(([k, v]) => [k, Buffer.from(v, 'base64')])
              )
            : {},
        });

        sendJson(res, 200, report);
        return;
      }

      if (method === 'POST' && url === '/api/v1/evidence/sync') {
        // Punto de extensión para futura sincronización en la nube (SDD §9)
        const body = await parseJsonBody(req);
        if (!body.manifest) {
          sendJson(res, 400, { error: 'Se requiere el campo "manifest" para sincronización' });
          return;
        }

        const report = AuditController.verifyBatch({ manifestData: body.manifest });
        sendJson(res, 200, {
          synced: true,
          confirmationCode: report.confirmationCode,
          message: 'Lote de evidencias recibido e indexado satisfactoriamente.',
        });
        return;
      }

      sendJson(res, 404, { error: 'Ruta no encontrada' });
    } catch (err) {
      sendJson(res, 500, { error: err.message });
    }
  });
};

if (process.env.NODE_ENV !== 'test') {
  const server = createServer();
  server.listen(config.port, config.host, () => {
    console.log(`🚀 Auditoria Backend corriendo en http://${config.host}:${config.port}`);
  });
}

