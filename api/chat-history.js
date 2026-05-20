import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_HISTORY_ITEMS = 20;
const LOCAL_HISTORY_PATH = process.env.LEGAL_CHAT_HISTORY_FILE
  || fileURLToPath(new URL('../.data/chat-history.json', import.meta.url));

const canWriteLocalHistory = () => process.env.VERCEL !== '1';

const createStorageError = (message, cause = null) => {
  const error = new Error(cause instanceof Error ? `${message}：${cause.message}` : message);
  error.statusCode = 500;
  return error;
};

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

const readLocalRows = async () => {
  try {
    const raw = await readFile(LOCAL_HISTORY_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return [];
    throw error;
  }
};

const writeLocalRows = async (rows) => {
  if (!canWriteLocalHistory()) {
    throw createStorageError('线上聊天历史持久化需要 Supabase，不能写入 Vercel 只读文件系统');
  }

  await mkdir(dirname(LOCAL_HISTORY_PATH), { recursive: true });
  await writeFile(`${LOCAL_HISTORY_PATH}.tmp`, JSON.stringify(rows, null, 2), 'utf8');
  await rename(`${LOCAL_HISTORY_PATH}.tmp`, LOCAL_HISTORY_PATH);
};

const rowUpdatedAt = (row) => {
  const timestamp = Date.parse(row?.updated_at || row?.created_at || '');
  return Number.isNaN(timestamp) ? 0 : timestamp;
};

const sortRowsByUpdatedAt = (rows) =>
  [...rows].sort((left, right) => rowUpdatedAt(right) - rowUpdatedAt(left));

const mergeRowsByLatest = (...rowSets) => {
  const rowsById = new Map();

  rowSets.flat().forEach((row) => {
    if (!row || typeof row.id !== 'string' || !row.id.trim()) return;

    const existing = rowsById.get(row.id);
    if (!existing || rowUpdatedAt(row) >= rowUpdatedAt(existing)) {
      rowsById.set(row.id, row);
    }
  });

  return sortRowsByUpdatedAt([...rowsById.values()]);
};

const toClientItem = (item) => ({
  id: item.id,
  title: item.title,
  prompt: item.prompt,
  createdAt: item.created_at,
  ...(item.pinned === true ? { pinned: true } : {}),
  ...(item.answer_content
    ? {
        answer: {
          content: item.answer_content,
          model: item.answer_model || undefined,
          cachedAt: item.answer_cached_at || item.updated_at,
          createdSkillId: item.answer_created_skill_id || undefined,
          thinkingContent: item.answer_thinking_content || undefined,
        },
      }
    : {}),
});

const normalizeText = (value) => typeof value === 'string' ? value.trim() : '';
const isSkillCreatorPrompt = (prompt) => /\/skill-creator\b/i.test(prompt);
const hasCompletedSkillCreatorAnswer = (content) =>
  /技能已经创建完成|\[\[skill-package:|<skill_json>|技能完整度校验通过|已保存为个人草稿|已整理成一个可预览的技能包/i.test(content || '');

const normalizeOrganizationId = (value) => {
  const organizationId = normalizeText(value);
  if (/^[a-zA-Z0-9_-]{1,80}$/.test(organizationId)) return organizationId;
  return 'default';
};

const getRequestOrganizationId = (request, body = null) => {
  const requestUrl = new URL(request.url || '/', 'http://localhost');
  return normalizeOrganizationId(body?.organizationId || body?.orgId || requestUrl.searchParams.get('orgId'));
};

const getStorageId = (organizationId, id) => {
  const normalizedId = normalizeText(id);
  if (!normalizedId) return '';
  const prefix = `${organizationId}:`;
  return normalizedId.startsWith(prefix) ? normalizedId : `${prefix}${normalizedId}`;
};

const stripStorageId = (organizationId, id) => {
  const prefix = `${organizationId}:`;
  return typeof id === 'string' && id.startsWith(prefix) ? id.slice(prefix.length) : id;
};

const isOrganizationRow = (organizationId, row) =>
  typeof row?.id === 'string' && row.id.startsWith(`${organizationId}:`);

const toOrganizationClientItem = (organizationId, item) => ({
  ...toClientItem(item),
  id: stripStorageId(organizationId, item.id),
  organizationId,
});

const normalizeDate = (value) => {
  if (typeof value !== 'string') return new Date().toISOString();
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
};

const readHistoryItems = async (organizationId) => {
  const localRows = (await readLocalRows()).filter((row) => isOrganizationRow(organizationId, row));
  const config = getSupabaseConfig();
  if (!config) {
    if (!canWriteLocalHistory()) {
      throw createStorageError('线上聊天历史持久化缺少 Supabase 服务端环境变量');
    }

    return sortRowsByUpdatedAt(localRows).slice(0, MAX_HISTORY_ITEMS).map((row) =>
      toOrganizationClientItem(organizationId, row)
    );
  }

  const fields = [
    'id',
    'title',
    'prompt',
    'pinned',
    'created_at',
    'updated_at',
    'answer_content',
    'answer_model',
    'answer_cached_at',
    'answer_created_skill_id',
    'answer_thinking_content',
  ].join(',');
  const idFilter = encodeURIComponent(`${organizationId}:%`);
  let rows = [];
  try {
    rows = await supabaseFetch(
      `legal_chat_conversations?select=${fields}&id=like.${idFilter}&order=updated_at.desc&limit=${MAX_HISTORY_ITEMS}`,
    );
  } catch (error) {
    rows = localRows;
  }

  return mergeRowsByLatest(Array.isArray(rows) ? rows : [], localRows)
    .filter((row) => isOrganizationRow(organizationId, row))
    .slice(0, MAX_HISTORY_ITEMS)
    .map((row) => toOrganizationClientItem(organizationId, row));
};

const upsertHistoryItem = async (payload, organizationId) => {
  const id = getStorageId(organizationId, payload.id);
  const prompt = normalizeText(payload.prompt);
  const title = normalizeText(payload.title) || '新会话';

  if (!id || !prompt) {
    const error = new Error('缺少 history id 或 prompt');
    error.statusCode = 400;
    throw error;
  }

  const answer = payload.answer && typeof payload.answer === 'object' ? payload.answer : null;
  const answerContent = normalizeText(answer?.content);
  const answerCreatedSkillId = isSkillCreatorPrompt(prompt) && !hasCompletedSkillCreatorAnswer(answerContent)
    ? ''
    : normalizeText(answer?.createdSkillId);
  const now = new Date().toISOString();
  const row = {
    id,
    title,
    prompt,
    pinned: payload.pinned === true,
    created_at: normalizeDate(payload.createdAt),
    updated_at: now,
    answer_content: answerContent || null,
    answer_model: normalizeText(answer?.model) || null,
    answer_cached_at: answerContent ? normalizeDate(answer?.cachedAt || now) : null,
    answer_created_skill_id: answerCreatedSkillId || null,
    answer_thinking_content: normalizeText(answer?.thinkingContent) || null,
  };
  const config = getSupabaseConfig();

  if (!config) {
    if (!canWriteLocalHistory()) {
      throw createStorageError('线上聊天历史持久化缺少 Supabase 服务端环境变量');
    }

    const rows = mergeRowsByLatest([row], await readLocalRows());
    await writeLocalRows(rows);
    return toOrganizationClientItem(organizationId, row);
  }

  let rows = null;
  try {
    rows = await supabaseFetch('legal_chat_conversations?on_conflict=id', {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(row),
    });
  } catch (error) {
    if (!canWriteLocalHistory()) {
      throw createStorageError('Supabase 聊天历史持久化失败', error);
    }

    const nextRows = mergeRowsByLatest([row], await readLocalRows());
    await writeLocalRows(nextRows);
    return toOrganizationClientItem(organizationId, row);
  }

  if (canWriteLocalHistory()) {
    await writeLocalRows(mergeRowsByLatest(Array.isArray(rows) ? rows : [rows || row], await readLocalRows())).catch(() => null);
  }

  return toOrganizationClientItem(organizationId, Array.isArray(rows) ? rows[0] : rows || row);
};

const deleteLocalHistoryItem = async (historyId) => {
  const rows = await readLocalRows();
  await writeLocalRows(rows.filter((item) => item.id !== historyId));
};

const deleteHistoryItem = async (id, organizationId) => {
  const historyId = getStorageId(organizationId, id);

  if (!historyId) {
    const error = new Error('缺少 history id');
    error.statusCode = 400;
    throw error;
  }

  const config = getSupabaseConfig();
  if (!config) {
    if (!canWriteLocalHistory()) {
      throw createStorageError('线上聊天历史持久化缺少 Supabase 服务端环境变量');
    }

    await deleteLocalHistoryItem(historyId);
    return;
  }

  try {
    await supabaseFetch(`legal_chat_conversations?id=eq.${encodeURIComponent(historyId)}`, {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    });
  } catch (error) {
    if (!canWriteLocalHistory()) {
      throw createStorageError('Supabase 聊天历史删除失败', error);
    }
  }

  if (canWriteLocalHistory()) {
    await deleteLocalHistoryItem(historyId).catch(() => null);
  }
};

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const organizationId = getRequestOrganizationId(request);
      sendJson(response, 200, { items: await readHistoryItems(organizationId) });
      return;
    }

    if (request.method === 'POST') {
      const body = await readJsonBody(request);
      const organizationId = getRequestOrganizationId(request, body);
      sendJson(response, 200, { item: await upsertHistoryItem(body, organizationId) });
      return;
    }

    if (request.method === 'DELETE') {
      const requestUrl = new URL(request.url || '/', 'http://localhost');
      const organizationId = getRequestOrganizationId(request);
      await deleteHistoryItem(requestUrl.searchParams.get('id'), organizationId);
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
