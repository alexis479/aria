/**
 * app.js — ARIA v2 — Lógica principal, historial, voz y TTS
 */

'use strict';

const conversationHistory = [];
const HISTORY_KEY = 'aria-chat-history';
let currentChatId = null;
var currentMode = 'estudio'; // 'estudio' | 'investigar' | 'debate' | 'imagen'

const VoiceState = { listening: false };
const TtsState   = { speaking: false, utterance: null, autoSpeak: false };
const State      = { locked: false };

// ────────────────────────────────────────────────
// ENVIAR MENSAJE
// ────────────────────────────────────────────────

async function handleSend(override) {
  const input = Dom.input();
  const text  = (override !== undefined ? override : input.value).trim();
  if (!text || State.locked) return;
  if (override === undefined) input.value = '';
  closeSidebar();

  // ── Modo Imagen ──
  if (currentMode === 'imagen') {
    const userMsg = { id: genId(), role: 'user', text, html: escapeHtml(text), time: getTime(), tag: '' };
    renderMessage(userMsg);
    State.locked = true; setInputDisabled(true); showTyping();
    try {
      const result = await generateImage(text);
      hideTyping();
      const imgSrc = result.imageUrl || result.dataUrl;
      if (imgSrc) {
        const wrap = document.createElement('div');
        wrap.className = 'msg-row aria';
        wrap.innerHTML =
          '<div class="msg-group">' +
          '<div class="msg-avatar aria-avatar">A</div>' +
          '<div class="msg-content">' +
          '<div class="bubble aria">Aquí tu imagen 🎨' +
          '<div class="generated-image-wrap">' +
          '<img src="' + imgSrc + '" alt="Imagen generada" ' +
          'style="min-height:200px;background:rgba(124,58,237,.08)" ' +
          'onload="this.style.minHeight=\'auto\'" />' +
          '<div class="generated-image-caption">✨ Creado por ARIA · ' + escapeHtml(text.slice(0,55)) + '</div>' +
          '</div></div>' +
          '<div class="bubble-meta"><span class="msg-time">' + getTime() + '</span></div>' +
          '</div></div>';
        const container = Dom.messages();
        container.appendChild(wrap);
        container.scrollTop = container.scrollHeight;
      } else {
        renderMessage({ id: genId(), role: 'aria', text: result.error || 'No se pudo generar la imagen.', html: escapeHtml(result.error || 'No se pudo generar la imagen.'), time: getTime(), tag: 'ayuda' });
      }
    } catch(imgErr) {
      hideTyping();
      renderMessage({ id: genId(), role: 'aria', text: 'Error al generar imagen.', html: 'Error al generar imagen.', time: getTime(), tag: 'ayuda' });
    } finally {
      State.locked = false; setInputDisabled(false); focusInput();
    }
    return;
  }

  const userMsg = {
    id:   genId(),
    role: 'user',
    text,
    html: escapeHtml(text),
    time: getTime(),
    tag:  '',
  };
  renderMessage(userMsg);
  conversationHistory.push({ role: 'user', text });

  State.locked = true;
  setInputDisabled(true);
  showTyping();

  try {
    const response = await getAriaResponse(text, conversationHistory);
    hideTyping();

    if (response.__keyError) {
      renderMessage({
        id: genId(), role: 'aria', time: getTime(), tag: 'ayuda',
        text: 'Error con la API key. Verifica la configuración.',
        html: 'Error con la API key. Verifica la configuración.',
      });
    } else {
      const ariaMsg = {
        id:   genId(),
        role: 'aria',
        text: response.text,
        html: response.html,
        time: getTime(),
        tag:  response.tag,
      };
      renderMessage(ariaMsg);
      conversationHistory.push({ role: 'aria', text: response.text });
      if (conversationHistory.length > 20) conversationHistory.splice(0, 2);
      autoSaveCurrentChat();
      if (TtsState.autoSpeak) speakText(response.text);
    }
  } catch (err) {
    hideTyping();
    renderMessage({
      id: genId(), role: 'aria', time: getTime(), tag: 'ayuda',
      text: 'Ups, algo salió mal. Intenta de nuevo.',
      html: 'Ups, algo salió mal. Intenta de nuevo.',
    });
    console.error('[ARIA] handleSend error:', err);
  } finally {
    State.locked = false;
    setInputDisabled(false);
    focusInput();
  }
}

// ────────────────────────────────────────────────
// LIMPIAR TEXTO PARA TTS
// ────────────────────────────────────────────────

function cleanForTts(text) {
  return text
    .replace(/```[\s\S]*?```/g, 'código.')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*/g, '')
    .replace(/•/g, '')
    .replace(/\n/g, ' ')
    // quitar emojis (caracteres fuera del BMP) usando charCodeAt
    .split('').filter(function(ch) {
      var code = ch.charCodeAt(0);
      return code < 0xD800 || code > 0xDFFF;
    }).join('')
    .trim();
}

// ────────────────────────────────────────────────
// TEXT-TO-SPEECH
// ────────────────────────────────────────────────

function initTts() {
  if (!window.speechSynthesis) return;
  if (speechSynthesis.onvoiceschanged !== undefined) {
    speechSynthesis.onvoiceschanged = function() {};
  }
  var ttsBtn = document.getElementById('btn-tts');
  if (!ttsBtn) return;
  updateTtsButton();
  ttsBtn.addEventListener('click', function() {
    if (TtsState.speaking) {
      stopSpeaking();
    } else {
      TtsState.autoSpeak = !TtsState.autoSpeak;
      updateTtsButton();
      if (TtsState.autoSpeak) {
        var lastAria = null;
        for (var i = conversationHistory.length - 1; i >= 0; i--) {
          if (conversationHistory[i].role === 'aria') { lastAria = conversationHistory[i]; break; }
        }
        if (lastAria) speakText(lastAria.text);
      }
    }
  });
}

function speakText(text) {
  if (!window.speechSynthesis) return;
  var clean = cleanForTts(text);
  if (!clean) return;
  stopSpeaking();
  var utterance = new SpeechSynthesisUtterance(clean);
  utterance.lang   = 'es-ES';
  utterance.rate   = 1.05;
  utterance.pitch  = 1.1;
  utterance.volume = 1.0;
  var voices   = window.speechSynthesis.getVoices();
  var esVoice  = null;
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang.indexOf('es') === 0 && voices[i].name.indexOf('Compact') === -1) {
      esVoice = voices[i]; break;
    }
  }
  if (esVoice) utterance.voice = esVoice;
  utterance.onstart = function() { TtsState.speaking = true; TtsState.utterance = utterance; showOrb(true); updateTtsButton(); };
  utterance.onend   = function() { TtsState.speaking = false; TtsState.utterance = null; showOrb(false); updateTtsButton(); };
  utterance.onerror = function() { TtsState.speaking = false; TtsState.utterance = null; showOrb(false); updateTtsButton(); };
  window.speechSynthesis.speak(utterance);
}

function stopSpeaking() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
  TtsState.speaking  = false;
  TtsState.utterance = null;
  showOrb(false);
  updateTtsButton();
}

function showOrb(visible) {
  var orb = document.getElementById('voice-orb');
  if (!orb) return;
  if (visible) orb.classList.add('active');
  else orb.classList.remove('active');
}

function updateTtsButton() {
  var btn = document.getElementById('btn-tts');
  if (!btn) return;
  if (TtsState.speaking) {
    btn.title = 'Detener voz';
    btn.classList.add('tts-active');
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="none"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  } else if (TtsState.autoSpeak) {
    btn.title = 'Voz ON — clic para desactivar';
    btn.classList.add('tts-active');
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>';
  } else {
    btn.title = 'Activar voz — ARIA te responde hablando';
    btn.classList.remove('tts-active');
    btn.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/></svg>';
  }
}

// ────────────────────────────────────────────────
// HISTORIAL
// ────────────────────────────────────────────────

function getHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); }
  catch (e) { return []; }
}

function saveHistory(history) {
  try { localStorage.setItem(HISTORY_KEY, JSON.stringify(history)); }
  catch (e) { console.warn('[ARIA] No se pudo guardar historial:', e); }
}

function generateTitle(text) {
  var n = text.toLowerCase();
  var prefix = '';
  if (n.indexOf('tierra plana') !== -1 || n.indexOf('flat earth') !== -1) prefix = 'Debate: ';
  else if (n.indexOf('debate') !== -1 || n.indexOf('incorrecto') !== -1) prefix = 'Debate: ';
  else if (n.indexOf('html') !== -1 || n.indexOf('css') !== -1 || n.indexOf('javascript') !== -1 || n.indexOf('código') !== -1) prefix = 'Código: ';
  else if (n.indexOf('bolivia') !== -1 || n.indexOf('sucre') !== -1 || n.indexOf('la paz') !== -1) prefix = 'Bolivia: ';
  else if (n.indexOf('historia') !== -1) prefix = 'Historia: ';
  else if (n.indexOf('fotosíntesis') !== -1 || n.indexOf('adn') !== -1 || n.indexOf('célula') !== -1) prefix = 'Bio: ';
  else if (n.indexOf('átomo') !== -1 || n.indexOf('física') !== -1 || n.indexOf('química') !== -1) prefix = 'Ciencia: ';
  var maxLen = 36 - prefix.length;
  var t = text.trim().slice(0, maxLen);
  return prefix + t + (text.length > maxLen ? '…' : '');
}

function timeAgo(ts) {
  var diff  = Date.now() - ts;
  var mins  = Math.floor(diff / 60000);
  var hours = Math.floor(diff / 3600000);
  var days  = Math.floor(diff / 86400000);
  if (mins  <  1) return 'Ahora';
  if (mins  < 60) return 'Hace ' + mins + ' min';
  if (hours < 24) return 'Hace ' + hours + ' h';
  if (days  === 1) return 'Ayer';
  return ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][new Date(ts).getDay()];
}

function autoSaveCurrentChat() {
  if (conversationHistory.length < 2) return;
  var firstUser = null;
  for (var i = 0; i < conversationHistory.length; i++) {
    if (conversationHistory[i].role === 'user') { firstUser = conversationHistory[i]; break; }
  }
  if (!firstUser) return;

  var history = getHistory();
  var title   = generateTitle(firstUser.text);

  if (currentChatId) {
    var idx = -1;
    for (var j = 0; j < history.length; j++) {
      if (history[j].id === currentChatId) { idx = j; break; }
    }
    if (idx !== -1) {
      history[idx].messages  = conversationHistory.slice();
      history[idx].title     = title;
      history[idx].timestamp = Date.now();
      saveHistory(history);
      renderHistoryList();
      return;
    }
  }

  currentChatId = genId();
  history.unshift({ id: currentChatId, title: title, messages: conversationHistory.slice(), timestamp: Date.now() });
  if (history.length > 30) history.pop();
  saveHistory(history);
  renderHistoryList();
}

function renderHistoryList() {
  var list  = document.getElementById('history-list');
  var empty = document.getElementById('history-empty');
  if (!list) return;

  var items = list.querySelectorAll('.history-item');
  for (var k = 0; k < items.length; k++) items[k].parentNode.removeChild(items[k]);

  var history = getHistory();

  if (history.length === 0) {
    if (empty) empty.style.display = 'flex';
    return;
  }
  if (empty) empty.style.display = 'none';

  history.forEach(function(chat) {
    var btn = document.createElement('button');
    btn.className = 'history-item' + (chat.id === currentChatId ? ' active' : '');
    btn.innerHTML =
      '<svg class="history-item-icon" xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
      '<div class="history-item-info">' +
        '<div class="history-item-title">' + escapeHtml(chat.title) + '</div>' +
        '<div class="history-item-time">' + timeAgo(chat.timestamp) + '</div>' +
      '</div>';
    btn.addEventListener('click', function() { loadChat(chat); });
    list.appendChild(btn);
  });
}

function loadChat(chat) {
  stopSpeaking();
  conversationHistory.length = 0;
  for (var i = 0; i < chat.messages.length; i++) conversationHistory.push(chat.messages[i]);
  currentChatId = chat.id;
  clearMessages();
  chat.messages.forEach(function(m) {
    renderMessage({ id: genId(), role: m.role, text: m.text, html: formatResponse(m.text), time: '', tag: '' }, false);
  });
  renderHistoryList();
  closeSidebar();
  focusInput();
}

// ────────────────────────────────────────────────
// NUEVO CHAT
// ────────────────────────────────────────────────

function handleNewChat() {
  autoSaveCurrentChat();
  stopSpeaking();
  conversationHistory.length = 0;
  currentChatId = null;
  clearMessages();
  renderWelcome();
  renderHistoryList();
  closeSidebar();
  focusInput();
}

function renderWelcome() {
  renderMessage({
    id:   genId(),
    role: 'aria',
    time: getTime(),
    tag:  'bienvenida',
    text: WELCOME_MSG,
    html: formatResponse(WELCOME_MSG),
  }, false);
}

// ────────────────────────────────────────────────
// COPIAR CHAT
// ────────────────────────────────────────────────

function handleCopyChat() {
  var lines = conversationHistory.map(function(m) {
    return (m.role === 'user' ? 'Tú' : 'ARIA') + ': ' + m.text;
  });
  if (navigator.clipboard) navigator.clipboard.writeText(lines.join('\n\n')).catch(function(){});
  var btn = document.getElementById('btn-copy-chat');
  if (btn) { btn.style.color = '#16a34a'; setTimeout(function(){ btn.style.color = ''; }, 1500); }
}

// ────────────────────────────────────────────────
// VOZ — micrófono del input (pequeño)
// ────────────────────────────────────────────────

function initVoice() {
  var SR  = window.SpeechRecognition || window.webkitSpeechRecognition;
  var btn = Dom.btnMic();
  if (!SR) { if (btn) btn.style.display = 'none'; return; }

  var rec = new SR();
  rec.lang = 'es-ES'; rec.continuous = false;
  rec.interimResults = true; rec.maxAlternatives = 1;

  rec.onresult = function(e) {
    var t = ''; for (var i = 0; i < e.results.length; i++) t += e.results[i][0].transcript;
    Dom.input().value = t;
  };

  rec.onend = function() {
    var was = VoiceState.listening;
    VoiceState.listening = false;
    setMicListening(false);
    Dom.input().placeholder = 'Escribe tu pregunta o habla para debatir...';
    if (was && Dom.input().value.trim()) handleSend();
  };

  rec.onerror = function(e) {
    VoiceState.listening = false;
    setMicListening(false);
    Dom.input().placeholder = 'Escribe tu pregunta o habla para debatir...';
    if (e.error === 'not-allowed') alert('Activa el microfono en la configuracion del navegador.');
  };

  btn.addEventListener('click', function() {
    if (VoiceState.listening) {
      VoiceState.listening = false; rec.stop(); setMicListening(false);
      Dom.input().placeholder = 'Escribe tu pregunta o habla para debatir...';
    } else {
      Dom.input().value = ''; Dom.input().placeholder = 'Escuchando…';
      VoiceState.listening = true; setMicListening(true);
      try { rec.start(); } catch(err) { VoiceState.listening = false; setMicListening(false); }
    }
  });
}

// ────────────────────────────────────────────────
// BOTÓN FLOTANTE DE VOZ
// ────────────────────────────────────────────────

function initVoiceFloat() {
  var floatBtn = document.getElementById('btn-voice-float');
  if (!floatBtn) return;
  var SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { floatBtn.style.display = 'none'; return; }

  var floatListening  = false;
  var finalTranscript = '';
  var silenceTimer    = null;

  function makeRec() {
    var r = new SR();
    r.lang = 'es-ES';
    r.continuous     = true;   /* mantiene microfono abierto */
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = onResult;
    r.onend    = onEnd;
    r.onerror  = onError;
    return r;
  }
  var rec = makeRec();

  function setFloatState(state) {
    floatBtn.classList.remove('vf-listening', 'vf-speaking');
    if (state === 'listening') floatBtn.classList.add('vf-listening');
    if (state === 'speaking')  floatBtn.classList.add('vf-speaking');
  }

  function clearTimer() {
    if (silenceTimer) { clearTimeout(silenceTimer); silenceTimer = null; }
  }

  function sendAndSpeak(text) {
    clearTimer();
    setFloatState('speaking');
    State.locked = true;
    setInputDisabled(true);
    showTyping();
    Dom.input().value = '';
    Dom.input().placeholder = 'Escribe tu pregunta o habla para debatir...';
    var userMsg = { id: genId(), role: 'user', text: text, html: escapeHtml(text), time: getTime(), tag: '' };
    renderMessage(userMsg);
    conversationHistory.push({ role: 'user', text: text });
    getAriaResponse(text, conversationHistory).then(function(response) {
      hideTyping();
      if (!response.__keyError && response.text) {
        renderMessage({ id: genId(), role: 'aria', text: response.text, html: response.html, time: getTime(), tag: response.tag });
        conversationHistory.push({ role: 'aria', text: response.text });
        if (conversationHistory.length > 20) conversationHistory.splice(0, 2);
        autoSaveCurrentChat();
        speakAndUpdate(response.text, setFloatState);
      } else { setFloatState('idle'); }
      State.locked = false; setInputDisabled(false);
    }).catch(function() {
      hideTyping(); setFloatState('idle');
      State.locked = false; setInputDisabled(false);
    });
  }

  function onResult(e) {
    clearTimer();
    var interim = '';
    for (var i = e.resultIndex; i < e.results.length; i++) {
      if (e.results[i].isFinal) finalTranscript += e.results[i][0].transcript + ' ';
      else interim += e.results[i][0].transcript;
    }
    Dom.input().value = (finalTranscript + interim).trim();
    /* Tras frase final, esperar 1 s de silencio y enviar */
    if (finalTranscript.trim()) {
      silenceTimer = setTimeout(function() {
        if (!floatListening) return;
        var t = finalTranscript.trim();
        finalTranscript = '';
        floatListening  = false;
        try { rec.stop(); } catch(ex) {}
        rec = makeRec();
        if (t) sendAndSpeak(t);
        else   setFloatState('idle');
      }, 1000);
    }
  }

  function onEnd() {
    clearTimer();
    var t   = finalTranscript.trim();
    var was = floatListening;
    finalTranscript = '';
    floatListening  = false;
    Dom.input().value = '';
    Dom.input().placeholder = 'Escribe tu pregunta o habla para debatir...';
    if (was && t) { sendAndSpeak(t); return; }
    if (!was) return; /* cancelado manualmente */
    setFloatState('idle');
  }

  function onError(e) {
    clearTimer();
    if (e.error === 'no-speech') return; /* onend se encarga */
    finalTranscript = '';
    floatListening  = false;
    setFloatState('idle');
    Dom.input().placeholder = 'Escribe tu pregunta o habla para debatir...';
    if (e.error === 'not-allowed') {
      alert('Activa el microfono: haz clic en el icono de candado/camara en la barra de URL.');
    }
  }

  floatBtn.addEventListener('click', function() {
    if (TtsState.speaking) { stopSpeaking(); setFloatState('idle'); return; }
    if (floatListening) {
      /* Cancelar escucha manualmente */
      clearTimer();
      floatListening  = false;
      finalTranscript = '';
      try { rec.stop(); } catch(ex) {}
      rec = makeRec();
      setFloatState('idle');
      Dom.input().value = '';
      Dom.input().placeholder = 'Escribe tu pregunta o habla para debatir...';
    } else {
      /* Iniciar escucha */
      finalTranscript = '';
      Dom.input().value = '';
      Dom.input().placeholder = 'Escuchando... habla ahora';
      floatListening = true;
      setFloatState('listening');
      try {
        rec.start();
      } catch(startErr) {
        console.warn('[ARIA] mic start:', startErr.message);
        rec = makeRec();
        try { rec.start(); } catch(e2) {
          floatListening = false;
          setFloatState('idle');
          Dom.input().placeholder = 'Escribe tu pregunta o habla para debatir...';
        }
      }
    }
  });

  setFloatState('idle');
}

function speakAndUpdate(text, setFloatState) {
  if (!window.speechSynthesis) { if (setFloatState) setFloatState('idle'); return; }
  var clean = cleanForTts(text);
  if (!clean) { if (setFloatState) setFloatState('idle'); return; }
  window.speechSynthesis.cancel();
  var u = new SpeechSynthesisUtterance(clean);
  u.lang = 'es-ES'; u.rate = 1.05; u.pitch = 1.1; u.volume = 1;
  var voices  = window.speechSynthesis.getVoices();
  var esVoice = null;
  for (var i = 0; i < voices.length; i++) {
    if (voices[i].lang.indexOf('es') === 0 && voices[i].name.indexOf('Compact') === -1) { esVoice = voices[i]; break; }
  }
  if (esVoice) u.voice = esVoice;
  u.onstart = function() { TtsState.speaking = true; showOrb(true); if (setFloatState) setFloatState('speaking'); };
  u.onend   = function() { TtsState.speaking = false; showOrb(false); updateTtsButton(); if (setFloatState) setFloatState('idle'); };
  u.onerror = function() { TtsState.speaking = false; showOrb(false); updateTtsButton(); if (setFloatState) setFloatState('idle'); };
  TtsState.utterance = u;
  window.speechSynthesis.speak(u);
}

// ────────────────────────────────────────────────
// MODOS DE ARIA
// ────────────────────────────────────────────────

const MODE_LABELS = {
  estudio:    { placeholder: 'Pregunta lo que quieras aprender...', badge: '📚 Estudio' },
  investigar: { placeholder: 'Escribe el tema a investigar...', badge: '🔍 Investigar' },
  debate:     { placeholder: 'Lanza una idea y debatimos...', badge: '🥊 Debate' },
  imagen:     { placeholder: 'Describe la imagen a crear (ej: un gato en el espacio)...', badge: '🎨 Crear Imagen' },
};

function setMode(mode) {
  currentMode = mode;
  if (typeof ariaMode !== 'undefined') ariaMode = mode; // sync engine.js

  // Actualizar botones
  var btns = document.querySelectorAll('.mode-btn');
  for (var i = 0; i < btns.length; i++) {
    btns[i].classList.toggle('active', btns[i].dataset.mode === mode);
  }

  // Actualizar placeholder del input
  var info = MODE_LABELS[mode] || MODE_LABELS.estudio;
  Dom.input().placeholder = info.placeholder;

  // Actualizar indicador en footer
  var ind = document.getElementById('mode-indicator');
  if (ind) {
    ind.textContent = info.badge;
    ind.className = mode === 'imagen' ? 'mode-imagen' : '';
    ind.id = 'mode-indicator';
  }

  // Limpiar historial de conversación al cambiar modo (nuevo contexto)
  conversationHistory.length = 0;
}

function initModes() {
  var btns = document.querySelectorAll('.mode-btn');
  for (var i = 0; i < btns.length; i++) {
    (function(btn) {
      btn.addEventListener('click', function() { setMode(btn.dataset.mode); });
    })(btns[i]);
  }
  // Añadir indicador al footer si no existe
  var status = document.querySelector('.aria-status');
  if (status && !document.getElementById('mode-indicator')) {
    var ind = document.createElement('span');
    ind.id = 'mode-indicator';
    ind.textContent = '📚 Estudio';
    status.appendChild(ind);
  }
}

// ────────────────────────────────────────────────
// MODAL API KEY
// ────────────────────────────────────────────────

function initApiModal() {
  updateAiIndicators(false);
  const button = Dom.btnApi();
  if (button) button.addEventListener('click', async function() {
    button.disabled = true;
    try {
      const response = await fetch('/api/aria', { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const status = await response.json();
      alert(status.configured
        ? 'ARIA tiene una conexión compartida configurada. Puedes preguntar desde cualquier dispositivo. Si una consulta falla, revisa el mensaje de respuesta.'
        : 'Falta configurar la conexión compartida. El administrador debe guardar GEMINI_API_KEY en Vercel y volver a desplegar.');
    } catch (err) { alert('No se pudo consultar la conexión de ARIA. Revisa tu conexión o el despliegue.'); }
    finally { button.disabled = false; }
  });
}

function showBadge(badge, type, text) {
  badge.className = 'ai-status-badge ' + type;
  badge.textContent = text;
  badge.hidden = false;
}

// ────────────────────────────────────────────────
// INICIALIZACIÓN
// ────────────────────────────────────────────────

function init() {
  localStorage.removeItem('aria-api-key');

  loadSavedTheme();
  setSendMessage(handleSend);
  renderWelcome();
  renderHistoryList();
  initVoice();
  initTts();
  initVoiceFloat();
  initModes();
  initApiModal();

  Dom.btnSend().addEventListener('click', function() { handleSend(); });
  Dom.input().addEventListener('keydown', function(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  });
  if (Dom.btnTheme()) Dom.btnTheme().addEventListener('click', toggleTheme);
  Dom.btnClear().addEventListener('click', handleNewChat);
  if (Dom.btnSidebar()) Dom.btnSidebar().addEventListener('click', toggleSidebar);
  if (Dom.overlay())    Dom.overlay().addEventListener('click', closeSidebar);

  var newChatBtn  = document.getElementById('btn-new-chat');
  var copyBtn     = document.getElementById('btn-copy-chat');
  var shareBtn    = document.getElementById('btn-share');
  var orbOverlay  = document.getElementById('voice-orb');

  if (newChatBtn) newChatBtn.addEventListener('click', handleNewChat);
  if (copyBtn)    copyBtn.addEventListener('click', handleCopyChat);
  if (shareBtn)   shareBtn.addEventListener('click', function() {
    if (navigator.share) navigator.share({ title: 'ARIA Chat', text: conversationHistory.map(function(m){ return (m.role === 'user' ? 'Tu' : 'ARIA') + ': ' + m.text; }).join('\n') });
  });
  if (orbOverlay) orbOverlay.addEventListener('click', stopSpeaking);

  var chips = document.querySelectorAll('.chip[data-action]');
  for (var i = 0; i < chips.length; i++) {
    chips[i].addEventListener('click', (function(chip) {
      return function() { handleSend(chip.dataset.action); };
    })(chips[i]));
  }

  focusInput();
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
else init();
