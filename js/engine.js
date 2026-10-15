/**
 * engine.js — Motor de respuestas de ARIA
 * Soporta Gemini AI + fallback local mejorado
 */

'use strict';

/* ── System prompts por modo ── */
const SYSTEM_PROMPTS = {
  estudio:    'Eres ARIA en MODO ESTUDIO. Explica de forma clara, didáctica y paso a paso. Usa ejemplos simples y analogías. Responde en español, máximo 4 oraciones cortas.',
  investigar: 'Eres ARIA en MODO INVESTIGAR. Proporciona información detallada y precisa con datos concretos. Sé exhaustivo y cita cifras o hechos cuando sea posible. Responde en español.',
  debate:     'Eres ARIA en MODO DEBATE. Toma una posición polémica y defiéndela con argumentos sólidos. Reta al usuario a que justifique su postura. Sé directo y combativo pero con evidencia. Responde en español.',
};
const SYSTEM_PROMPT = SYSTEM_PROMPTS.estudio; // default

/* ── Modo actual (se actualiza desde app.js) ── */
var ariaMode = 'estudio';

/* ── Cache de modelos disponibles ── */
let _cachedModels = null;

/* ════════════════════════════════════════════════
   GENERACIÓN DE IMÁGENES
   ════════════════════════════════════════════════ */
async function generateImage(prompt) {
  var apiKey = localStorage.getItem('aria-api-key');

  // Intento 1: Gemini 2.0 Flash Image Generation
  if (apiKey) {
    try {
      var url1 = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp-image-generation:generateContent?key=' + apiKey;
      var res1  = await fetch(url1, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: 'Generate an image of: ' + prompt }] }],
          generationConfig: { responseModalities: ['IMAGE', 'TEXT'] }
        })
      });
      if (res1.ok) {
        var d1 = await res1.json();
        var parts1 = ((d1.candidates || [])[0] || {});
        var contentParts = (parts1.content || {}).parts || [];
        for (var i = 0; i < contentParts.length; i++) {
          var p = contentParts[i];
          if (p.inlineData && p.inlineData.mimeType && p.inlineData.mimeType.indexOf('image/') === 0) {
            return { imageUrl: 'data:' + p.inlineData.mimeType + ';base64,' + p.inlineData.data };
          }
        }
      }
    } catch(e1) { console.warn('[ARIA] Gemini imagen:', e1.message); }
  }

  // Intento 2: Imagen 3.0
  if (apiKey) {
    try {
      var url2 = 'https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=' + apiKey;
      var res2  = await fetch(url2, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instances: [{ prompt: prompt }], parameters: { sampleCount: 1, aspectRatio: '1:1' } })
      });
      if (res2.ok) {
        var d2 = await res2.json();
        var pred = (d2.predictions || [])[0];
        if (pred && pred.bytesBase64Encoded) {
          return { imageUrl: 'data:' + (pred.mimeType || 'image/png') + ';base64,' + pred.bytesBase64Encoded };
        }
      }
    } catch(e2) { console.warn('[ARIA] Imagen 3:', e2.message); }
  }

  // ✅ Fallback garantizado: Pollinations.ai (gratis, sin API key)
  var seed = Math.floor(Math.random() * 99999);
  var pollinationsUrl =
    'https://image.pollinations.ai/prompt/' +
    encodeURIComponent(prompt + ', high quality, vibrant, detailed, beautiful') +
    '?width=768&height=768&nologo=true&seed=' + seed;

  return { imageUrl: pollinationsUrl };
}



/**
 * Consulta la API para saber qué modelos están disponibles con esta key
 * @param {string} apiKey
 * @returns {Promise<string[]>} lista de nombres de modelos
 */
async function listAvailableModels(apiKey) {
  if (_cachedModels) return _cachedModels;

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`
    );
    if (!res.ok) return [];

    const data = await res.json();

    // Palabras clave a EXCLUIR
    const EXCLUDE = ['tts', 'embed', 'aqa', 'vision', 'image', 'audio', 'bison', 'thinking', 'learnlm'];

    const models = (data.models || [])
      .filter(m => {
        const name    = m.name.toLowerCase();
        const methods = m.supportedGenerationMethods || [];
        const isChat     = methods.includes('generateContent');
        const isExcluded = EXCLUDE.some(kw => name.includes(kw));
        return isChat && !isExcluded;
      })
      // Preferir flash estable; preview y exp al final
      .sort((a, b) => {
        const score = n => {
          if (n.includes('gemini-2.0-flash') && !n.includes('preview') && !n.includes('exp')) return 0;
          if (n.includes('gemini-1.5-flash') && !n.includes('preview'))                       return 1;
          if (n.includes('flash') && !n.includes('preview'))                                  return 2;
          if (n.includes('exp') || n.includes('preview'))                                     return 5;
          return 3;
        };
        return score(a.name) - score(b.name);
      })
      .map(m => m.name.replace('models/', ''));

    console.info('[ARIA] Modelos disponibles:', models);
    _cachedModels = models.length > 0 ? models : null;
    return models;

  } catch (err) {
    console.warn('[ARIA] No se pudo listar modelos:', err.message);
    return [];
  }
}

/* ── Llamada a Gemini API ── */
async function callGeminiAPI(userMessage, conversationHistory = []) {
  const apiKey = localStorage.getItem('aria-api-key');
  if (!apiKey) return null;

  // 1️⃣ Descubrir modelos disponibles para esta key
  const availableModels = await listAvailableModels(apiKey);
  if (availableModels.length === 0) {
    console.warn('[ARIA] No se encontraron modelos disponibles para esta key.');
    return null;
  }

  // 2️⃣ Construir la petición con mínimo historial (evita contaminación de contexto)
  const historyContents = conversationHistory
    .slice(-4)  // solo los últimos 2 intercambios
    .map(m => ({
      role:  m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.text }],
    }));

  const contents = [
    ...historyContents,
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  const activePrompt = SYSTEM_PROMPTS[ariaMode] || SYSTEM_PROMPTS.estudio;
  const bodyObj = {
    system_instruction: { parts: [{ text: activePrompt }] },
    contents,
    generationConfig: {
      temperature:     0.75,
      maxOutputTokens: 400,
      topP:            0.90,
    },
    safetySettings: [
      { category: 'HARM_CATEGORY_HARASSMENT',        threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_HATE_SPEECH',       threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_ONLY_HIGH' },
      { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_ONLY_HIGH' },
    ],
  };

  // 3️⃣ Probar modelos disponibles uno por uno
  for (const model of availableModels) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      const res  = await fetch(url, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(bodyObj),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        const msg     = errData?.error?.message || `HTTP ${res.status}`;
        console.warn(`[ARIA] ${model} → ${msg}`);
        // Key inválida/sin permisos → parar todo
        if (res.status === 403) return { __error: msg };
        // Modelo no soporta multiturn u otro error → saltar al siguiente
        continue;
      }

      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (text) {
        console.info(`[ARIA] ✓ Respondido por: ${model}`);
        return text.trim();
      }

    } catch (err) {
      console.warn(`[ARIA] Error de red con ${model}:`, err.message);
    }
  }

  return null;
}

/* ── Validar API key (test rápido con ListModels) ── */
async function validateApiKey(key) {
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`
    );
    if (!res.ok) return false;
    const data   = await res.json();
    const models = (data.models || []).filter(m =>
      m.supportedGenerationMethods?.includes('generateContent')
    );
    // Resetear caché para que use la nueva key
    _cachedModels = null;
    return models.length > 0;
  } catch {
    return false;
  }
}

/* ─────────────────────────────────────────
   MOTOR LOCAL (fallback sin API key)
──────────────────────────────────────────── */

function normalize(text) {
  return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function matchesAny(norm, raw, keywords) {
  return keywords.some(kw => {
    const nkw = normalize(kw);
    return norm.includes(nkw) || raw.toLowerCase().includes(kw.toLowerCase());
  });
}

function formatResponse(text) {
  return text
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
      `<pre class="code-block"><code>${escapeHtml(code.trim())}</code></pre>`
    )
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/^• (.+)$/gm, '<span class="bullet">• $1</span>')
    .replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function escapeHtmlSimple(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getLocalResponse(userInput) {
  const raw  = userInput.trim();
  const norm = normalize(raw);

  if (raw.length < 3) {
    return { text: SHORT_PROMPT, html: formatResponse(SHORT_PROMPT), tag: 'ayuda' };
  }

  // Saludos
  if (matchesAny(norm, raw, ['hola', 'hello', 'hi', 'buenas', 'buenos dias', 'buenas tardes', 'que tal', 'como estas', 'que hay'])) {
    var r = '\u00a1Hola! \ud83d\udc4b \u00bfEn qu\u00e9 te puedo ayudar? Pregunta lo que quieras.';
    return { text: r, html: formatResponse(r), tag: 'saludo' };
  }

  // Sobre ARIA
  if (matchesAny(norm, raw, ['quien eres', 'que eres', 'como te llamas', 'que puedes hacer', 'para que sirves'])) {
    var r2 = 'Soy ARIA \ud83d\ude80 Una IA educativa boliviana. Pregunta sobre bio, c\u00f3digo, ciencias o Bolivia y te respondo directo.';
    return { text: r2, html: formatResponse(r2), tag: 'info' };
  }

  // Debates (respuestas incorrectas)
  for (const item of DEBATES) {
    if (matchesAny(norm, raw, item.k)) {
      return { text: item.r, html: formatResponse(item.r), tag: item.tag || 'debate' };
    }
  }

  // Respuestas correctas
  for (const item of CORRECTOS) {
    if (matchesAny(norm, raw, item.k)) {
      return { text: item.r, html: formatResponse(item.r), tag: 'correcto' };
    }
  }

  // Temas educativos
  for (const item of TEMAS) {
    if (matchesAny(norm, raw, item.k)) {
      return { text: item.r, html: formatResponse(item.r), tag: item.tag || 'tema' };
    }
  }

  // Por qué
  if (norm.includes('por que') || norm.includes('porque') || norm.includes('por qué')) {
    const r = `Buena pregunta con "por qué". 🤔 Me gusta debatir causas.\nContame exactamente qué quieres entender y te doy 3 razones con evidencia, no humo. ¿Cuál es el tema exacto?`;
    return { text: r, html: formatResponse(r), tag: 'debate' };
  }

  // Fallback — sugerir conectar IA
  const apiKey = localStorage.getItem('aria-api-key');
  const tip = apiKey ? '' : '\n\n💡 _Conecta Gemini AI (botón ⚙️ arriba) para que pueda responder cualquier pregunta._';
  const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] + tip;
  return { text: fallback, html: formatResponse(fallback), tag: 'fallback' };
}

/* ── Función principal ── */
async function getAriaResponse(userInput, conversationHistory = []) {
  const aiResult = await callGeminiAPI(userInput, conversationHistory);

  // Error de key inválida → devolver objeto especial para mostrar en UI
  if (aiResult && typeof aiResult === 'object' && aiResult.__error) {
    return { __keyError: true, errorDetail: aiResult.__error };
  }

  // Respuesta exitosa de Gemini
  if (typeof aiResult === 'string' && aiResult.length > 0) {
    return {
      text:   aiResult,
      html:   formatResponse(aiResult),
      tag:    'ia',
      source: 'gemini',
    };
  }

  // Fallback local
  const local = getLocalResponse(userInput);
  return { ...local, source: 'local' };
}

/* ── Utilidades de tiempo e ID ── */
function getTime() {
  return new Date().toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit' });
}
function genId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
