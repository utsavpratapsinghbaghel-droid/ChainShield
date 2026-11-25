'use strict';
// M8 Ask AI. Owner: Virat Sahu.
// Provides: GET /ai/status     POST /ai/chat { message, language?, history? }  ->  { reply, source, model }
//
// The AI is Ollama, running on the laptop. Every question is sent together with the ChainShield fact sheet
// and the owner's own data, so it answers from facts. If Ollama is not running, simple keyword answers are used instead.
const fs = require('fs');
const path = require('path');
const { HttpError, requireFields } = require('../../lib/http');
const ollama = require('./ollama');
const { basicAnswer, dataLines } = require('./basic');

const FACT_SHEET = fs.readFileSync(
  path.join(__dirname, 'factsheet.md'),
  'utf8'
);
const inr = (n) => '\u20B9' + Number(n).toLocaleString('en-IN');

function gather(store, business) {
  const partners = [...store.partners.values()].filter((p) => p.businessId === business.businessId);
  const orders = [...store.orders.values()].filter((o) => o.businessId === business.businessId);
  const ids = new Set(orders.map((o) => o.orderId));
  const risks = orders.flatMap((o) => store.risks.get(o.orderId) || []);
  const alerts = [...store.alerts.values()].filter((a) => ids.has(a.orderId));
  const name = (id) => (store.partners.get(id) || {}).name || id;
  return { partners, orders, risks, alerts, name };
}

function ownerText(store, business) {
  const d = gather(store, business);
  const out = ['OWNER DATA', 'Owner: ' + (business.name || business.mobile) + (business.address ? ' (' + business.address + ')' : '')];
  ['supplier', 'client', 'transporter'].forEach((role) => {
    const list = d.partners.filter((p) => p.role === role);
    out.push(role[0].toUpperCase() + role.slice(1) + 's: ' + (list.length ? list.map((p) => p.name + (role === 'supplier' ? ' (' + p.supplierType + ')' : '') + ', ' + p.address).join('; ') : 'none'));
  });
  out.push('Orders:');
  if (!d.orders.length) out.push('- none');
  d.orders.forEach((o) => {
    out.push('- ' + o.orderId + ', client ' + d.name(o.clientId) + ', due ' + o.dueDate + ', buffer ' + o.bufferDays + ' days, status ' + o.status + '. Lines: ' +
      o.lines.map((l) => d.name(l.supplierId) + ' ' + inr(l.valueRupees) + ' [' + l.status + ']').join('; '));
    (store.risks.get(o.orderId) || []).forEach((r) => out.push('  Latest risk check: ' + d.name(r.supplierId) + ', ' + r.riskLevel + ' risk, ' + inr(r.valueAtRiskRupees) + ' at risk, ' + r.delayDays + '-day delay. ' + r.reason));
  });
  out.push('Alerts: ' + (d.alerts.length ? '' : 'none'));
  d.alerts.forEach((a) => out.push('- ' + a.status + (a.chosen ? ' (chosen: ' + a.chosen + ', saved ' + inr(a.savedRupees) + ')' : '') + ': ' + a.message));
  const total = d.orders.reduce((s, o) => s + o.lines.reduce((x, l) => x + l.valueRupees, 0), 0);
  const open = d.alerts.filter((a) => a.status === 'open').reduce((s, a) => s + a.valueAtRiskRupees, 0);
  const saved = d.alerts.reduce((s, a) => s + (a.savedRupees || 0), 0);
  out.push('Totals: ' + d.orders.length + ' orders, order value ' + inr(total) + ', value at risk in open alerts ' + inr(open) + ', money saved ' + inr(saved) + '.');
  return out.join('\n');
}

function systemPrompt(store, business, language) {
  return [
    'You are the ChainShield assistant for a small Indian manufacturer (an MSME owner).',
    'Answer ONLY from the FACT SHEET and the OWNER DATA below. Never invent facts, numbers, prices or features.',
    'If the answer is not there, say you do not know and suggest asking Team Veridians.',
    'Keep answers short (at most 4 sentences), in simple words, with no technical jargon. Write rupee amounts with the \u20B9 sign.',
    'Reply in the language the owner writes in. If unsure, reply in ' + (language === 'hi' ? 'Hindi' : 'English') + '.',
    'Never say something is working if the fact sheet says it is planned or simulated.',
    '',
    'FACT SHEET',
    FACT_SHEET,
    '',
    ownerText(store, business),
  ].join('\n');
}

function cleanHistory(history) {
  if (!Array.isArray(history)) return [];
  return history.slice(-6)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }));
}

function register(router, store) {
  router.get('/ai/status', async () => {
    const s = await ollama.status();
    return { available: s.available, model: s.model, mode: s.available ? 'ollama' : 'basic' };
  });

  router.post('/ai/chat', async ({ body, business }) => {
    requireFields(body, ['message']);
    const message = String(body.message).trim().slice(0, 600);
    if (!message) throw new HttpError(400, 'Type a question first');

    const s = await ollama.status();
    if (s.available) {
      try {
        const messages = [{ role: 'system', content: systemPrompt(store, business, body.language) }, ...cleanHistory(body.history), { role: 'user', content: message }];
        const reply = await ollama.chat(s.model, messages);
        return { reply, source: 'ollama', model: s.model };
      } catch (e) {
        console.error('Ollama failed, using basic answer:', e.message);
        await ollama.status(true); // look again next time
      }
    }
    const d = gather(store, business);
    return { reply: basicAnswer(message, dataLines(d)), source: 'basic', model: null };
  });
}

module.exports = { register };
