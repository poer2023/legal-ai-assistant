const MAX_HISTORY_ITEMS = 20;

const sendJson = (response, statusCode, payload) => {
  if (typeof response.status === 'function' && typeof response.json === 'function') {
    response.status(statusCode).json(payload);
    return;
  }

  response.statusCode = statusCode;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.end(JSON.stringify(payload));
};

const readJsonBody = async (request) => {
  if (request.body && typeof request.body === 'object') return request.body;
  if (typeof request.body === 'string') return JSON.parse(request.body || '{}');

  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
};

const getSupabaseConfig = () => {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;

  if (!url || !key) return null;
  return { url: url.replace(/\/+$/, ''), key };
};

const supabaseFetch = async (path, init = {}) => {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error('缺少 Supabase 服务端环境变量');
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    const message = data?.message || data?.error || `Supabase 请求失败 (${response.status})`;
    throw new Error(message);
  }

  return data;
};

const toClientItem = (item) => ({
  id: item.id,
  title: item.title,
  prompt: item.prompt,
  createdAt: item.created_at,
  ...(item.answer_content
    ? {
        answer: {
          content: item.answer_content,
          model: item.answer_model || undefined,
          cachedAt: item.answer_cached_at || item.updated_at,
        },
      }
    : {}),
});

const normalizeText = (value) => typeof value === 'string' ? value.trim() : '';

const normalizeDate = (value) => {
  if (typeof value !== 'string') return new Date().toISOString();
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
};

const readHistoryItems = async () => {
  const fields = [
    'id',
    'title',
    'prompt',
    'created_at',
    'updated_at',
    'answer_content',
    'answer_model',
    'answer_cached_at',
  ].join(',');
  const rows = await supabaseFetch(
    `legal_chat_conversations?select=${fields}&order=updated_at.desc&limit=${MAX_HISTORY_ITEMS}`,
  );

  return Array.isArray(rows) ? rows.map(toClientItem) : [];
};

const upsertHistoryItem = async (payload) => {
  const id = normalizeText(payload.id);
  const prompt = normalizeText(payload.prompt);
  const title = normalizeText(payload.title) || '新会话';

  if (!id || !prompt) {
    const error = new Error('缺少 history id 或 prompt');
    error.statusCode = 400;
    throw error;
  }

  const answer = payload.answer && typeof payload.answer === 'object' ? payload.answer : null;
  const answerContent = normalizeText(answer?.content);
  const now = new Date().toISOString();

  const rows = await supabaseFetch('legal_chat_conversations?on_conflict=id', {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify({
      id,
      title,
      prompt,
      created_at: normalizeDate(payload.createdAt),
      updated_at: now,
      answer_content: answerContent || null,
      answer_model: normalizeText(answer?.model) || null,
      answer_cached_at: answerContent ? normalizeDate(answer?.cachedAt || now) : null,
    }),
  });

  return toClientItem(Array.isArray(rows) ? rows[0] : rows);
};

const deleteHistoryItem = async (id) => {
  const historyId = normalizeText(id);

  if (!historyId) {
    const error = new Error('缺少 history id');
    error.statusCode = 400;
    throw error;
  }

  await supabaseFetch(`legal_chat_conversations?id=eq.${encodeURIComponent(historyId)}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=minimal',
    },
  });
};

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      sendJson(response, 200, { items: await readHistoryItems() });
      return;
    }

    if (request.method === 'POST') {
      const body = await readJsonBody(request);
      sendJson(response, 200, { item: await upsertHistoryItem(body) });
      return;
    }

    if (request.method === 'DELETE') {
      const requestUrl = new URL(request.url || '/', 'http://localhost');
      await deleteHistoryItem(requestUrl.searchParams.get('id'));
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error instanceof Error ? error.message : '聊天历史持久化失败',
    });
  }
}
