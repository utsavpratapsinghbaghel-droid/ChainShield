'use strict';
// Talks to Ollama, a free AI model that runs on this laptop. Nothing is sent to the internet.
// Settings (optional): OLLAMA_URL (default http://127.0.0.1:11434) and OLLAMA_MODEL (default: pick one that is installed).
const BASE = process.env.OLLAMA_URL || 'http://127.0.0.1:11434';
const PREFERRED = ['llama3.2', 'qwen2.5', 'gemma3', 'gemma2', 'phi3', 'llama3.1', 'mistral'];

async function fetchJson(path, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(BASE + path, { ...options, signal: controller.signal });
    if (!res.ok) throw new Error('Ollama answered ' + res.status);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

function pickModel(models) {
  if (process.env.OLLAMA_MODEL) return process.env.OLLAMA_MODEL;
  const chat = models.filter((m) => !/embed/i.test(m.name));
  for (const prefix of PREFERRED) {
    const hit = chat.find((m) => m.name.toLowerCase().startsWith(prefix));
    if (hit) return hit.name;
  }
  chat.sort((a, b) => (a.size || 0) - (b.size || 0));
  return chat.length ? chat[0].name : null;
}

let cache = { at: 0, info: { available: false, model: null, models: [] } };

// Is Ollama running, and which model will we use? Cached for a few seconds.
async function status(force) {
  if (!force && Date.now() - cache.at < 8000) return cache.info;
  let info;
  try {
    const tags = await fetchJson('/api/tags', {}, 1500);
    const models = tags.models || [];
    const model = pickModel(models);
    info = { available: Boolean(model), model, models: models.map((m) => m.name) };
  } catch (e) {
    info = { available: false, model: null, models: [] };
  }
  cache = { at: Date.now(), info };
  return info;
}

async function chat(model, messages) {
  const data = await fetchJson('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: false, options: { temperature: 0.2, num_predict: 350 } }),
  }, 90000);
  const text = data && data.message && data.message.content ? String(data.message.content).trim() : '';
  if (!text) throw new Error('Empty answer from Ollama');
  return text;
}

module.exports = { status, chat };
