const TABLE_NAME = 'legal_skills';

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

const normalizeText = (value) => typeof value === 'string' ? value.trim() : '';

const normalizeTags = (tags) => Array.isArray(tags)
  ? tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim())
  : [];

const normalizeFiles = (files) => Array.isArray(files)
  ? files.reduce((items, file) => {
      if (
        !file ||
        typeof file.id !== 'string' ||
        typeof file.name !== 'string' ||
        typeof file.path !== 'string' ||
        typeof file.content !== 'string'
      ) {
        return items;
      }

      items.push({
        id: file.id,
        name: file.name,
        path: file.path,
        type: ['markdown', 'typescript', 'json'].includes(file.type) ? file.type : 'markdown',
        content: file.content,
      });
      return items;
    }, [])
  : [];

const normalizeDate = (value) => {
  if (typeof value !== 'string') return new Date().toISOString();
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
};

const toClientSkill = (row) => ({
  id: row.id,
  name: row.name,
  description: row.description,
  category: row.category,
  routeName: row.route_name || 'chat',
  tags: Array.isArray(row.tags) ? row.tags : [],
  files: Array.isArray(row.files) ? row.files : [],
  source: 'custom',
  scope: row.scope === 'team' ? 'team' : 'personal',
  status: row.status === 'draft' ? 'draft' : 'active',
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastUsedAt: row.last_used_at || undefined,
  usageCount: typeof row.usage_count === 'number' ? row.usage_count : 0,
});

const toStorageRow = (payload) => {
  const id = normalizeText(payload.id);
  const name = normalizeText(payload.name);
  const description = normalizeText(payload.description);
  const files = normalizeFiles(payload.files);

  if (!id || !name || !description || !files.length) {
    const error = new Error('缺少技能 id、名称、描述或文件内容');
    error.statusCode = 400;
    throw error;
  }

  const now = new Date().toISOString();

  return {
    id,
    slug: id,
    name,
    description,
    category: normalizeText(payload.category) || '自建技能',
    route_name: normalizeText(payload.routeName) || 'chat',
    tags: normalizeTags(payload.tags),
    scope: payload.scope === 'team' ? 'team' : 'personal',
    source: 'custom',
    status: payload.status === 'draft' ? 'draft' : 'active',
    files,
    usage_count: Number.isFinite(payload.usageCount) ? payload.usageCount : 0,
    last_used_at: payload.lastUsedAt ? normalizeDate(payload.lastUsedAt) : null,
    created_at: payload.createdAt ? normalizeDate(payload.createdAt) : now,
    updated_at: now,
  };
};

const readSkills = async () => {
  const fields = [
    'id',
    'slug',
    'name',
    'description',
    'category',
    'route_name',
    'tags',
    'scope',
    'source',
    'status',
    'files',
    'usage_count',
    'last_used_at',
    'created_at',
    'updated_at',
  ].join(',');
  const rows = await supabaseFetch(
    `${TABLE_NAME}?select=${fields}&order=updated_at.desc`,
  );

  return Array.isArray(rows) ? rows.map(toClientSkill) : [];
};

const upsertSkill = async (payload) => {
  const rows = await supabaseFetch(`${TABLE_NAME}?on_conflict=id`, {
    method: 'POST',
    headers: {
      Prefer: 'resolution=merge-duplicates,return=representation',
    },
    body: JSON.stringify(toStorageRow(payload)),
  });

  return toClientSkill(Array.isArray(rows) ? rows[0] : rows);
};

const deleteSkill = async (id) => {
  const skillId = normalizeText(id);
  if (!skillId) {
    const error = new Error('缺少技能 id');
    error.statusCode = 400;
    throw error;
  }

  await supabaseFetch(`${TABLE_NAME}?id=eq.${encodeURIComponent(skillId)}`, {
    method: 'DELETE',
    headers: {
      Prefer: 'return=minimal',
    },
  });
};

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      sendJson(response, 200, { skills: await readSkills() });
      return;
    }

    if (request.method === 'POST' || request.method === 'PATCH') {
      const body = await readJsonBody(request);
      sendJson(response, 200, { skill: await upsertSkill(body) });
      return;
    }

    if (request.method === 'DELETE') {
      const requestUrl = new URL(request.url || '/', 'http://localhost');
      await deleteSkill(requestUrl.searchParams.get('id'));
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error instanceof Error ? error.message : '技能持久化失败',
    });
  }
}
