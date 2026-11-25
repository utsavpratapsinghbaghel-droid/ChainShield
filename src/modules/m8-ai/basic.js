'use strict';
// Backup answers for when Ollama is not running, so the chat never goes silent.
// Simple keyword matching on the same fact sheet and the owner's data. English only.
const inr = (n) => '\u20B9' + Number(n).toLocaleString('en-IN');

const TOPICS = [
  { re: /(at risk|risk|danger|threat|affected)/i, answer: (d) => d.riskLine },
  { re: /(alert|notification|warn)/i, answer: (d) => d.alertLine },
  { re: /(alternative|backup|switch|main supplier|replace)/i, answer: () => 'Every supplier is either main or alternative. Orders use main suppliers. Alternative suppliers are kept as backups. When there is a risk, the alert suggests the best alternative supplier, and if you choose Switch supplier, the order moves to it. You decide; ChainShield never changes an order by itself.' },
  { re: /(supplier|client|transporter|partner)/i, answer: (d) => d.partnerLine },
  { re: /(order)/i, answer: (d) => d.orderLine },
  { re: /(plan|price|pricing|free|premium|subscription|cost|fee|b2b)/i, answer: () => 'There are three tiers. Freemium: free basic local weather and strike alerts. Premium: AI backup-supplier matching, rupee-value risk estimation and SAP Analytics Cloud dashboards. B2B2B partnerships: subsidised distribution through industry clusters, chambers of commerce and large buyers. Prices are not fixed yet.' },
  { re: /(consent|otp|dpdp|privacy|personal data|permission)/i, answer: () => 'Everyone you add (supplier, client, transporter) gets an OTP. Their OTP is their consent to receive ChainShield messages on WhatsApp. You also give consent when you register. This follows India\'s DPDP Act.' },
  { re: /(whatsapp|sms|message)/i, answer: () => 'Alerts are designed to reach you on WhatsApp or SMS with the options inside the message. In this prototype, sending is still being connected through Meta, so alerts appear on the website for now.' },
  { re: /(location|driver|track|gps|where is)/i, answer: () => 'On the Dashboard, tap Request Driver Live Location. Your saved transporter is asked on WhatsApp, and if the driver approves, the location is shared. In this prototype the request is saved, but the WhatsApp message is not sent yet.' },
  { re: /(sap|hana|joule|analytics|btp|integration|cap\b)/i, answer: () => 'ChainShield is built to run on SAP BTP. The plan uses SAP HANA Cloud for the database, SAP CAP for the backend and SAP Integration Suite for the weather feed and WhatsApp. SAP Analytics Cloud, Joule and SAP AI Core are planned and not connected yet.' },
  { re: /(hindi|language|\u0939\u093f\u0928\u094d\u0926\u0940)/i, answer: () => 'The site works in Hindi and English. You pick one at registration and can change it any time in Settings, from the menu at the top right.' },
  { re: /(trust|accurate|why|how does|how do|work|what is|about|chainshield)/i, answer: () => 'ChainShield warns small manufacturers before a disruption such as heavy rain or a strike hits, shows the money at risk in rupees and suggests a backup supplier or reroute. Each alert shows the place, the weather, the expected delay and the reason, and you make the decision.' },
];

function basicAnswer(question, data) {
  for (const t of TOPICS) if (t.re.test(question)) return t.answer(data);
  return 'I do not have that information yet. I can help with your orders, risks and alerts, suppliers, consent, plans and how ChainShield works. For anything else, please ask the Team Veridians.';
}

// Short sentences built from the owner's own data.
function dataLines(parts) {
  const { partners, orders, risks, alerts, name } = parts;
  const byRole = (r) => partners.filter((p) => p.role === r);
  const sup = byRole('supplier');
  const partnerLine = 'You have ' + sup.length + ' suppliers (' + sup.filter((s) => s.supplierType === 'main').length + ' main, ' + sup.filter((s) => s.supplierType === 'alternative').length + ' alternative), ' +
    byRole('client').length + ' clients and ' + byRole('transporter').length + ' transporters.';
  const orderLine = orders.length ? 'You have ' + orders.length + ' order(s): ' + orders.map((o) => o.orderId + ' due ' + o.dueDate).join(', ') + '.' : 'You have no orders yet. Create one in the Orders tab.';
  const atRisk = risks.filter((r) => r.valueAtRiskRupees > 0);
  const riskLine = !risks.length ? 'No risk check has been run yet. Open Risk and alerts and press Check risk now.'
    : atRisk.length ? atRisk.map((r) => name(r.supplierId) + ': ' + inr(r.valueAtRiskRupees) + ' at risk (' + r.riskLevel + ' risk, ' + r.delayDays + '-day delay expected)').join('; ') + '.'
      : 'The latest check shows nothing at risk.';
  const open = alerts.filter((a) => a.status === 'open');
  const alertLine = open.length ? 'You have ' + open.length + ' open alert(s). The latest says: ' + open[open.length - 1].message : 'You have no open alerts.';
  return { partnerLine, orderLine, riskLine, alertLine };
}

module.exports = { basicAnswer, dataLines };
