/** Motor de ARIA: las credenciales se usan exclusivamente en el servidor. */
'use strict';
var ariaMode = 'estudio';

async function serverRequest(payload) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch('/api/aria', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload), signal: controller.signal,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.error || 'No se pudo conectar con la IA de ARIA.');
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('La respuesta tardó demasiado. Intenta de nuevo.');
    if (err instanceof TypeError) throw new Error('No pude conectar con ARIA. Revisa tu conexión e intenta de nuevo.');
    throw err;
  } finally { clearTimeout(timer); }
}

async function callGeminiAPI(userMessage, history = []) {
  const previous = history.slice();
  const last = previous[previous.length - 1];
  if (last && last.role === 'user' && last.text === userMessage) previous.pop();
  try {
    const data = await serverRequest({ task: 'chat', message: userMessage, mode: ariaMode,
      history: previous.slice(-4).map(m => ({ role: m.role, text: m.text.slice(0,5000) })) });
    return data.text || { __error: 'ARIA no devolvió una respuesta. Intenta de nuevo.' };
  } catch (err) { return { __error: err.message }; }
}

async function generateImage(prompt) {
  try { return await serverRequest({ task: 'image', message: prompt, mode: 'estudio' }); }
  catch (err) { return { error: err.message }; }
}

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
  return escapeHtml(text)
    .replace(/^#{1,6}\s+(.+)$/gm, '<strong>$1</strong>')
    .replace(/```[\w]*\n?([\s\S]*?)```/g, (_, code) =>
      `<pre class="code-block"><code>${code.trim()}</code></pre>`
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

  if (/\bbolivia\b/.test(norm) && /aniversario|independencia|fiesta nacional|fundacion/.test(norm)) {
    const text = 'El aniversario de la independencia de Bolivia se celebra el 6 de agosto. La independencia fue proclamada el 6 de agosto de 1825.';
    return { text, html: formatResponse(text), tag: 'bolivia' };
  }

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
    const r = `Para explicar las causas, necesito conocer el tema concreto. ¿Qué quieres entender? Puedo ayudarte con una explicación y ejemplos.`;
    return { text: r, html: formatResponse(r), tag: 'debate' };
  }

  // Fallback — sugerir conectar IA
  const tip = '';
  const fallback = FALLBACKS[Math.floor(Math.random() * FALLBACKS.length)] + tip;
  return { text: fallback, html: formatResponse(fallback), tag: 'fallback' };
}

/* ── Función principal ── */
async function getAriaResponse(userInput, conversationHistory = []) {
  const aiResult = await callGeminiAPI(userInput, conversationHistory);

  // Error de key inválida → devolver objeto especial para mostrar en UI
  if (aiResult && typeof aiResult === 'object' && aiResult.__error) {
    if (typeof updateAiIndicators === 'function') updateAiIndicators('unavailable');
    const local = getLocalResponse(userInput);
    if (local.tag !== 'fallback') return { ...local, source: 'local' };
    return { text: aiResult.__error, html: escapeHtml(aiResult.__error), tag: 'ayuda', source: 'error' };
  }

  // Respuesta exitosa de Gemini
  if (typeof aiResult === 'string' && aiResult.length > 0) {
    if (typeof updateAiIndicators === 'function') updateAiIndicators(true);
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
