/**
 * ui.js — Capa de renderizado de ARIA
 */

'use strict';

const UI = {
  darkMode:    false,  // light por defecto
  sidebarOpen: false,
  isTyping:    false,
  msgCount:    0,
};

const $ = id => document.getElementById(id);

const Dom = {
  app:             () => $('app'),
  messages:        () => $('messages-container'),
  input:           () => $('chat-input'),
  btnSend:         () => $('btn-send'),
  btnMic:          () => $('btn-mic'),
  btnTheme:        () => $('btn-theme'),
  btnClear:        () => $('btn-clear'),
  btnSidebar:      () => $('btn-sidebar-toggle'),
  btnApi:          () => $('btn-api'),
  btnCopyChat:     () => $('btn-copy-chat'),
  btnShare:        () => $('btn-share'),
  sidebar:         () => $('sidebar'),
  overlay:         () => $('sidebar-overlay'),
  iconMenu:        () => $('icon-menu'),
  iconClose:       () => $('icon-close'),
  iconMoon:        () => $('icon-moon'),
  iconSun:         () => $('icon-sun'),
  micIcon:         () => $('mic-icon'),
  micStopIcon:     () => $('mic-stop-icon'),
  msgCount:        () => $('msg-count'),
  footerMsgCount:  () => $('footer-msg-count'),
  aiPill:          () => $('ai-pill'),
  aiModeLabel:     () => $('ai-mode-label'),
  apiModal:        () => $('api-modal'),
  apiKeyInput:     () => $('api-key-input'),
  btnSaveKey:      () => $('btn-save-key'),
  btnRemoveKey:    () => $('btn-remove-key'),
  btnModalClose:   () => $('btn-modal-close'),
  btnToggleKey:    () => $('btn-toggle-key'),
  aiStatusBadge:   () => $('ai-status-badge'),
};

// ────────────────────────────────────────────────
// MENSAJES
// ────────────────────────────────────────────────

function renderMessage(msg, animate = true) {
  const container = Dom.messages();

  const row = document.createElement('div');
  row.classList.add('msg-row', msg.role);
  if (!animate) row.style.animation = 'none';

  const group = document.createElement('div');
  group.classList.add('msg-group');

  // Avatar
  const avatar = document.createElement('div');
  avatar.classList.add('msg-avatar', msg.role === 'user' ? 'user-avatar-msg' : 'aria-avatar');
  avatar.setAttribute('aria-hidden', 'true');
  avatar.textContent = msg.role === 'user' ? 'TÚ' : 'A';

  // Content
  const content = document.createElement('div');
  content.classList.add('msg-content');

  // Bubble
  const bubble = document.createElement('div');
  bubble.classList.add('bubble', msg.role);
  if (msg.tag === 'bienvenida') bubble.classList.add('welcome');
  bubble.innerHTML = msg.html || escapeHtmlSimple(msg.text);

  // Meta
  const meta = document.createElement('div');
  meta.classList.add('bubble-meta');

  const timeEl = document.createElement('span');
  timeEl.classList.add('msg-time');
  timeEl.textContent = msg.time;
  meta.appendChild(timeEl);

  const hiddenTags = new Set(['bienvenida', 'saludo', 'info', 'fallback', '']);
  if (msg.tag && !hiddenTags.has(msg.tag)) {
    const tagEl = document.createElement('span');
    tagEl.classList.add('msg-tag', `tag-${msg.tag}`);
    tagEl.textContent = msg.tag === 'ia' ? '✦ gemini' : msg.tag;
    meta.appendChild(tagEl);
  }

  content.appendChild(bubble);
  content.appendChild(meta);
  group.appendChild(avatar);
  group.appendChild(content);
  row.appendChild(group);
  container.appendChild(row);

  UI.msgCount++;
  updateCounters();
  scrollToBottom();
}

function showTyping() {
  if (UI.isTyping) return;
  UI.isTyping = true;

  const container = Dom.messages();
  const wrap = document.createElement('div');
  wrap.classList.add('typing-indicator');
  wrap.id = 'typing-indicator';

  wrap.innerHTML = `
    <div class="msg-group">
      <div class="msg-avatar aria-avatar" aria-hidden="true">A</div>
      <div class="typing-bubble">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-label">Aria está escribiendo…</span>
      </div>
    </div>`;

  container.appendChild(wrap);
  scrollToBottom();
}

function hideTyping() {
  UI.isTyping = false;
  const el = $('typing-indicator');
  if (el) el.remove();
}

function clearMessages() {
  Dom.messages().innerHTML = '';
  UI.msgCount = 0;
  updateCounters();
}

// ────────────────────────────────────────────────
// SIDEBAR
// ────────────────────────────────────────────────

function toggleSidebar() {
  UI.sidebarOpen = !UI.sidebarOpen;
  const sidebar  = Dom.sidebar();
  const overlay  = Dom.overlay();
  const menu     = Dom.iconMenu();
  const close    = Dom.iconClose();

  sidebar.classList.toggle('open', UI.sidebarOpen);
  overlay.classList.toggle('active', UI.sidebarOpen);
  menu.style.display  = UI.sidebarOpen ? 'none'  : 'block';
  close.style.display = UI.sidebarOpen ? 'block' : 'none';
}

function closeSidebar() {
  if (UI.sidebarOpen) toggleSidebar();
}

function renderTopics() {
  const container = Dom.topicsContainer();
  if (!container) return;
  TOPICS.forEach(topic => {
    const btn = document.createElement('button');
    btn.classList.add('topic-btn');
    btn.textContent = topic;
    btn.setAttribute('aria-label', `Preguntar sobre ${topic}`);
    btn.addEventListener('click', () => { closeSidebar(); sendMessage(topic); });
    container.appendChild(btn);
  });
}

// ────────────────────────────────────────────────
// TEMA
// ────────────────────────────────────────────────

function applyTheme(dark) {
  UI.darkMode = dark;
  var app  = Dom.app();
  var moon = document.getElementById('icon-moon');
  var sun  = document.getElementById('icon-sun');

  if (dark) {
    app.classList.add('dark');
    document.body.classList.add('dark');
    if (moon) moon.style.display = 'none';
    if (sun)  sun.style.display  = 'block';
  } else {
    app.classList.remove('dark');
    document.body.classList.remove('dark');
    if (moon) moon.style.display = 'block';
    if (sun)  sun.style.display  = 'none';
  }
  localStorage.setItem('aria-theme', dark ? 'dark' : 'light');
}

function toggleTheme() {
  applyTheme(!UI.darkMode);
}

function loadSavedTheme() {
  const saved = localStorage.getItem('aria-theme');
  applyTheme(saved === 'dark');
}

// ────────────────────────────────────────────────
// MODAL API KEY
// ────────────────────────────────────────────────

function openApiModal() {
  const modal = Dom.apiModal();
  const input = Dom.apiKeyInput();
  const badge = Dom.aiStatusBadge();

  const saved = localStorage.getItem('aria-api-key') || '';
  input.value = saved;
  input.type = 'password';

  badge.hidden = true;
  badge.className = 'ai-status-badge';
  badge.textContent = '';

  modal.hidden = false;
  setTimeout(() => input.focus(), 80);
}

function closeApiModal() {
  Dom.apiModal().hidden = true;
}

function updateAiIndicators(hasKey) {
  const pill      = Dom.aiPill();
  const modeLabel = Dom.aiModeLabel();
  if (pill)      pill.hidden      = !hasKey;
  if (modeLabel) modeLabel.textContent = hasKey ? ' · ✦ Gemini AI' : ' · modo local';
}

// ────────────────────────────────────────────────
// MIC (estado visual)
// ────────────────────────────────────────────────

function setMicListening(listening) {
  const btn      = Dom.btnMic();
  const micIcon  = Dom.micIcon();
  const stopIcon = Dom.micStopIcon();
  if (!btn) return;

  btn.classList.toggle('listening', listening);
  btn.setAttribute('aria-label', listening ? 'Detener grabación' : 'Hablar con ARIA');
  if (micIcon)  micIcon.style.display  = listening ? 'none'  : 'block';
  if (stopIcon) stopIcon.style.display = listening ? 'block' : 'none';
}

// ────────────────────────────────────────────────
// UTILIDADES
// ────────────────────────────────────────────────

function scrollToBottom() {
  const c = Dom.messages();
  requestAnimationFrame(() => c.scrollTo({ top: c.scrollHeight, behavior: 'smooth' }));
}

function updateCounters() {
  const n = UI.msgCount;
  const a = Dom.msgCount();
  const b = Dom.footerMsgCount();
  if (a) a.textContent = n;
  if (b) b.textContent = n;
}

function setInputDisabled(disabled) {
  const input = Dom.input();
  const send  = Dom.btnSend();
  if (input) input.disabled = disabled;
  if (send)  send.disabled  = disabled;
}

function focusInput() {
  setTimeout(() => Dom.input()?.focus(), 60);
}

function escapeHtmlSimple(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// sendMessage se inyecta desde app.js
let sendMessage = () => {};
function setSendMessage(fn) { sendMessage = fn; }
