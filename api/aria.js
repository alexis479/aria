'use strict';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/';
const PROMPTS = {
  estudio: 'Eres ARIA, un asistente educativo boliviano. Explica en español de forma clara, didáctica y breve. Usa ejemplos y reconoce cuando no sabes algo.',
  investigar: 'Eres ARIA en modo Investigar. Responde directamente con una explicación completa en español de entre 350 y 600 palabras cuando el tema lo requiera. Organiza el contenido con subtítulos breves: introducción, aspectos principales, aplicaciones o ejemplos, limitaciones y conclusión. Evita saludos largos, anuncios de que vas a investigar y títulos grandilocuentes. Termina la explicación dentro de esa extensión. No inventes fuentes, enlaces ni datos actuales y no afirmes haber buscado en Internet. Si te piden actualidad, aclara que no tienes búsqueda web en tiempo real.',
  debate: 'Eres ARIA en modo Debate. Ayuda a contrastar ideas con argumentos y evidencia. Pide que el usuario justifique su postura, mantén el respeto y corrige errores. Responde en español.',
};
const WRITING_RULES = 'Escribe en español con ortografía, tildes, concordancia y puntuación correctas. Antes de entregar la respuesta, revisa su redacción. Usa las formas normativas, por ejemplo matemáticas, no matematikas. No imites los errores ortográficos ni las abreviaturas de la pregunta, salvo que el usuario pida analizar o citar literalmente un texto. Usa un tono natural, claro y adecuado para una explicación escolar. No pongas comillas alrededor de palabras comunes, conceptos, títulos, ejemplos ni analogías solo para destacarlos. Reserva las comillas para citas textuales, títulos que realmente las requieran o explicaciones lingüísticas. Evita adornos y énfasis repetitivos. Conserva los nombres propios, fórmulas y fragmentos de código tal como corresponda.';
function systemPrompt(mode) { return PROMPTS[mode] + ' ' + WRITING_RULES; }
let modelCache = null;

class ServiceError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

function providerError(status, data) {
  const reasons = (data.error?.details || []).map(d => d.reason || '').join(' ');
  if (status === 401 || status === 403 || reasons.includes('API_KEY_INVALID'))
    return new ServiceError(503, 'La conexión de ARIA necesita que el administrador revise la clave y sus permisos en el servidor.');
  if (status === 429)
    return new ServiceError(429, 'ARIA alcanzó temporalmente el límite de consultas. Intenta de nuevo más tarde.');
  return new ServiceError(502, 'El servicio de IA no pudo completar la consulta. Intenta de nuevo.');
}

async function google(path, key, signal, body, timeoutMs = 7000) {
  const attempt = new AbortController();
  const abort = () => attempt.abort();
  signal.addEventListener('abort', abort, { once: true });
  if (signal.aborted) attempt.abort();
  const timer = setTimeout(abort, timeoutMs);
  try {
  const response = await fetch(API_BASE + path, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
    signal: attempt.signal,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw providerError(response.status, data);
  return data;
  } catch (err) {
    if (err.name === 'AbortError' || attempt.signal.aborted)
      throw new ServiceError(504, 'El proveedor está tardando en responder. Intenta de nuevo en unos momentos.');
    throw err;
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', abort);
  }
}

async function models(key, signal) {
  if (modelCache?.key === key && modelCache.expires > Date.now()) return modelCache.names;
  const names = [];
  let token = '';
  for (let page = 0; page < 5; page++) {
    const data = await google('models?pageSize=100' + (token ? '&pageToken=' + encodeURIComponent(token) : ''), key, signal);
    names.push(...(data.models || []).filter(m => m.supportedGenerationMethods?.includes('generateContent')).map(m => m.name.replace(/^models\//, '')));
    token = data.nextPageToken;
    if (!token) break;
  }
  modelCache = { key, names, expires: Date.now() + 300000 };
  return names;
}

function validateInput(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ServiceError(400, 'Solicitud no válida.');
  const { message, mode = 'estudio', task = 'chat', history = [] } = body;
  if (typeof message !== 'string' || !message.trim() || message.length > 600)
    throw new ServiceError(400, 'Escribe una pregunta de hasta 600 caracteres.');
  if (task !== 'chat' || !Object.hasOwn(PROMPTS, mode))
    throw new ServiceError(400, 'Selecciona un modo válido.');
  if (!Array.isArray(history) || history.length > 4 || history.some(m => !m || !['user', 'aria'].includes(m.role) || typeof m.text !== 'string' || m.text.length > 5000))
    throw new ServiceError(400, 'El contexto de la conversación no es válido.');
  return { message: message.trim(), mode, task, history };
}

function textConfig(model, mode) {
  const config = { temperature: 0.7, maxOutputTokens: mode === 'investigar' ? 8192 : 4096 };
  // The output limit includes thought tokens; leave room for the visible answer.
  if (/^gemini-2\.5-/.test(model)) config.thinkingConfig = { thinkingBudget: 512 };
  else if (/^gemini-[34](?:\.|-)/.test(model)) config.thinkingConfig = { thinkingLevel: 'low' };
  return config;
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  if (!['GET', 'POST'].includes(req.method)) {
    res.setHeader('Allow', 'GET, POST');
    return res.status(405).json({ error: 'Método no permitido.' });
  }
  const key = process.env.GEMINI_API_KEY?.trim();
  if (req.method === 'GET') return res.status(200).json({ configured: Boolean(key) });
  // Only accept browser requests from this deployment; no wildcard CORS.
  if (req.headers.origin) {
    try {
      if (new URL(req.headers.origin).host !== req.headers.host) throw new Error();
    } catch { return res.status(403).json({ error: 'Origen no permitido.' }); }
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
  try {
    const raw = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const input = validateInput(raw);
    if (!key) throw new ServiceError(503, 'El administrador todavía debe conectar la IA de ARIA en el servidor.');
    const explicitModel = process.env.GEMINI_MODEL;
    if (explicitModel && !/^[a-zA-Z0-9._-]+$/.test(explicitModel)) throw new ServiceError(503, 'El modelo configurado en el servidor no es válido.');
    const available = explicitModel ? [explicitModel] : await models(key, controller.signal);
    const candidates = explicitModel ? available : available.filter(n => !/image|tts|audio|robotics|computer|deep-research/.test(n)).sort((a,b) => Number(/flash/.test(b)) - Number(/flash/.test(a)));
    if (!candidates.length) throw new ServiceError(503, 'La cuenta de ARIA no tiene un modelo de conversación disponible.');
    const body = {
      system_instruction: { parts: [{ text: systemPrompt(input.mode) }] },
      contents: [...input.history.map(m => ({ role: m.role === 'aria' ? 'model' : 'user', parts: [{ text: m.text }] })), { role: 'user', parts: [{ text: input.message }] }],
      generationConfig: {},
    };
    let lastError;
    const modelAttempts = candidates.length === 1 ? [candidates[0], candidates[0]] : candidates.slice(0, 3);
    for (const model of modelAttempts) {
      try {
        body.generationConfig = textConfig(model, input.mode);
        const attemptTimeout = input.mode === 'investigar' ? 14000 : 10000;
        let data = await google('models/' + model + ':generateContent', key, controller.signal, body, attemptTimeout);
        if (['MAX_TOKENS', 'CONTINUATION'].includes(data.candidates?.[0]?.finishReason)) {
          const retryBody = {
            ...body,
            system_instruction: { parts: [{ text: systemPrompt(input.mode) + ' La respuesta anterior no pudo completarse. Redacta de nuevo una respuesta autónoma de un máximo de 350 palabras, con contenido y una conclusión. No menciones este reintento.' }] },
            generationConfig: { ...body.generationConfig, maxOutputTokens: 8192 },
          };
          data = await google('models/' + model + ':generateContent', key, controller.signal, retryBody, attemptTimeout);
        }
        if (data.candidates?.[0]?.finishReason && data.candidates[0].finishReason !== 'STOP') {
          lastError = new ServiceError(502, 'La IA no pudo completar la respuesta. Prueba pedir una parte más concreta del tema.');
          continue;
        }
        const parts = data.candidates?.[0]?.content?.parts || [];
        const text = parts.filter(p => !p.thought).map(p => p.text || '').join('').trim();
        if (text) return res.status(200).json({ text });
        lastError = new ServiceError(502, 'El servicio no devolvió contenido para esta consulta. Prueba reformularla.');
      } catch (err) {
        if (controller.signal.aborted || err.status === 503) throw err;
        lastError = err;
      }
    }
    throw lastError;
  } catch (err) {
    const status = err instanceof SyntaxError ? 400 : controller.signal.aborted ? 504 : err.status || 502;
    const message = err instanceof SyntaxError ? 'Solicitud no válida.' : controller.signal.aborted ? 'La respuesta tardó demasiado. Intenta de nuevo.' : err instanceof ServiceError ? err.message : 'No se pudo conectar con la IA. Intenta de nuevo.';
    return res.status(status).json({ error: message });
  } finally { clearTimeout(timer); }
};
