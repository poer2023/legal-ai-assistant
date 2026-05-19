import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const TABLE_NAME = 'legal_templates';
const LOCAL_TEMPLATES_PATH = process.env.LEGAL_TEMPLATES_FILE
  || fileURLToPath(new URL('../.data/legal-templates.json', import.meta.url));

const canWriteLocalTemplates = () => process.env.VERCEL !== '1';

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
    const raw = await readFile(LOCAL_TEMPLATES_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    if (error && typeof error === 'object' && error.code === 'ENOENT') return [];
    throw error;
  }
};

const writeLocalRows = async (rows) => {
  if (!canWriteLocalTemplates()) {
    throw createStorageError('线上模板持久化需要 Supabase，不能写入 Vercel 只读文件系统');
  }

  await mkdir(dirname(LOCAL_TEMPLATES_PATH), { recursive: true });
  await writeFile(`${LOCAL_TEMPLATES_PATH}.tmp`, JSON.stringify(rows, null, 2), 'utf8');
  await rename(`${LOCAL_TEMPLATES_PATH}.tmp`, LOCAL_TEMPLATES_PATH);
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

const normalizeStringList = (value, limit = 20) => {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(
    value
      .filter((item) => typeof item === 'string' && item.trim())
      .map((item) => item.trim()),
  )).slice(0, limit);
};

const normalizeSection = (section) => {
  if (!section || typeof section !== 'object') return null;
  const title = normalizeText(section.title);
  if (!title) return null;

  const paragraphs = normalizeStringList(section.paragraphs, 20);
  const items = normalizeStringList(section.items, 20);
  const table = section.table && typeof section.table === 'object' ? section.table : null;
  const headers = normalizeStringList(table?.headers, 12);
  const rows = Array.isArray(table?.rows)
    ? table.rows
        .filter((row) => Array.isArray(row))
        .map((row) => row.map((cell) => normalizeText(cell)).filter(Boolean))
        .filter((row) => row.length)
    : [];

  return {
    title,
    ...(paragraphs.length ? { paragraphs } : {}),
    ...(items.length ? { items } : {}),
    ...(headers.length && rows.length ? { table: { headers, rows } } : {}),
  };
};

const normalizeSections = (sections) => Array.isArray(sections)
  ? sections.map(normalizeSection).filter(Boolean)
  : [];

const isPublishDestination = (destination) =>
  destination === 'group' || destination === 'team' || destination === 'public';

const normalizePublishDestinations = (destinations) => {
  const values = Array.isArray(destinations) ? destinations : [destinations];
  return Array.from(new Set(values.filter(isPublishDestination)));
};

const normalizeDate = (value) => {
  if (typeof value !== 'string') return new Date().toISOString();
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? new Date().toISOString() : new Date(timestamp).toISOString();
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
  };
};

const normalizeOriginalFile = (originalFile) => {
  if (!originalFile || typeof originalFile !== 'object') return null;
  const fileName = normalizeText(originalFile.fileName);
  const originalText = typeof originalFile.originalText === 'string' ? originalFile.originalText : '';
  if (!fileName || !originalText) return null;

  return {
    fileName,
    fileSize: Number.isFinite(originalFile.fileSize) ? Math.max(0, originalFile.fileSize) : 0,
    fileType: normalizeText(originalFile.fileType),
    originalText,
  };
};

const normalizeExtractionState = (value) =>
  value === 'reading' || value === 'analyzing' || value === 'done' || value === 'error' ? value : 'idle';

const normalizeTemplate = (payload) => {
  const template = payload?.template && typeof payload.template === 'object' ? payload.template : payload;
  const id = normalizeText(template?.id);
  const name = normalizeText(template?.name);
  const preview = normalizeText(template?.preview);

  if (!id || !name || !preview) {
    const error = new Error('缺少模板 id、名称或预览内容');
    error.statusCode = 400;
    throw error;
  }

  return {
    id,
    name,
    docType: normalizeText(template.docType) || '自定义模板',
    source: normalizeText(template.source) || '自建模板',
    applicableSkills: normalizeStringList(template.applicableSkills),
    agent: normalizeText(template.agent) || '模板助手',
    requiredFields: normalizeStringList(template.requiredFields),
    preview,
    routeName: normalizeText(template.routeName) || 'templates',
    tags: normalizeStringList(template.tags),
    updatedAt: normalizeText(template.updatedAt) || new Date().toISOString().slice(0, 10),
    documentSections: normalizeSections(template.documentSections),
  };
};

const toStorageRow = (payload, organizationId) => {
  const template = normalizeTemplate(payload);
  const id = getStorageId(organizationId, template.id);
  const publishDestinations = normalizePublishDestinations(payload.publishDestinations);
  const now = new Date().toISOString();

  return {
    id,
    name: template.name,
    doc_type: template.docType,
    source_label: template.source,
    applicable_skills: template.applicableSkills,
    agent: template.agent,
    required_fields: template.requiredFields,
    preview: template.preview,
    route_name: template.routeName,
    tags: template.tags,
    template_updated_at: template.updatedAt,
    document_sections: template.documentSections ?? [],
    original_file: normalizeOriginalFile(payload.originalFile),
    extraction_state: normalizeExtractionState(payload.extractionState),
    extraction_message: normalizeText(payload.extractionMessage),
    publish_destinations: publishDestinations,
    publish_settings: normalizePublishSettings(payload.publishSettings, publishDestinations),
    created_at: payload.createdAt ? normalizeDate(payload.createdAt) : now,
    updated_at: now,
  };
};

const toClientRecord = (row, organizationId) => {
  const template = {
    id: stripStorageId(organizationId, row.id),
    name: row.name,
    docType: row.doc_type || '自定义模板',
    source: row.source_label || '自建模板',
    applicableSkills: Array.isArray(row.applicable_skills) ? row.applicable_skills : [],
    agent: row.agent || '模板助手',
    requiredFields: Array.isArray(row.required_fields) ? row.required_fields : [],
    preview: row.preview,
    routeName: row.route_name || 'templates',
    tags: Array.isArray(row.tags) ? row.tags : [],
    updatedAt: row.template_updated_at || row.updated_at,
    documentSections: Array.isArray(row.document_sections) ? row.document_sections : [],
  };
  const publishDestinations = normalizePublishDestinations(row.publish_destinations);
  return {
    template,
    originalFile: normalizeOriginalFile(row.original_file) || undefined,
    extractionState: normalizeExtractionState(row.extraction_state),
    extractionMessage: row.extraction_message || '',
    publishDestinations,
    publishSettings: normalizePublishSettings(row.publish_settings, publishDestinations) || undefined,
  };
};

const readTemplates = async (organizationId) => {
  const localRows = (await readLocalRows()).filter((row) => isOrganizationRow(organizationId, row));
  const config = getSupabaseConfig();
  if (!config) {
    if (!canWriteLocalTemplates()) {
      throw createStorageError('线上模板持久化缺少 Supabase 服务端环境变量');
    }

    return sortRowsByUpdatedAt(localRows).map((row) => toClientRecord(row, organizationId));
  }

  const fields = [
    'id',
    'name',
    'doc_type',
    'source_label',
    'applicable_skills',
    'agent',
    'required_fields',
    'preview',
    'route_name',
    'tags',
    'template_updated_at',
    'document_sections',
    'original_file',
    'extraction_state',
    'extraction_message',
    'publish_destinations',
    'publish_settings',
    'created_at',
    'updated_at',
  ].join(',');
  const idFilter = encodeURIComponent(`${organizationId}:%`);
  let rows = [];
  try {
    rows = await supabaseFetch(
      `${TABLE_NAME}?select=${fields}&id=like.${idFilter}&order=updated_at.desc`,
    );
  } catch (error) {
    rows = localRows;
  }

  return mergeRowsByLatest(Array.isArray(rows) ? rows : [], localRows)
    .filter((row) => isOrganizationRow(organizationId, row))
    .map((row) => toClientRecord(row, organizationId));
};

const upsertTemplate = async (payload, organizationId) => {
  const row = toStorageRow(payload, organizationId);
  const config = getSupabaseConfig();
  if (!config) {
    if (!canWriteLocalTemplates()) {
      throw createStorageError('线上模板持久化缺少 Supabase 服务端环境变量');
    }

    const rows = mergeRowsByLatest([row], await readLocalRows());
    await writeLocalRows(rows);
    return toClientRecord(row, organizationId);
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
    if (!canWriteLocalTemplates()) {
      throw createStorageError('Supabase 模板持久化失败', error);
    }

    const nextRows = mergeRowsByLatest([row], await readLocalRows());
    await writeLocalRows(nextRows);
    return toClientRecord(row, organizationId);
  }

  if (canWriteLocalTemplates()) {
    await writeLocalRows(mergeRowsByLatest(Array.isArray(rows) ? rows : [rows || row], await readLocalRows())).catch(() => null);
  }
  return toClientRecord(Array.isArray(rows) ? rows[0] : rows || row, organizationId);
};

const deleteLocalTemplate = async (templateId) => {
  const rows = await readLocalRows();
  await writeLocalRows(rows.filter((item) => item.id !== templateId));
};

const deleteTemplate = async (id, organizationId) => {
  const templateId = getStorageId(organizationId, id);
  if (!templateId) {
    const error = new Error('缺少模板 id');
    error.statusCode = 400;
    throw error;
  }

  const config = getSupabaseConfig();
  if (!config) {
    if (!canWriteLocalTemplates()) {
      throw createStorageError('线上模板持久化缺少 Supabase 服务端环境变量');
    }

    await deleteLocalTemplate(templateId);
    return;
  }

  try {
    await supabaseFetch(`${TABLE_NAME}?id=eq.${encodeURIComponent(templateId)}`, {
      method: 'DELETE',
      headers: {
        Prefer: 'return=minimal',
      },
    });
  } catch (error) {
    if (!canWriteLocalTemplates()) {
      throw createStorageError('Supabase 模板删除失败', error);
    }
  }

  if (canWriteLocalTemplates()) {
    await deleteLocalTemplate(templateId).catch(() => null);
  }
};

export default async function handler(request, response) {
  try {
    if (request.method === 'GET') {
      const organizationId = getRequestOrganizationId(request);
      sendJson(response, 200, { records: await readTemplates(organizationId) });
      return;
    }

    if (request.method === 'POST' || request.method === 'PATCH') {
      const body = await readJsonBody(request);
      const organizationId = getRequestOrganizationId(request, body);
      sendJson(response, 200, { record: await upsertTemplate(body, organizationId) });
      return;
    }

    if (request.method === 'DELETE') {
      const requestUrl = new URL(request.url || '/', 'http://localhost');
      const organizationId = getRequestOrganizationId(request);
      await deleteTemplate(requestUrl.searchParams.get('id'), organizationId);
      sendJson(response, 200, { ok: true });
      return;
    }

    sendJson(response, 405, { error: 'Method not allowed' });
  } catch (error) {
    sendJson(response, error.statusCode || 500, {
      error: error instanceof Error ? error.message : '模板持久化失败',
    });
  }
}
