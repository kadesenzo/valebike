import express, { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

interface CustomerRecord {
  id: string;
  name: string;
  phone: string;
  email: string;
  created_at: string;
}

interface BikeRecord {
  id: string;
  customer_id: string | null;
  brand: string;
  model: string;
  category: string;
  color: string;
  serial: string;
  notes: string;
}

interface RequestRecord {
  id: string;
  customer_id: string;
  bike_id: string;
  kind: string;
  message: string;
  status: string;
  created_at: string;
}

interface OrderRecord {
  id: string;
  number: number;
  customer_id: string | null;
  bike_id: string | null;
  problem: string;
  mechanic: string;
  status: string;
  total: number;
  created_at: string;
}

interface ProductRecord {
  id: string;
  name: string;
  sku: string;
  category: string;
  quantity: number;
  min_quantity: number;
  price: number;
}

interface DatabaseState {
  customers: CustomerRecord[];
  bikes: BikeRecord[];
  requests: RequestRecord[];
  orders: OrderRecord[];
  products: ProductRecord[];
}

const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
const DATA_DIR = isServerless ? '/tmp' : process.cwd();
const DATA_FILE = path.join(DATA_DIR, 'valebike-data.json');

function defaultSeedState(): DatabaseState {
  return {
    customers: [],
    bikes: [],
    requests: [],
    orders: [],
    products: [
      {
        id: 'prod-cam-29',
        name: 'Câmara aro 29',
        sku: 'CAM-29',
        category: 'Câmaras',
        quantity: 8,
        min_quantity: 4,
        price: 32.9,
      },
      {
        id: 'prod-fre-sh',
        name: 'Pastilha de freio Shimano',
        sku: 'FRE-SH',
        category: 'Freios',
        quantity: 3,
        min_quantity: 5,
        price: 49.9,
      },
      {
        id: 'prod-cor-09',
        name: 'Corrente 9 velocidades',
        sku: 'COR-09',
        category: 'Transmissão',
        quantity: 12,
        min_quantity: 4,
        price: 89.9,
      },
      {
        id: 'prod-cap-01',
        name: 'Capacete MTB Ventilado',
        sku: 'CAP-01',
        category: 'Proteção',
        quantity: 5,
        min_quantity: 2,
        price: 189.0,
      },
      {
        id: 'prod-lub-ce',
        name: 'Lubrificante Seco Cera 120ml',
        sku: 'LUB-CE',
        category: 'Manutenção',
        quantity: 2,
        min_quantity: 4,
        price: 44.5,
      },
    ],
  };
}

let memoryState: DatabaseState | null = null;

function readState(): DatabaseState {
  if (memoryState) {
    return memoryState;
  }
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as Partial<DatabaseState>;
      memoryState = {
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        bikes: Array.isArray(parsed.bikes) ? parsed.bikes : [],
        requests: Array.isArray(parsed.requests) ? parsed.requests : [],
        orders: Array.isArray(parsed.orders) ? parsed.orders : [],
        products:
          Array.isArray(parsed.products) && parsed.products.length > 0
            ? parsed.products
            : defaultSeedState().products,
      };
      return memoryState;
    }
  } catch {
    // Fallback to initial seed state when filesystem cannot be read
  }

  memoryState = defaultSeedState();
  writeState(memoryState);
  return memoryState;
}

function writeState(state: DatabaseState): void {
  memoryState = state;
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch {
    // In restricted read-only environments, keep state in memory without crashing
  }
}

function nowIso(): string {
  return new Date().toISOString();
}

export function createApiRouter(): Router {
  const router = express.Router();
  router.use(express.json());

  router.get('/summary', (_req, res) => {
    const state = readState();
    const requests = state.requests.filter((r) => r.status === 'Novo').length;
    const orders = state.orders.filter(
      (o) => o.status !== 'Entregue' && o.status !== 'Cancelada'
    ).length;
    const customers = state.customers.length;
    const bikes = state.bikes.length;
    const low_stock = state.products.filter((p) => p.quantity <= p.min_quantity).length;

    res.json({ requests, orders, customers, bikes, low_stock });
  });

  router.get('/requests', (_req, res) => {
    const state = readState();
    res.json([...state.requests].reverse());
  });

  router.get('/orders', (_req, res) => {
    const state = readState();
    res.json([...state.orders].reverse());
  });

  router.get('/customers', (_req, res) => {
    const state = readState();
    res.json([...state.customers].reverse());
  });

  router.get('/bikes', (_req, res) => {
    const state = readState();
    res.json([...state.bikes].reverse());
  });

  router.get('/products', (_req, res) => {
    const state = readState();
    res.json([...state.products].reverse());
  });

  router.post('/requests', (req, res) => {
    const body = req.body ?? {};
    const name = String(body.name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    if (!name || !phone) {
      res.status(400).json({ error: 'Nome e WhatsApp são obrigatórios.' });
      return;
    }

    const state = readState();
    const createdAt = nowIso();
    const customerId = crypto.randomUUID();
    const bikeId = crypto.randomUUID();
    const requestId = crypto.randomUUID();

    state.customers.push({
      id: customerId,
      name,
      phone,
      email: String(body.email ?? '').trim(),
      created_at: createdAt,
    });

    state.bikes.push({
      id: bikeId,
      customer_id: customerId,
      brand: String(body.brand ?? '').trim(),
      model: String(body.model ?? '').trim(),
      category: String(body.category ?? '').trim(),
      color: '',
      serial: '',
      notes: '',
    });

    state.requests.push({
      id: requestId,
      customer_id: customerId,
      bike_id: bikeId,
      kind: String(body.kind ?? 'Orçamento de manutenção').trim(),
      message: String(body.message ?? '').trim(),
      status: 'Novo',
      created_at: createdAt,
    });

    writeState(state);
    res.status(201).json({ ok: true, id: requestId, customer_id: customerId, bike_id: bikeId });
  });

  router.post('/orders', (req, res) => {
    const body = req.body ?? {};
    const problem = String(body.problem ?? '').trim();
    if (!problem) {
      res.status(400).json({ error: 'Descreva o problema relatado para abrir a OS.' });
      return;
    }

    const state = readState();
    const maxNum = state.orders.reduce((max, o) => Math.max(max, o.number || 1000), 1000);
    const nextNumber = maxNum + 1;
    const id = crypto.randomUUID();
    const total = Number.isFinite(Number(body.total)) ? Math.max(0, Number(body.total)) : 0;

    state.orders.push({
      id,
      number: nextNumber,
      customer_id: body.customer_id ? String(body.customer_id) : null,
      bike_id: body.bike_id ? String(body.bike_id) : null,
      problem,
      mechanic: String(body.mechanic ?? '').trim(),
      status: String(body.status ?? 'Recebida').trim() || 'Recebida',
      total,
      created_at: nowIso(),
    });

    writeState(state);
    res.status(201).json({ ok: true, id, number: nextNumber });
  });

  router.post('/customers', (req, res) => {
    const body = req.body ?? {};
    const name = String(body.name ?? '').trim();
    if (!name) {
      res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
      return;
    }

    const state = readState();
    const id = crypto.randomUUID();
    state.customers.push({
      id,
      name,
      phone: String(body.phone ?? '').trim(),
      email: String(body.email ?? '').trim(),
      created_at: nowIso(),
    });

    writeState(state);
    res.status(201).json({ ok: true, id });
  });

  router.post('/bikes', (req, res) => {
    const body = req.body ?? {};
    const brand = String(body.brand ?? '').trim();
    const model = String(body.model ?? '').trim();
    if (!brand && !model) {
      res.status(400).json({ error: 'Informe a marca ou o modelo da bicicleta.' });
      return;
    }

    const state = readState();
    const id = crypto.randomUUID();
    state.bikes.push({
      id,
      customer_id: body.customer_id ? String(body.customer_id) : null,
      brand,
      model,
      category: String(body.category ?? '').trim(),
      color: String(body.color ?? '').trim(),
      serial: String(body.serial ?? '').trim(),
      notes: String(body.notes ?? '').trim(),
    });

    writeState(state);
    res.status(201).json({ ok: true, id });
  });

  router.post('/products', (req, res) => {
    const body = req.body ?? {};
    const name = String(body.name ?? '').trim();
    if (!name) {
      res.status(400).json({ error: 'Nome do produto é obrigatório.' });
      return;
    }

    const state = readState();
    const id = crypto.randomUUID();
    state.products.push({
      id,
      name,
      sku: String(body.sku ?? '').trim(),
      category: String(body.category ?? 'Geral').trim() || 'Geral',
      quantity: Math.max(0, Math.trunc(Number(body.quantity ?? 0) || 0)),
      min_quantity: Math.max(0, Math.trunc(Number(body.min_quantity ?? 0) || 0)),
      price: Math.max(0, Number(body.price ?? 0) || 0),
    });

    writeState(state);
    res.status(201).json({ ok: true, id });
  });

  router.patch('/requests/:id', (req, res) => {
    const { id } = req.params;
    const status = String(req.body?.status ?? '').trim();
    if (!status) {
      res.status(400).json({ error: 'Status inválido.' });
      return;
    }

    const state = readState();
    const item = state.requests.find((r) => r.id === id);
    if (!item) {
      res.status(404).json({ error: 'Solicitação não encontrada.' });
      return;
    }

    item.status = status;
    writeState(state);
    res.json({ ok: true });
  });

  router.patch('/orders/:id', (req, res) => {
    const { id } = req.params;
    const status = String(req.body?.status ?? '').trim();
    if (!status) {
      res.status(400).json({ error: 'Status inválido.' });
      return;
    }

    const state = readState();
    const item = state.orders.find((o) => o.id === id);
    if (!item) {
      res.status(404).json({ error: 'Ordem de serviço não encontrada.' });
      return;
    }

    item.status = status;
    writeState(state);
    res.json({ ok: true });
  });

  router.patch('/products/:id', (req, res) => {
    const { id } = req.params;
    const quantity = Math.max(0, Math.trunc(Number(req.body?.quantity ?? 0)));

    const state = readState();
    const item = state.products.find((p) => p.id === id);
    if (!item) {
      res.status(404).json({ error: 'Produto não encontrado.' });
      return;
    }

    item.quantity = quantity;
    writeState(state);
    res.json({ ok: true });
  });

  return router;
}
