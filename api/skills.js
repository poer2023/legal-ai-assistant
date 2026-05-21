import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TABLE_NAME = 'legal_skills';
const LOCAL_SKILLS_PATH = process.env.LEGAL_SKILLS_FILE
  || fileURLToPath(new URL('../.data/legal-skills.json', import.meta.url));

const canWriteLocalSkills = () => process.env.VERCEL !== '1';

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
    const raw = await readFile(LOCAL_SKILLS_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return [];
    throw error;
  }
};

const writeLocalRows = async (rows) => {
  if (!canWriteLocalSkills()) {
    throw createStorageError('线上技能持久化需要 Supabase，不能写入 Vercel 只读文件系统');
  }

  await mkdir(dirname(LOCAL_SKILLS_PATH), { recursive: true });
  await writeFile(`${LOCAL_SKILLS_PATH}.tmp`, JSON.stringify(rows, null, 2), 'utf8');
  await rename(`${LOCAL_SKILLS_PATH}.tmp`, LOCAL_SKILLS_PATH);
};

const rowUpdatedAt = (row) => {
  const timestamp = Date.parse(row?.updated_at || row?.updatedAt || row?.created_at || row?.createdAt || '');
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

const upsertLocalRow = async (row) => {
  const rows = await readLocalRows();
  const nextRows = mergeRowsByLatest([row], rows);
  await writeLocalRows(nextRows);
  return nextRows.find((item) => item.id === row.id) || row;
};

const deleteLocalRow = async (skillId) => {
  const rows = await readLocalRows();
  await writeLocalRows(rows.filter((item) => item.id !== skillId));
};

const normalizeText = (value) => typeof value === 'string' ? value.trim() : '';

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

const normalizeTags = (tags) => Array.isArray(tags)
  ? tags.filter((tag) => typeof tag === 'string' && tag.trim()).map((tag) => tag.trim())
  : [];

const isPublishDestination = (destination) =>
  destination === 'group' || destination === 'team' || destination === 'public';

const normalizePublishDestinations = (destinations) => {
  const values = Array.isArray(destinations) ? destinations : [destinations];
  const normalized = values.filter(isPublishDestination);
  return Array.from(new Set(normalized.length ? normalized : ['team']));
};

const stripSkillFileRuntimeMarkers = (content) => String(content || '')
  .replace(/\r\n/g, '\n')
  .replace(/\n*\[\[skill-completion-selector-dismissed\]\]\s*$/g, '')
  .replace(/\n+技能已经创建完成[^\n]*(?:\n+\[\[skill-package:[^\n]*\]\])?\s*$/g, '')
  .replace(/\n+\[\[skill-package:[^\n]*\]\]\s*$/g, '')
  .replace(/\n+已生成技能草稿：[\s\S]*?等待系统解析 skill_json、写入技能库并完成读回校验。\s*$/g, '')
  .replace(/\n+系统校验：[\s\S]*$/g, '')
  .replace(/\s+$/g, '');

const normalizeStringList = (value, limit = 20) => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim()),
  )).slice(0, limit);
};

const normalizePublishSettings = (settings, fallbackDestinations) => {
  if (!settings || typeof settings !== 'object' || Array.isArray(settings)) {
    return null;
  }

  const pricing = settings.pricing === 'paid' ? 'paid' : 'free';
  return {
    destinations: normalizePublishDestinations(settings.destinations ?? fallbackDestinations),
    groupIds: normalizeStringList(settings.groupIds),
    pricing,
    price: pricing === 'paid' ? normalizeText(settings.price) : '',
    tags: normalizeStringList(settings.tags, 3),
    publishedAt: normalizeDate(settings.publishedAt),
    ...(settings.presentation && typeof settings.presentation === 'object'
      ? { presentation: settings.presentation }
      : {}),
  };
};

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
        type: ['markdown', 'typescript', 'json', 'yaml'].includes(file.type) ? file.type : 'markdown',
        content: stripSkillFileRuntimeMarkers(file.content),
      });
      return items;
    }, [])
  : [];

const normalizeDate = (value) => {
  if (typeof value !== 'string') return new Date().toISOString();
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
};

const toClientSkill = (row, organizationId) => ({
  id: stripStorageId(organizationId, row.id),
  name: row.name,
  description: row.description,
  category: row.category,
  routeName: row.route_name || 'chat',
  tags: Array.isArray(row.tags) ? row.tags : [],
  files: normalizeFiles(row.files),
  source: 'custom',
  scope: row.scope === 'team' ? 'team' : 'personal',
  status: row.status === 'draft' ? 'draft' : 'active',
  iconDataUrl: row.icon_data_url || row.publish_settings?.presentation?.iconDataUrl || undefined,
  publisherName: row.publisher_name || row.publish_settings?.presentation?.publisherName || undefined,
  publisherAvatarUrl: row.publisher_avatar_url || row.publish_settings?.presentation?.publisherAvatarUrl || undefined,
  useProfileIdentity: typeof row.use_profile_identity === 'boolean'
    ? row.use_profile_identity
    : row.publish_settings?.presentation?.useProfileIdentity ?? true,
  publishDestinations: normalizePublishDestinations(row.publish_destinations),
  publishSettings: normalizePublishSettings(row.publish_settings, row.publish_destinations) || undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  lastUsedAt: row.last_used_at || undefined,
  usageCount: typeof row.usage_count === 'number' ? row.usage_count : 0,
});

const withLocalPresentationFields = (row, payload) => ({
  ...row,
  icon_data_url: normalizeText(payload.iconDataUrl) || null,
  publisher_name: normalizeText(payload.publisherName) || null,
  publisher_avatar_url: normalizeText(payload.publisherAvatarUrl) || null,
  use_profile_identity: typeof payload.useProfileIdentity === 'boolean' ? payload.useProfileIdentity : true,
  publish_destinations: normalizePublishDestinations(payload.publishDestinations),
  publish_settings: createStoragePublishSettings(payload),
});

const createPresentationSettings = (payload) => {
  const iconDataUrl = normalizeText(payload.iconDataUrl);
  const publisherName = normalizeText(payload.publisherName);
  const publisherAvatarUrl = normalizeText(payload.publisherAvatarUrl);
  const useProfileIdentity = typeof payload.useProfileIdentity === 'boolean' ? payload.useProfileIdentity : true;

  if (!iconDataUrl && !publisherName && !publisherAvatarUrl && useProfileIdentity) return null;

  return {
    iconDataUrl,
    publisherName,
    publisherAvatarUrl,
    useProfileIdentity,
  };
};

const createStoragePublishSettings = (payload) => {
  const settings = normalizePublishSettings(payload.publishSettings, payload.publishDestinations);
  const presentation = createPresentationSettings(payload);

  if (!settings && !presentation) return null;

  return {
    ...(settings || {}),
    ...(presentation ? { presentation } : {}),
  };
};

const toStorageRow = (payload, organizationId) => {
  const id = getStorageId(organizationId, payload.id);
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

const readSkills = async (organizationId) => {
  const localRows = (await readLocalRows()).filter((row) => isOrganizationRow(organizationId, row));
  const config = getSupabaseConfig();
  if (!config) {
    return sortRowsByUpdatedAt(localRows).map((row) => toClientSkill(row, organizationId));
  }

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
  let rows = [];
  try {
    const idFilter = encodeURIComponent(`${organizationId}:%`);
    rows = await supabaseFetch(
      `${TABLE_NAME}?select=${fields}&id=like.${idFilter}&order=updated_at.desc`,
    );
  } catch (error) {
    rows = localRows;
  }

  return mergeRowsByLatest(Array.isArray(rows) ? rows : [], localRows)
    .filter((row) => isOrganizationRow(organizationId, row))
    .map((row) => toClientSkill(row, organizationId));
};

const upsertSkill = async (payload, organizationId) => {
  const row = toStorageRow(payload, organizationId);
  const config = getSupabaseConfig();
  if (!config) {
    if (!canWriteLocalSkills()) {
      throw createStorageError('线上技能持久化缺少 Supabase 服务端环境变量');
    }

    const localRow = await upsertLocalRow(withLocalPresentationFields(row, payload));
    return toClientSkill(localRow, organizationId);
  }

  let rows = null;
  try {
    rows = await supabaseFetch(`${TABLE_NAME}?on_conflict=id`, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=merge-duplicates,return=representation',
      },
      body: JSON.stringify(row),
    });
  } catch (error) {
    if (!canWriteLocalSkills()) {
      throw createStorageError('Supabase 技能持久化失败', error);
    }

    const localRow = await upsertLocalRow(withLocalPresentationFields(row, payload));
    return toClientSkill(localRow, organizationId);
  }

  const storedRow = Array.isArray(rows) ? rows[0] : rows;
  const clientRow = withLocalPresentationFields(storedRow || row, payload);
  if (canWriteLocalSkills()) {
    await upsertLocalRow(clientRow).catch(() => null);
  }
  return toClientSkill(clientRow, organizationId);
};

const deleteSkill = async (id, organizationId) => {
  const skillId = getStorageId(organizationId, id);
  if (!skillId) {
    const error = new Error('缺少技能 id');
    error.statusCode = 400;
    throw error;
  }

  const config = getSupabaseConfig();
  if (!config) {
    if (!canWriteLocalSkills()) {
      throw createStorageError('线上技能持久化缺少 Supabase 服务端环境变量');
    }

    await deleteLocalRow(skillId);
    return;
  }

  try {
    await supabaseFetch(`${TABLE_NAME}?id=eq.${encodeURIComponent(skillId)}`, {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    });
  } catch (error) {
    if (!canWriteLocalSkills()) {
      throw createStorageError('Supabase 技能删除失败', error);
    }

    // Keep deletion best-effort across both stores, even if one backend is unavailable.
  }

  if (canWriteLocalSkills()) {
    await deleteLocalRow(skillId).catch(() => null);
  }
};

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const organizationId = getRequestOrganizationId(request);
      sendJson(response, 200, { skills: await readSkills(organizationId) });
      return;
    }

    if (request.method === 'POST' || request.method === 'PATCH') {
      const body = await readJsonBody(request);
      const organizationId = getRequestOrganizationId(request, body);
      sendJson(response, 200, { skill: await upsertSkill(body, organizationId) });
      return;
    }

    if (request.method === 'DELETE') {
      const requestUrl = new URL(request.url || '/', 'http://localhost');
      const organizationId = getRequestOrganizationId(request);
      await deleteSkill(requestUrl.searchParams.get('id'), organizationId);
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
