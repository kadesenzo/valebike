import express from 'express';
import path from 'node:path';
import crypto from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { createServer as createViteServer } from 'vite';

const PORT = Number(process.env.PORT || 3000);
const ROOT = process.cwd();
const DB_PATH = path.join(ROOT, 'valebike.sqlite3');

const db = new DatabaseSync(DB_PATH);
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    email TEXT DEFAULT '',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS bikes (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    brand TEXT DEFAULT '',
    model TEXT DEFAULT '',
    category TEXT DEFAULT '',
    color TEXT DEFAULT '',
    serial TEXT DEFAULT '',
    notes TEXT DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS requests (
    id TEXT PRIMARY KEY,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    bike_id TEXT REFERENCES bikes(id) ON DELETE SET NULL,
    kind TEXT DEFAULT 'Orçamento de manutenção',
    message TEXT DEFAULT '',
    status TEXT DEFAULT 'Novo',
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS orders (
    id TEXT PRIMARY KEY,
    number INTEGER UNIQUE,
    customer_id TEXT REFERENCES customers(id) ON DELETE SET NULL,
    bike_id TEXT REFERENCES bikes(id) ON DELETE SET NULL,
    problem TEXT DEFAULT '',
    mechanic TEXT DEFAULT '',
    status TEXT DEFAULT 'Recebida',
    total REAL DEFAULT 0,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT DEFAULT '',
    category TEXT DEFAULT 'Geral',
    quantity INTEGER DEFAULT 0,
    min_quantity INTEGER DEFAULT 0,
    price REAL DEFAULT 0
  );
`);

function seedInitialData() {
  const countRow = db.prepare('SELECT COUNT(*) AS count FROM products').get() as { count: number };
  if (countRow.count === 0) {
    const insertProduct = db.prepare(
      'INSERT INTO products (id, name, sku, category, quantity, min_quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    insertProduct.run(crypto.randomUUID(), 'Câmara aro 29', 'CAM-29', 'Câmaras', 8, 4, 32.9);
    insertProduct.run(crypto.randomUUID(), 'Pastilha de freio Shimano', 'FRE-SH', 'Freios', 3, 5, 49.9);
    insertProduct.run(crypto.randomUUID(), 'Corrente 9 velocidades', 'COR-09', 'Transmissão', 12, 4, 89.9);
    insertProduct.run(crypto.randomUUID(), 'Capacete MTB Ventilado', 'CAP-01', 'Proteção', 5, 2, 189.0);
    insertProduct.run(crypto.randomUUID(), 'Lubrificante Seco Cera 120ml', 'LUB-CE', 'Manutenção', 2, 4, 44.5);
  }
}

seedInitialData();

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/summary', (_req, res) => {
    const requests = (
      db.prepare("SELECT COUNT(*) AS count FROM requests WHERE status = 'Novo'").get() as { count: number }
    ).count;
    const orders = (
      db
        .prepare("SELECT COUNT(*) AS count FROM orders WHERE status NOT IN ('Entregue', 'Cancelada')")
        .get() as { count: number }
    ).count;
    const customers = (
      db.prepare('SELECT COUNT(*) AS count FROM customers').get() as { count: number }
    ).count;
    const bikes = (
      db.prepare('SELECT COUNT(*) AS count FROM bikes').get() as { count: number }
    ).count;
    const low_stock = (
      db.prepare('SELECT COUNT(*) AS count FROM products WHERE quantity <= min_quantity').get() as { count: number }
    ).count;

    res.json({ requests, orders, customers, bikes, low_stock });
  });

  app.get('/api/requests', (_req, res) => {
    const rows = db.prepare('SELECT * FROM requests ORDER BY rowid DESC').all();
    res.json(rows);
  });

  app.get('/api/orders', (_req, res) => {
    const rows = db.prepare('SELECT * FROM orders ORDER BY rowid DESC').all();
    res.json(rows);
  });

  app.get('/api/customers', (_req, res) => {
    const rows = db.prepare('SELECT * FROM customers ORDER BY rowid DESC').all();
    res.json(rows);
  });

  app.get('/api/bikes', (_req, res) => {
    const rows = db.prepare('SELECT * FROM bikes ORDER BY rowid DESC').all();
    res.json(rows);
  });

  app.get('/api/products', (_req, res) => {
    const rows = db.prepare('SELECT * FROM products ORDER BY rowid DESC').all();
    res.json(rows);
  });

  app.post('/api/requests', (req, res) => {
    const body = req.body ?? {};
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    if (!name || !phone) {
      res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios.' });
      return;
    }

    const customerId = crypto.randomUUID();
    const bikeId = crypto.randomUUID();
    const requestId = crypto.randomUUID();

    const insertAll = () => {
      db.exec('BEGIN');
      try {
        db.prepare('INSERT INTO customers (id, name, phone, email) VALUES (?, ?, ?, ?)').run(
          customerId,
          name,
          phone,
          String(body.email ?? '').trim()
        );
        db.prepare(
          'INSERT INTO bikes (id, customer_id, brand, model, category) VALUES (?, ?, ?, ?, ?)'
        ).run(
          bikeId,
          customerId,
          String(body.brand ?? '').trim(),
          String(body.model ?? '').trim(),
          String(body.category ?? '').trim()
        );
        db.prepare(
          'INSERT INTO requests (id, customer_id, bike_id, kind, message) VALUES (?, ?, ?, ?, ?)'
        ).run(
          requestId,
          customerId,
          bikeId,
          String(body.kind ?? 'Orçamento de manutenção').trim(),
          String(body.message ?? '').trim()
        );
        db.exec('COMMIT');
      } catch (err) {
        db.exec('ROLLBACK');
        throw err;
      }
    };

    try {
      insertAll();
      res.status(201).json({ ok: true, id: requestId, customer_id: customerId, bike_id: bikeId });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erro ao registrar solicitação.' });
    }
  });

  app.post('/api/orders', (req, res) => {
    const body = req.body ?? {};
    const problem = String(body.problem ?? '').trim();
    if (!problem) {
      res.status(400).json({ error: 'Descreva o problema relatado para abrir a OS.' });
      return;
    }
    try {
      const nextNumRow = db
        .prepare('SELECT COALESCE(MAX(number), 1000) + 1 AS nextNumber FROM orders')
        .get() as { nextNumber: number };
      const id = crypto.randomUUID();
      const customerId = body.customer_id ? String(body.customer_id) : null;
      const bikeId = body.bike_id ? String(body.bike_id) : null;
      const total = Number.isFinite(Number(body.total)) ? Math.max(0, Number(body.total)) : 0;

      db.prepare(
        'INSERT INTO orders (id, number, customer_id, bike_id, problem, mechanic, status, total) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        id,
        nextNumRow.nextNumber,
        customerId,
        bikeId,
        problem,
        String(body.mechanic ?? '').trim(),
        String(body.status ?? 'Recebida').trim(),
        total
      );
      res.status(201).json({ ok: true, id, number: nextNumRow.nextNumber });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erro ao criar OS.' });
    }
  });

  app.post('/api/customers', (req, res) => {
    const body = req.body ?? {};
    const name = String(body.name ?? '').trim();
    if (!name) {
      res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
      return;
    }
    try {
      const id = crypto.randomUUID();
      db.prepare('INSERT INTO customers (id, name, phone, email) VALUES (?, ?, ?, ?)').run(
        id,
        name,
        String(body.phone ?? '').trim(),
        String(body.email ?? '').trim()
      );
      res.status(201).json({ ok: true, id });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erro ao cadastrar cliente.' });
    }
  });

  app.post('/api/bikes', (req, res) => {
    const body = req.body ?? {};
    const model = String(body.model ?? '').trim();
    const brand = String(body.brand ?? '').trim();
    if (!brand && !model) {
      res.status(400).json({ error: 'Informe a marca ou o modelo da bicicleta.' });
      return;
    }
    try {
      const id = crypto.randomUUID();
      const customerId = body.customer_id ? String(body.customer_id) : null;
      db.prepare(
        'INSERT INTO bikes (id, customer_id, brand, model, category, color, serial, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(
        id,
        customerId,
        brand,
        model,
        String(body.category ?? '').trim(),
        String(body.color ?? '').trim(),
        String(body.serial ?? '').trim(),
        String(body.notes ?? '').trim()
      );
      res.status(201).json({ ok: true, id });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erro ao cadastrar bicicleta.' });
    }
  });

  app.post('/api/products', (req, res) => {
    const body = req.body ?? {};
    const name = String(body.name ?? '').trim();
    if (!name) {
      res.status(400).json({ error: 'Nome do produto é obrigatório.' });
      return;
    }
    try {
      const id = crypto.randomUUID();
      const quantity = Math.max(0, Math.trunc(Number(body.quantity ?? 0) || 0));
      const minQuantity = Math.max(0, Math.trunc(Number(body.min_quantity ?? 0) || 0));
      const price = Math.max(0, Number(body.price ?? 0) || 0);

      db.prepare(
        'INSERT INTO products (id, name, sku, category, quantity, min_quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        id,
        name,
        String(body.sku ?? '').trim(),
        String(body.category ?? 'Geral').trim() || 'Geral',
        quantity,
        minQuantity,
        price
      );
      res.status(201).json({ ok: true, id });
    } catch (err) {
      res.status(400).json({ error: err instanceof Error ? err.message : 'Erro ao cadastrar produto.' });
    }
  });

  app.patch('/api/requests/:id', (req, res) => {
    const { id } = req.params;
    const status = String(req.body?.status ?? '').trim();
    if (!status) {
      res.status(400).json({ error: 'Status inválido.' });
      return;
    }
    const result = db.prepare('UPDATE requests SET status = ? WHERE id = ?').run(status, id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Solicitação não encontrada.' });
      return;
    }
    res.json({ ok: true });
  });

  app.patch('/api/orders/:id', (req, res) => {
    const { id } = req.params;
    const status = String(req.body?.status ?? '').trim();
    if (!status) {
      res.status(400).json({ error: 'Status inválido.' });
      return;
    }
    const result = db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      return;
    }
    res.json({ ok: true });
  });

  app.patch('/api/products/:id', (req, res) => {
    const { id } = req.params;
    const quantity = Math.max(0, Math.trunc(Number(req.body?.quantity ?? 0)));
    const result = db.prepare('UPDATE products SET quantity = ? WHERE id = ?').run(quantity, id);
    if (result.changes === 0) {
      res.status(404).json({ error: 'Produto não encontrado.' });
      return;
    }
    res.json({ ok: true });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(ROOT, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Vale Bike rodando em http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Falha ao iniciar o servidor:', err);
  process.exit(1);
});
