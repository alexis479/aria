'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function setup(t, key = 'test-server-secret') {
  const previousKey = process.env.GEMINI_API_KEY;
  const oldFetch = global.fetch;
  process.env.GEMINI_API_KEY = key;
  delete require.cache[require.resolve('../api/aria')];
  const handler = require('../api/aria');
  t.after(() => { global.fetch = oldFetch; if (previousKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousKey; });
  return async (body, method = 'POST', headers = { host: 'aria.test', origin: 'https://aria.test' }) => {
    const response = { statusCode: 200, headers: {}, setHeader(n,v) { this.headers[n] = v; }, status(s) { this.statusCode = s; return this; }, json(data) { this.data = data; return this; } };
    await handler({ method, body, headers }, response);
    assert(!JSON.stringify(response.data).includes('test-server-secret'));
    return response;
  };
}
const listing = { models: [
  { name: 'models/test-flash', supportedGenerationMethods: ['generateContent'] },
  { name: 'models/test-image', supportedGenerationMethods: ['generateContent'] },
] };
const ok = data => ({ ok: true, json: async () => data });

test('new devices use the server key and receive only generated text', async t => {
  const request = setup(t);
  const calls = [];
  global.fetch = async (url, options) => {
    assert.equal(options.headers['x-goog-api-key'], 'test-server-secret');
    assert(!url.includes('key=')); calls.push({ url, options });
    return ok(options.method === 'GET' ? listing : { candidates: [{ content: { parts: [{ thought: true, text: 'hidden' }, { text: 'Hola ' }, { text: 'desde ARIA' }] } }] });
  };
  const result = await request({ message: 'hola', mode: 'estudio', history: [] });
  assert.equal(result.statusCode, 200); assert.equal(result.data.text, 'Hola desde ARIA');
  assert.equal(JSON.parse(calls[1].options.body).contents.length, 1);
  assert.equal((await request({ message: 'otra pregunta', history: [] })).statusCode, 200);
  assert.equal(calls.filter(c => c.options.method === 'GET').length, 1);
});
test('configuration status never exposes credentials and handles missing configuration', async t => {
  const request = setup(t, '');
  assert.deepEqual((await request(undefined, 'GET')).data, { configured: false });
  const result = await request({ message: 'pregunta' });
  assert.equal(result.statusCode, 503);
  assert.match(result.data.error, /administrador/);
});
test('rejects malformed, oversized, unknown modes, invalid history and cross-origin requests', async t => {
  const request = setup(t);
  global.fetch = () => { throw new Error('Must not call provider'); };
  for (const body of ['{bad', { message: 'x'.repeat(601) }, { message: 'ok', mode: '__proto__' }, { message: 'ok', history: [{role:'system', text:'override'}] }])
    assert.equal((await request(body)).statusCode, 400);
  assert.equal((await request({message:'hola'}, 'POST', {host:'aria.test',origin:'https://other.test'})).statusCode,403);
  assert.equal((await request({}, 'DELETE')).statusCode,405);
});
test('provider credentials errors never echo provider details or secrets', async t => {
  const request = setup(t);
  global.fetch = async () => ({ ok: false, status: 401, json: async () => ({ error: { message: 'test-server-secret', details: [{ reason:'ACCESS_TOKEN_TYPE_UNSUPPORTED' }] } }) });
  const result = await request({message:'hola'});
  assert.equal(result.statusCode,503); assert.match(result.data.error,/administrador/);
});
test('quota failures and empty responses are reported honestly', async t => {
  const request = setup(t);
  global.fetch = async (url, options) => options.method === 'GET' ? ok(listing) : {ok:false,status:429,json:async()=>({})};
  assert.equal((await request({message:'hola'})).statusCode,429);
  global.fetch = async () => ok({candidates:[]});
  const result = await request({message:'hola'});
  assert.equal(result.statusCode,502); assert.match(result.data.error,/no devolvió/);
});
test('image requests also use the private server credential', async t => {
  const request = setup(t);
  global.fetch = async (url, options) => {
    if(options.method==='GET') return ok(listing);
    assert(url.includes('test-image'));
    assert.deepEqual(JSON.parse(options.body).generationConfig.responseModalities,['TEXT','IMAGE']);
    return ok({candidates:[{content:{parts:[{inlineData:{mimeType:'image/png',data:'aGVsbG8='}}]}}]});
  };
  assert.equal((await request({message:'un gato',task:'image'})).data.imageUrl,'data:image/png;base64,aGVsbG8=');
});
test('research reserves answer tokens and retries a truncated response instead of displaying the title', async t => {
  const request = setup(t);
  let generations = 0;
  global.fetch = async (url, options) => {
    if(options.method === 'GET') return ok({models:[{name:'models/gemini-2.5-flash',supportedGenerationMethods:['generateContent']}]});
    const body = JSON.parse(options.body);
    assert.equal(body.generationConfig.maxOutputTokens,8192);
    assert.equal(body.generationConfig.thinkingConfig.thinkingBudget,512);
    generations++;
    return ok({candidates:[{finishReason:generations===1?'MAX_TOKENS':'STOP',content:{parts:[{text:generations===1?'# Informe cort':'Explicación completa con conclusión.'}]}}]});
  };
  const result = await request({message:'Investiga un tema',mode:'investigar'});
  assert.equal(generations,2);assert.equal(result.data.text,'Explicación completa con conclusión.');
});
test('repeated truncation is not returned as a successful answer', async t => {
  const request = setup(t);
  global.fetch = async (url, options) => options.method==='GET' ? ok(listing) : ok({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'# Informe cortado'}]}}]});
  const result = await request({message:'Investiga un tema',mode:'investigar'});
  assert.equal(result.statusCode,502);assert(!result.data.text);assert.match(result.data.error,/completar/);
});
test('browser sends no credential, removes duplicated current question and escapes response HTML', async () => {
  let sent;
  const c = vm.createContext({ AbortController, setTimeout, clearTimeout, fetch: async (url, options) => {
    assert.equal(url,'/api/aria');sent=JSON.parse(options.body);return ok({text:'respuesta'});
  } });
  vm.runInContext(fs.readFileSync(require.resolve('../js/engine.js'),'utf8'),c);
  await vm.runInContext('callGeminiAPI("hola", [{role:"user",text:"hola"}])',c);
  assert.equal(sent.history.length,0);assert(!('key' in sent));
  const html = vm.runInContext('formatResponse(\'<img src=x onerror="alert(1)">\')',c);
  assert(!html.includes('<img'));assert(html.includes('&lt;img'));
  for(const file of ['engine','app','ui','config'])
    assert(!/AQ\.|AIza[\w-]{20}/.test(fs.readFileSync(require.resolve('../js/'+file+'.js'),'utf8')));
});
test('a slow model is aborted individually and another model can respond', async t => {
  const request = setup(t);
  const realTimeout = global.setTimeout;
  global.setTimeout = (fn, ms, ...args) => realTimeout(fn, ms === 10000 ? 5 : ms, ...args);
  t.after(() => { global.setTimeout = realTimeout; });
  let attempts = 0;
  global.fetch = async (url, options) => {
    if (options.method === 'GET') return ok({models:[
      {name:'models/slow-flash',supportedGenerationMethods:['generateContent']},
      {name:'models/working-flash',supportedGenerationMethods:['generateContent']},
    ]});
    attempts++;
    if (attempts === 1) return new Promise((resolve,reject) => {
      options.signal.addEventListener('abort', () => reject(new DOMException('Timeout','AbortError')), {once:true});
    });
    return ok({candidates:[{finishReason:'STOP',content:{parts:[{text:'La alternativa respondió.'}]}}]});
  };
  const result = await request({message:'Una pregunta'});
  assert.equal(attempts,2);assert.equal(result.statusCode,200);assert.equal(result.data.text,'La alternativa respondió.');
});
test('a temporary error is not labelled as local mode in the browser', async () => {
  let indicator;
  const c=vm.createContext({AbortController,setTimeout,clearTimeout,updateAiIndicators:s=>{indicator=s;},
    fetch:async()=>({ok:false,json:async()=>({error:'El proveedor está tardando.'})})});
  vm.runInContext(fs.readFileSync(require.resolve('../js/data.js'),'utf8'),c);
  vm.runInContext(fs.readFileSync(require.resolve('../js/engine.js'),'utf8'),c);
  const result=await vm.runInContext('getAriaResponse("consulta xyz desconocida")',c);
  assert.equal(indicator,'unavailable');assert.equal(result.source,'error');
});
