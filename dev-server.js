'use strict';

// Servidor local sin dependencias. Reutiliza la misma función que Vercel.
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const handler = require('./api/aria');
const ROOT = __dirname;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.jpg': 'image/jpeg' };

function createLocalServer() {
  return http.createServer(async (req, res) => {
    res.status = code => { res.statusCode = code; return res; };
    res.json = value => { res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); };
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const url = new URL(req.url, 'http://localhost');
      if (url.pathname === '/api/aria') {
        if (req.method === 'POST') {
          const chunks = [];
          let size = 0;
          for await (const chunk of req) {
            size += chunk.length;
            if (size > 128 * 1024) return res.status(413).json({ error: 'La solicitud es demasiado grande.' });
            chunks.push(chunk);
          }
          req.body = Buffer.concat(chunks).toString('utf8');
        }
        return await handler(req, res);
      }
      if (!['GET', 'HEAD'].includes(req.method)) {
        res.setHeader('Allow', 'GET, HEAD');
        return res.status(405).json({ error: 'Método no permitido.' });
      }
      // Servir solo los recursos públicos; nunca .env, .git ni código de servidor.
      const name = url.pathname === '/' ? '/index.html' : url.pathname;
      if (!['/index.html', '/bg.jpg'].includes(name) && !/^\/(css|js)\/[a-zA-Z0-9_.-]+\.(css|js)$/.test(name))
        return res.status(404).json({ error: 'Archivo no encontrado.' });
      const data = await fs.readFile(path.join(ROOT, name.slice(1)));
      res.setHeader('Content-Type', MIME[path.extname(name)] || 'application/octet-stream');
      res.end(req.method === 'HEAD' ? undefined : data);
    } catch (err) {
      if (res.writableEnded) return;
      res.status(err.code === 'ENOENT' ? 404 : 500).json({ error: err.code === 'ENOENT' ? 'Archivo no encontrado.' : 'No se pudo procesar la solicitud local.' });
    }
  });
}

if (require.main === module) {
  try { process.loadEnvFile(path.join(ROOT, '.env.local')); }
  catch (err) {
    if (err.code !== 'ENOENT') {
      console.error('No se pudo cargar .env.local. Revisa su formato y utiliza Node.js 22 o posterior.');
      process.exit(1);
    }
  }
  const port = Number(process.env.PORT || 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT debe ser un número entre 1 y 65535.');
    process.exit(1);
  }
  const server = createLocalServer();
  server.on('error', err => {
    console.error(err.code === 'EADDRINUSE' ? `El puerto ${port} está ocupado. Cierra el servidor anterior o configura PORT.` : 'No se pudo iniciar el servidor local.');
    process.exitCode = 1;
  });
  server.listen(port, '127.0.0.1', () => {
    console.log(`ARIA local: http://localhost:${port}`);
    console.log(process.env.GEMINI_API_KEY?.trim() ? 'Clave de Gemini cargada. Las consultas requieren Internet.' : 'Falta GEMINI_API_KEY: agrégala a .env.local y reinicia el servidor para usar la IA.');
    console.log('Para detener: Ctrl+C');
  });
}

module.exports = { createLocalServer };
