import express from 'express';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());

const dbPath = path.join(process.cwd(), 'refunds.json');

export interface RefundRequestRecord {
  id: string;
  email: string;
  orderId: string;
  motivo: string;
  details?: string;
  dataSolicitacao: number;
  status: 'aguardando_documentos' | 'pix_enviado' | 'reembolso_concluido';
  pix: string | null;
  feedbackFinal: string | null;
  dataEnvioPix: number | null;
  createdAt: string;
  updatedAt: string;
}

interface DatabaseSchema {
  refundRequests: Record<string, RefundRequestRecord>; // keyed by normalized email
}

function loadDatabase(): DatabaseSchema {
  try {
    if (fs.existsSync(dbPath)) {
      const raw = fs.readFileSync(dbPath, 'utf-8');
      const parsed = JSON.parse(raw);
      return { refundRequests: parsed.refundRequests || {} };
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  return { refundRequests: {} };
}

function saveDatabase(db: DatabaseSchema) {
  try {
    const tempPath = `${dbPath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(db, null, 2), 'utf-8');
    fs.renameSync(tempPath, dbPath);
  } catch (err) {
    console.error('Error saving database:', err);
  }
}

const db = loadDatabase();
console.log(`Database loaded with ${Object.keys(db.refundRequests).length} records from: ${dbPath}`);

const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000; // 5 days in milliseconds

function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

// API Routes

// 1. Server time
app.get('/api/time', (_req, res) => {
  res.json({ serverTime: Date.now() });
});

// 2. Lookup refund request by email
app.post('/api/refunds/lookup', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const cleanEmail = normalizeEmail(email);
    const request = db.refundRequests[cleanEmail] || null;
    const serverTime = Date.now();

    if (!request) {
      return res.json({
        found: false,
        serverTime,
      });
    }

    const elapsedMs = serverTime - request.dataSolicitacao;
    const remainingMs = Math.max(0, SEVENTY_TWO_HOURS_MS - elapsedMs);
    const canAdvanceToPix = request.status === 'aguardando_documentos' && elapsedMs >= SEVENTY_TWO_HOURS_MS;

    let elapsedPixMs = 0;
    let remainingPixMs = FIVE_DAYS_MS;
    let isPixCompleted = false;

    if (request.dataEnvioPix) {
      elapsedPixMs = serverTime - request.dataEnvioPix;
      remainingPixMs = Math.max(0, FIVE_DAYS_MS - elapsedPixMs);
      isPixCompleted = elapsedPixMs >= FIVE_DAYS_MS;
    }

    return res.json({
      found: true,
      request,
      serverTime,
      elapsedMs,
      remainingMs,
      canAdvanceToPix,
      elapsedPixMs,
      remainingPixMs,
      isPixCompleted,
    });
  } catch (err: any) {
    console.error('Error in /api/refunds/lookup:', err);
    return res.status(500).json({ error: 'Erro ao consultar solicitação.' });
  }
});

// 3. Create new refund request
app.post('/api/refunds/create', (req, res) => {
  try {
    const { email, orderId, motivo, details } = req.body;
    if (!email || !orderId || !motivo) {
      return res.status(400).json({ error: 'E-mail, número do pedido e motivo são obrigatórios.' });
    }

    const cleanEmail = normalizeEmail(email);
    if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }

    if (db.refundRequests[cleanEmail]) {
      return res.status(400).json({
        error: 'Já existe uma solicitação registrada para este e-mail.',
        request: db.refundRequests[cleanEmail],
      });
    }

    const id = crypto.randomUUID();
    const serverTime = Date.now();
    const nowIso = new Date(serverTime).toISOString();

    const newRecord: RefundRequestRecord = {
      id,
      email: cleanEmail,
      orderId: orderId.trim(),
      motivo: motivo.trim(),
      details: details ? details.trim() : '',
      dataSolicitacao: serverTime,
      status: 'aguardando_documentos',
      pix: null,
      feedbackFinal: null,
      dataEnvioPix: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    db.refundRequests[cleanEmail] = newRecord;
    saveDatabase(db);

    return res.json({
      success: true,
      request: newRecord,
      serverTime,
      remainingMs: SEVENTY_TWO_HOURS_MS,
    });
  } catch (err: any) {
    console.error('Error in /api/refunds/create:', err);
    return res.status(500).json({ error: 'Erro ao criar solicitação de reembolso.' });
  }
});

// 4. Finalize refund request (PIX & Feedback)
app.post('/api/refunds/finalize', (req, res) => {
  try {
    const { email, pix, feedbackFinal } = req.body;

    if (!email || !pix || !feedbackFinal) {
      return res.status(400).json({ error: 'E-mail, Chave PIX e Feedback são obrigatórios.' });
    }

    const cleanEmail = normalizeEmail(email);
    const record = db.refundRequests[cleanEmail];

    if (!record) {
      return res.status(404).json({ error: 'Solicitação não encontrada para este e-mail.' });
    }

    const serverTime = Date.now();
    const elapsedMs = serverTime - record.dataSolicitacao;

    if (elapsedMs < SEVENTY_TWO_HOURS_MS) {
      return res.status(403).json({
        error: 'O período de análise de 72 horas ainda não terminou.',
        remainingMs: SEVENTY_TWO_HOURS_MS - elapsedMs,
      });
    }

    const nowIso = new Date(serverTime).toISOString();

    record.pix = pix.trim();
    record.feedbackFinal = feedbackFinal.trim();
    record.dataEnvioPix = serverTime;
    record.status = 'pix_enviado';
    record.updatedAt = nowIso;

    saveDatabase(db);

    return res.json({
      success: true,
      request: record,
      serverTime,
      remainingPixMs: FIVE_DAYS_MS,
    });
  } catch (err: any) {
    console.error('Error in /api/refunds/finalize:', err);
    return res.status(500).json({ error: 'Erro ao finalizar solicitação.' });
  }
});

// 5. Dev Mode: Fast forward 72 Hours (Initial Stage)
app.post('/api/refunds/dev-simulate-72h', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const cleanEmail = normalizeEmail(email);
    const record = db.refundRequests[cleanEmail];

    if (!record) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    record.dataSolicitacao = Date.now() - (SEVENTY_TWO_HOURS_MS + 60000);
    record.updatedAt = new Date().toISOString();

    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Simulação concluída: 72 horas avançadas.',
      request: record,
      serverTime: Date.now(),
    });
  } catch (err: any) {
    console.error('Error in /api/refunds/dev-simulate-72h:', err);
    return res.status(500).json({ error: 'Erro ao simular tempo.' });
  }
});

// 6. Dev Mode: Fast forward 5 Days (PIX Processing Stage)
app.post('/api/refunds/dev-simulate-5days', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'E-mail é obrigatório.' });
    }

    const cleanEmail = normalizeEmail(email);
    const record = db.refundRequests[cleanEmail];

    if (!record) {
      return res.status(404).json({ error: 'Solicitação não encontrada.' });
    }

    record.dataEnvioPix = Date.now() - (FIVE_DAYS_MS + 60000);
    record.updatedAt = new Date().toISOString();

    saveDatabase(db);

    return res.json({
      success: true,
      message: 'Simulação concluída: 5 dias úteis avançados.',
      request: record,
      serverTime: Date.now(),
    });
  } catch (err: any) {
    console.error('Error in /api/refunds/dev-simulate-5days:', err);
    return res.status(500).json({ error: 'Erro ao simular tempo de PIX.' });
  }
});

app.listen(PORT, () => {
  console.log(`Express API Server listening on http://localhost:${PORT}`);
});
