import express from 'express';
import crypto from 'crypto';

const app = express();
app.use(express.json());

// In-memory fallback database for Serverless Vercel environment
const refundRequests: Record<string, any> = {};
const SEVENTY_TWO_HOURS_MS = 72 * 60 * 60 * 1000;
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;

function normalizeEmail(email: string): string {
  return (email || '').trim().toLowerCase();
}

app.get('/api/time', (_req, res) => {
  res.json({ serverTime: Date.now() });
});

app.post('/api/refunds/lookup', (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ error: 'E-mail é obrigatório.' });

    const cleanEmail = normalizeEmail(email);
    const request = refundRequests[cleanEmail] || null;
    const serverTime = Date.now();

    if (!request) {
      return res.json({ found: false, serverTime });
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
    return res.status(500).json({ error: 'Erro ao consultar.' });
  }
});

app.post('/api/refunds/create', (req, res) => {
  try {
    const { email, orderId, motivo, details } = req.body;
    if (!email || !orderId || !motivo) {
      return res.status(400).json({ error: 'E-mail, número do pedido e motivo são obrigatórios.' });
    }

    const cleanEmail = normalizeEmail(email);
    if (refundRequests[cleanEmail]) {
      return res.status(400).json({ error: 'Já existe solicitação para este e-mail.', request: refundRequests[cleanEmail] });
    }

    const id = crypto.randomUUID();
    const serverTime = Date.now();
    const nowIso = new Date(serverTime).toISOString();

    const newRecord = {
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

    refundRequests[cleanEmail] = newRecord;

    return res.json({
      success: true,
      request: newRecord,
      serverTime,
      remainingMs: SEVENTY_TWO_HOURS_MS,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao criar solicitação.' });
  }
});

app.post('/api/refunds/finalize', (req, res) => {
  try {
    const { email, pix, feedbackFinal } = req.body;
    if (!email || !pix || !feedbackFinal) {
      return res.status(400).json({ error: 'E-mail, Chave PIX e Feedback são obrigatórios.' });
    }

    const cleanEmail = normalizeEmail(email);
    const record = refundRequests[cleanEmail];
    if (!record) return res.status(404).json({ error: 'Solicitação não encontrada.' });

    const serverTime = Date.now();
    const nowIso = new Date(serverTime).toISOString();

    record.pix = pix.trim();
    record.feedbackFinal = feedbackFinal.trim();
    record.dataEnvioPix = serverTime;
    record.status = 'pix_enviado';
    record.updatedAt = nowIso;

    return res.json({
      success: true,
      request: record,
      serverTime,
      remainingPixMs: FIVE_DAYS_MS,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Erro ao finalizar.' });
  }
});

app.post('/api/refunds/dev-simulate-72h', (req, res) => {
  const { email } = req.body;
  const cleanEmail = normalizeEmail(email);
  const record = refundRequests[cleanEmail];
  if (record) {
    record.dataSolicitacao = Date.now() - (SEVENTY_TWO_HOURS_MS + 60000);
    return res.json({ success: true, request: record, serverTime: Date.now() });
  }
  return res.status(404).json({ error: 'Não encontrado.' });
});

app.post('/api/refunds/dev-simulate-5days', (req, res) => {
  const { email } = req.body;
  const cleanEmail = normalizeEmail(email);
  const record = refundRequests[cleanEmail];
  if (record) {
    record.dataEnvioPix = Date.now() - (FIVE_DAYS_MS + 60000);
    return res.json({ success: true, request: record, serverTime: Date.now() });
  }
  return res.status(404).json({ error: 'Não encontrado.' });
});

export default app;
