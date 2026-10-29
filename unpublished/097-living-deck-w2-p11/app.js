/* Nuri — The Living Deck
   One static page. Reads data/*.json next to the page (never an external API), renders it, and
   says plainly when a pack is empty, stale or unreachable. No frameworks, no build step, no
   network requests beyond those local files.

   Everything that touches the DOM runs only in a browser; the pure formatters and the value
   tables are exported so test/page.test.mjs can exercise them in Node. */

export const MISSING = '\u2014';

/* ------------------------------------------------------------------ formatters */

function finite(v) {
  if (v === null || v === undefined || v === '') return null;
  if (typeof v === 'boolean' || typeof v === 'object') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const GROUP = /\B(?=(\d{3})+(?!\d))/g;
const group = (s) => s.replace(GROUP, ',');

export function formatInt(v) {
  const n = finite(v);
  if (n === null) return MISSING;
  const r = Math.round(n);
  return (r < 0 ? '-' : '') + group(String(Math.abs(r)));
}

export function formatEur(v) {
  const n = finite(v);
  if (n === null) return MISSING;
  return (n < 0 ? '-' : '') + '\u20AC' + group(Math.abs(n).toFixed(2));
}

/** Fraction in, percent out: 0.92 -> "92.0%". */
export function formatPct(v) {
  const n = finite(v);
  return n === null ? MISSING : (n * 100).toFixed(1) + '%';
}

export function formatSigned(v, digits = 0) {
  const n = finite(v);
  if (n === null) return MISSING;
  return (n > 0 ? '+' : n < 0 ? '-' : '') + group(Math.abs(n).toFixed(digits));
}

export const formatText = (v) => (v === null || v === undefined || v === '' ? MISSING : String(v));

/** Count of a list/map, or null when there is nothing to count — never a fake zero. */
export function countOf(v) {
  if (Array.isArray(v)) return v.length || null;
  if (v && typeof v === 'object') return Object.keys(v).length || null;
  return finite(v);
}

const sumObj = (o) => Object.values(o).reduce((s, v) => s + (finite(v) ?? 0), 0);
export const sumValues = (v) => (v && typeof v === 'object' ? sumObj(v) : finite(v) ?? 0);

/** Formatters for the shapes that are not a plain number on their own. */
export const formatCount = (v) => formatInt(countOf(v));
export const formatSum = (v) => formatInt(v && typeof v === 'object' ? sumObj(v) || null : v);
export const formatRating = (v) => { const t = formatText(v); return t === MISSING ? MISSING : `${t} / 5`; };

/* ------------------------------------------------------------------ data lookups */

const PACKS = ['github', 'users', 'geo', 'traction', 'swaps', 'onchain', 'addresses', 'bitcoin', 'social', 'traffic', 'product'];

const getPath = (obj, path) => path.split('.').reduce((a, k) => (a === null || a === undefined ? undefined : a[k]), obj);

/** First path that carries something; null when none does. Never invents a value. */
export function pick(obj, ...paths) {
  if (!obj || typeof obj !== 'object') return null;
  for (const p of paths) {
    const v = getPath(obj, p);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

/** Sum of a day->status map, or of an array of {day, statuses} rows. */
export function aggregateStatus(perDay) {
  const days = Array.isArray(perDay)
    ? perDay.map((d) => (d && typeof d === 'object' ? d.statuses ?? d : null))
    : perDay && typeof perDay === 'object' ? Object.values(perDay) : null;
  if (!days) return null;
  const out = {};
  for (const day of days) {
    if (!day || typeof day !== 'object' || Array.isArray(day)) continue;
    for (const [status, n] of Object.entries(day)) out[status] = (out[status] ?? 0) + (finite(n) ?? 0);
  }
  return Object.keys(out).length ? out : null;
}

/** Total swaps per day, oldest first, for the sparkline. */
export function perDaySeries(perDay) {
  if (Array.isArray(perDay)) {
    return perDay
      .filter((d) => d && typeof d === 'object')
      .sort((a, b) => String(a.day ?? '').localeCompare(String(b.day ?? '')))
      .map((d) => sumValues(d.statuses ?? {}));
  }
  if (perDay && typeof perDay === 'object') return Object.keys(perDay).sort().map((d) => sumValues(perDay[d]));
  return [];
}

/** Normalise a supplied share: 92 and 0.92 both mean 92%. */
export const frac = (v) => {
  const n = finite(v);
  return n === null ? null : n > 1 ? n / 100 : n;
};

export const asOf = (v) => {
  const m = String(v ?? '').match(/\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2})?/);
  return m ? m[0].replace('T', ' ') : null;
};

const STALE_DAYS = 7;

function ageDays(v) {
  const m = String(v ?? '').match(/\d{4}-\d{2}-\d{2}/);
  if (!m) return null;
  const t = Date.parse(m[0] + 'T00:00:00Z');
  return Number.isNaN(t) ? null : Math.floor((Date.now() - t) / 86400000);
}

/** Capture window of a pack, as a printable label. */
export function windowLabel(p) {
  const explicit = pick(p, 'metrics.window_label', 'metrics.capture_window', 'metrics.window');
  if (explicit) return formatText(explicit);
  const start = asOf(pick(p, 'metrics.window_start', 'generated_at'));
  const end = asOf(pick(p, 'metrics.window_end', 'metrics.as_of'));
  return start && end ? `${start} \u2192 ${end}` : formatText(start ?? end);
}

/** Object map or array of pairs -> sorted [label, value] rows. */
export function pairs(v) {
  const out = [];
  if (Array.isArray(v)) {
    for (const row of v) {
      if (Array.isArray(row) && row.length >= 2) out.push([String(row[0]), finite(row[1])]);
      else if (row && typeof row === 'object') {
        const label = pick(row, 'label', 'name', 'key', 'week', 'day', 'country', 'path', 'route', 'page', 'platform');
        const value = pick(row, 'value', 'count', 'unique_ips', 'visitors', 'volume', 'total', 'hits', 'commits', 'likes', 'users', 'completed', 'swaps');
        out.push([label === null ? '' : String(label), finite(value)]);
      }
    }
  } else if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) out.push([k, finite(val)]);
  }
  return out;
}

export const series = (v) => pairs(v).map(([, n]) => n).filter((n) => n !== null);

/* ------------------------------------------------------------------ what each tile reports
   Declarative path tables: the same lists the tests read, so a renamed pack key fails a test
   instead of silently printing a dash. Paths are pack-prefixed and resolved against all packs. */

export const ROWS = {
  dev: [
    ['Commits · 30 days', null, ['github.metrics.commits_30d'], formatInt],
    ['Pull requests merged · 30 days', null, ['github.metrics.prs_merged_30d'], formatInt],
    ['Contributors · 90 days', 'sampled author list', ['github.metrics.contributors_90d_count', 'github.metrics.contributors_90d'], formatCount],
    ['Active repositories · 30 days', null, ['github.metrics.repos_active_30d_count', 'github.metrics.repos_active_30d'], formatCount],
  ],
  users: [
    ['Usernames', 'profiles, not people', ['users.metrics.cockpit_summary.values.registeredUsernames', 'users.metrics.banking_kpi.values.usernames', 'users.metrics.registeredUsernames', 'users.metrics.usernames'], formatInt],
    ['Wirex accounts', 'account level, not distinct people', ['users.metrics.cockpit_summary.values.wirexRegistrations', 'users.metrics.banking_kpi.values.wirex_users', 'users.metrics.wirexRegistrations', 'users.metrics.wirexSmartAccounts'], formatInt],
    ['Identity checks approved', 'checks passed, not active users', ['users.metrics.cockpit_summary.values.verificationStatus.Approved', 'users.metrics.banking_kpi.values.kyc_approved', 'users.metrics.kyc_approved'], formatInt],
    ['Funded accounts', 'have held funds at least once', ['users.metrics.cockpit_summary.values.fundedEoas', 'users.metrics.fundedEoas', 'users.metrics.funded_eoas'], formatInt],
    ['Recorded activity · 30 days', 'support and message events, not DAU/MAU', ['users.metrics.activity.values.last30d', 'users.metrics.activity.last30d'], formatInt],
  ],
  geo: [
    ['EU27 share', 'of the profiles with a resolved residence', ['geo.metrics.eu27_share', 'geo.metrics.eu_share'], formatPct],
    ['Germany', 'largest single country in the histogram', ['geo.metrics.germany_share', 'geo.metrics.de_share'], formatPct],
    ['Countries', 'countries in the histogram', ['geo.metrics.countries_total'], formatInt],
  ],
  money: [
    ['Card and bank', 'settled on the Wirex rails · all time', ['traction.metrics.wirex.volume_all_time_eur_display', 'traction.metrics.wirex.volume_all_time_eur', 'traction.metrics.volume_all_time_eur'], formatEur],
    ['Base euro transfers', 'transfers on Base · all time', ['traction.metrics.base.weur_unique_transfer_volume_eur_display', 'traction.metrics.base.weur_unique_transfer_volume_eur'], formatEur],
    ['Payments completed', 'card and bank payments', ['traction.metrics.wirex.completed_card_bank_payments', 'traction.metrics.completed_card_bank_payments'], formatInt],
    ['Balance held now', 'self-custody user funds · not a flow', ['traction.metrics.wirex.total_balance_eur_display', 'traction.metrics.wirex.total_balance_eur'], formatEur],
  ],
  swaps: [
    ['Swaps routed', 'all outcomes included', ['swaps.metrics.totals.transactions', 'swaps.metrics.transactions', 'swaps.metrics.total'], formatInt],
    ['Providers', 'routing providers used', ['swaps.metrics.providers.count', 'swaps.metrics.providers.list', 'swaps.metrics.provider_count', 'swaps.metrics.providers'], formatCount],
    ['Completed', 'operator-reported, not onchain proof', ['swaps.metrics.totals.by_status.COMPLETED', 'swaps.metrics.by_status.COMPLETED', 'swaps.metrics.status_counts.COMPLETED'], formatInt],
    ['Failed', 'shown, not hidden', ['swaps.metrics.totals.by_status.FAILED', 'swaps.metrics.by_status.FAILED', 'swaps.metrics.status_counts.FAILED'], formatInt],
  ],
  onchain: [
    ['Sponsored operations', 'paid by the paymaster', ['onchain.metrics.paymaster_userops', 'onchain.metrics.wirex_userOps', 'onchain.metrics.userops', 'onchain.metrics.user_operations', 'onchain.metrics.paymaster_ops'], formatInt],
    ['Unique smart accounts', 'accounts seen onchain', ['onchain.metrics.unique_kernels', 'onchain.metrics.kernels', 'onchain.metrics.unique_smart_accounts'], formatInt],
    ['Euro transfers on Base', null, ['onchain.metrics.weur_transfers', 'onchain.metrics.base_weur_transfers', 'onchain.metrics.weur_transfer_count'], formatInt],
    ['Gnosis drips', null, ['onchain.metrics.gnosis_dripped', 'onchain.metrics.gnosis_drips'], formatInt],
    ['Euro recipients on Gnosis', null, ['onchain.metrics.gnosis_eureRecipients', 'onchain.metrics.gnosis_eure_recipients'], formatInt],
  ],
  bitcoin: [
    ['Bitcoin profiles', 'profile rows, not people', ['bitcoin.metrics.bitcoin_profiles', 'bitcoin.metrics.bitcoinProfiles', 'bitcoin.metrics.profiles'], formatInt],
    ['Funded onchain addresses', 'measured balance above zero', ['bitcoin.metrics.bitcoin_funded', 'bitcoin.metrics.fundedBitcoinAddresses', 'bitcoin.metrics.funded_onchain'], formatInt],
    ['Arkade profiles', 'profile rows, not people', ['bitcoin.metrics.arkade_profiles', 'bitcoin.metrics.arkadeProfiles', 'bitcoin.metrics.arkade'], formatInt],
    ['Funded Arkade addresses', 'measured balance above zero', ['bitcoin.metrics.arkade_funded', 'bitcoin.metrics.fundedArkadeAddresses', 'bitcoin.metrics.funded_arkade'], formatInt],
  ],
  social: [
    ['Followers · X', null, ['social.metrics.x.followers', 'social.metrics.followers'], formatInt],
    ['Posts · X', null, ['social.metrics.x.posts', 'social.metrics.posts'], formatInt],
    ['Connected accounts', 'accounts we can publish to, not audience', ['social.metrics.platforms', 'social.metrics.post_bridge_accounts'], formatCount],
    ['Reaction counters on recent posts', 'only when the counter type is known', ['social.metrics.x.recent_engagement.0.likes', 'social.metrics.x.recent_engagement.0.reactions'], formatInt],
    ['Verified Nuri brand channels', 'none verified means none claimed', ['social.metrics.nuri_brand_channels'], formatCount],
  ],
  traffic: [
    ['Unique visitors', 'distinct IPs, not people', ['traffic.metrics.unique_ips', 'traffic.metrics.unique_ip_count'], formatInt],
    ['Assistant crawler hits', 'automated reads, not visitors', ['traffic.metrics.llm_crawlers', 'traffic.metrics.crawlers', 'traffic.metrics.assistant_crawlers'], formatSum],
    ['Requests seen', 'before the human/crawler filter', ['traffic.metrics.requests_total'], formatInt],
  ],
  product: [
    ['Countries', 'where the product works', ['product.metrics.countries.count', 'product.metrics.countries_count', 'product.metrics.countries'], formatInt],
    ['Chains', 'with a named address in the registry', ['product.metrics.chains.list', 'product.metrics.chain_list', 'product.metrics.chains'], formatCount],
    ['App version', null, ['product.metrics.app_versions.current', 'product.metrics.app_version', 'product.metrics.version'], formatText],
    ['App store rating', null, ['product.metrics.app_store.rating', 'product.metrics.app_store_rating', 'product.metrics.rating'], formatRating],
  ],
};

/** Resolve one tile's rows against the loaded packs. Exported so tests can prove the paths hit. */
export function values(P, rows) {
  return rows.map(([label, sub, paths, fmt = formatInt]) => ({ label, sub, value: pick(P, ...paths), fmt }));
}

/* ------------------------------------------------------------------ small DOM kit */

const NS = 'http://www.w3.org/2000/svg';

function el(tag, attrs = {}, ...kids) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else node.setAttribute(k, v);
  }
  for (const kid of kids.flat()) {
    if (kid === null || kid === undefined || kid === false) continue;
    node.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return node;
}

function svgNode(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

/** Only http(s) links from data are ever turned into hrefs. */
const safeUrl = (u) => (typeof u === 'string' && /^https?:\/\//i.test(u.trim()) ? u.trim() : null);

const external = (href, label) => el('a', { href, rel: 'noreferrer noopener', target: '_blank' }, label);

function figure(label, value, fmt = formatInt, sub = null) {
  const missing = value === null || value === undefined || value === '' || (typeof value === 'number' && !Number.isFinite(value));
  const text = missing ? MISSING : fmt(value);
  return el('div', { class: 'figure' + (missing || text === MISSING ? ' missing' : '') },
    el('b', {}, text),
    el('span', { class: 'label' }, label),
    sub ? el('span', { class: 'sub' }, sub) : null);
}

const figures = (rows) => el('div', { class: 'figures' }, rows.map(([label, value, fmt, sub]) => figure(label, value, fmt, sub)));

/** The same figure block, straight from a ROWS table. */
const tileFigures = (P, key) => figures(values(P, ROWS[key]).map(({ label, value, fmt, sub }) => [label, value, fmt, sub]));

const caption = (text) => el('p', { class: 'caption' }, text);
const caveat = (text) => el('p', { class: 'note quiet' }, text);

function bars(items, opts = {}) {
  const rows = (items ?? []).filter((r) => r && r[0] !== null && r[0] !== undefined && r[0] !== '');
  if (!rows.length) return null;
  const max = Math.max(...rows.map(([, v]) => finite(v) ?? 0), 1);
  return el('div', { class: 'bars' }, rows.map(([label, value, cls]) => el('div', { class: 'bar' + (cls ? ' ' + cls : '') },
    el('span', { class: 'bar-label', title: String(label) }, String(label)),
    el('span', { class: 'bar-track' }, el('i', { class: 'bar-fill', style: `width:${(((finite(value) ?? 0) / max) * 100).toFixed(1)}%` })), 
    el('span', { class: 'bar-val' }, formatInt(value)))));
}

function spark(values, label, color = 'var(--cobalt)') {
  const w = 340;
  const h = 64;
  const pad = 6;
  const svg = svgNode('svg', { viewBox: `0 0 ${w} ${h}`, class: 'spark', role: 'img', preserveAspectRatio: 'none' });
  svg.setAttribute('aria-label', values.length > 1 ? label : `${label} (no data)`);
  if (values.length > 1) {
    const max = Math.max(...values);
    const min = Math.min(...values);
    const x = (i) => pad + (i * (w - 2 * pad)) / (values.length - 1);
    const y = (v) => h - pad - (max === min ? 0.5 : (v - min) / (max - min)) * (h - 2 * pad);
    svg.append(svgNode('polyline', {
      points: values.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' '),
      class: 'spark-line',
      style: `stroke:${color}`,
    }));
    svg.append(svgNode('circle', { cx: x(values.length - 1).toFixed(1), cy: y(values[values.length - 1]).toFixed(1), r: '3.5', class: 'spark-dot' }));
  }
  return svg;
}

/* ------------------------------------------------------------------ honesty layer: status + evidence */

const EVIDENCE = {
  github: 'indexer', swaps: 'indexer', bitcoin: 'indexer', onchain: 'onchain', addresses: 'onchain',
  users: 'operator', geo: 'operator', traction: 'provider', product: 'operator', social: 'provider', traffic: 'provider',
};

/** 'file' when the page was opened straight from disk: a file:// page cannot read data/*.json. */
export const LOAD_MODE = typeof location !== 'undefined' && location.protocol === 'file:' ? 'file' : 'http';

const FILE_HINT = 'Unavailable here — a file:// page cannot read data/*.json. Serve this folder (python3 -m http.server 8000) and open http://localhost:8000/';

function packState(pack, name) {
  if (!pack) return { kind: 'unavailable', text: LOAD_MODE === 'file' ? FILE_HINT : `Unavailable — data/${name}.json could not be read` };
  const age = ageDays(pack.generated_at);
  const empty = !pack.metrics || typeof pack.metrics !== 'object' || Object.keys(pack.metrics).length === 0;
  if (empty) return { kind: 'empty', text: 'Not yet reported — this pack has no figures yet' };
  if (age === null) return { kind: 'unknown', text: 'Reported, but the pack carries no refresh time' };
  if (age > STALE_DAYS) return { kind: 'stale', text: `Stale — last refreshed ${age} days ago` };
  return { kind: 'fresh', text: age <= 0 ? 'Refreshed today' : `Refreshed ${age} day${age === 1 ? '' : 's'} ago` };
}

function evidenceBlock(pack, name, fallback) {
  const cls = (pack && pick(pack, 'evidence', 'evidence_class', 'class')) ?? (pack ? fallback : 'unknown');
  const cov = pick(pack, 'coverage', 'metrics.coverage', 'metrics.coverage_note', 'metrics.capture_window', 'metrics.window');
  const covText = typeof cov === 'string' || typeof cov === 'number' ? String(cov) : 'not stated by the pack';
  return el('p', { class: 'evidence' },
    el('span', { class: 'cat' }, `evidence: ${cls}`),
    el('span', {}, `observed: ${(pack && asOf(pack.generated_at)) ?? MISSING}`),
    el('span', {}, `coverage: ${covText}`));
}

const statusLine = (state) => el('p', { class: 'status ' + state.kind }, state.text);

function sourceLine(pack, name) {
  if (!pack) return `Source: data/${name}.json — not readable right now · as of ${MISSING}`;
  const src = pick(pack, 'source');
  const obs = asOf(pack.generated_at);
  return `Source: data/${name}.json — ${src ? String(src) : 'source not stated'} · as of ${obs ?? MISSING}`;
}

function addrById(P, id) {
  const list = pick(P.addresses, 'addresses', 'metrics.addresses', 'metrics.registry');
  if (!Array.isArray(list)) return null;
  return list.find((a) => a && typeof a === 'object' && String(a.id ?? '').toLowerCase() === String(id).toLowerCase()) ?? null;
}

/* ------------------------------------------------------------------ tile bodies */

function swapStatus(p) {
  return pick(p, 'metrics.totals.by_status', 'metrics.by_status', 'metrics.status_counts') ?? aggregateStatus(pick(p, 'metrics.per_day', 'per_day'));
}

const RENDER = {
  dev(P) {
    const p = P.github;
    const weekly = series(pick(p, 'metrics.weekly_commits', 'weekly_commits'));
    const out = [tileFigures(P, 'dev')];
    if (weekly.length > 1) out.push(caption('Commits per week'), spark(weekly, 'Commits per week'));
    return out;
  },

  users(P) {
    const p = P.users;
    const out = [tileFigures(P, 'users')];
    const weeks = pairs(pick(p, 'metrics.weekly_new_usernames.values', 'metrics.weekly_new_usernames', 'weekly_new_usernames')).sort((a, b) => a[0].localeCompare(b[0]));
    if (weeks.length) out.push(caption('New signups per week'), bars(weeks));
    const names = pick(p, 'metrics.cockpit_summary.values', 'metrics.banking_kpi.values');
    if (names) out.push(caption('By account type'), bars(pairs({
      usernames: pick(names, 'registeredUsernames', 'usernames'),
      kernels: pick(names, 'wirexSmartAccounts', 'kernels'),
      funded: pick(names, 'fundedEoas', 'fundedWirexSmartAccounts'),
    })));
    out.push(caveat(String(pick(p, 'metrics.basis') ?? 'A username is a profile, not a person; an activity item is not an active app user.')));
    return out;
  },

  geo(P) {
    const p = P.geo;
    const hist = pick(p, 'metrics.full_histogram', 'metrics.by_country', 'metrics.top15_by_country', 'metrics.top', 'by_country');
    const list = pairs(hist).filter(([k]) => k).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    const denom = finite(pick(p, 'metrics.profiles_ok', 'metrics.total_unique_eoas')) ?? list.reduce((s, [, v]) => s + (v ?? 0), 0);
    const de = list.find(([k]) => k.toUpperCase() === 'DE');
    const rows = values(P, ROWS.geo).map(({ label, value, fmt, sub }) => {
      if (label === 'Germany') return [label, de && denom ? de[1] / denom : null, formatPct, denom ? `of ${formatInt(denom)} profiles with a resolved residence` : sub];
      if (label === 'EU27 share') return [label, frac(value), fmt, sub];
      if (label === 'Countries') return [label, value ?? (list.length || null), fmt, list.length ? `${list.length} countries in the histogram` : sub];
      return [label, value, fmt, sub];
    });
    const out = [figures(rows)];
    if (list.length) out.push(caption('Top countries by profiled users'), bars(list.slice(0, 8)));
    out.push(caveat(String(pick(p, 'metrics.coverage_note') ?? pick(p, 'metrics.basis') ?? 'Every share names its denominator; no share is shown without one in the pack.')));
    return out;
  },

  money(P) {
    const p = P.traction;
    const weekly = pairs(pick(p, 'metrics.wirex.weekly_volume_eur', 'wirex.weekly_volume_eur')).sort((a, b) => a[0].localeCompare(b[0]));
    const out = [tileFigures(P, 'money')];
    if (weekly.length) out.push(caption('Weekly volume · card and bank, \u20AC'), bars(weekly));
    out.push(caveat('Card, bank, Base and Gnosis are different rails; they are reported side by side and are never added together. Money moved is gross flow, not revenue.'));
    return out;
  },

  swaps(P) {
    const p = P.swaps;
    const perDay = pick(p, 'metrics.per_day', 'per_day');
    const byStatus = swapStatus(p);
    const total = pick(p, 'metrics.totals.transactions', 'metrics.transactions', 'metrics.total') ?? (perDaySeries(perDay).reduce((s, n) => s + n, 0) || null);
    const routes = pairs(pick(p, 'metrics.top_completed_routes', 'top_completed_routes')).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    const rows = values(P, ROWS.swaps).map(({ label, value, fmt, sub }) => {
      if (label === 'Swaps routed') return [label, value ?? total, fmt, sub];
      if (label === 'Completed' || label === 'Failed') return [label, value ?? (byStatus ? byStatus[label.toUpperCase()] ?? null : null), fmt, sub];
      return [label, value, fmt, sub];
    });
    const out = [figures(rows)];
    const status = Object.entries(byStatus ?? {}).sort((a, b) => b[1] - a[1]);
    if (status.length) out.push(caption('By outcome'), bars(status.map(([k, v]) => [k.toLowerCase().replace(/_/g, ' '), v, /FAIL|EXPIRED|CANCEL/.test(k) ? 'warn' : null])));
    const daily = perDaySeries(perDay);
    if (daily.length > 1) out.push(caption('Swaps per day'), spark(daily, 'Swaps per day', 'var(--sage)'));
    if (routes.length) out.push(caption('Top completed routes'), bars(routes.slice(0, 5)));
    out.push(caveat(String(pick(p, 'metrics.semantics') ?? 'Statuses are operator-reported; COMPLETED is not onchain proof. Amounts are never summed across assets.')));
    return out;
  },

  onchain(P) {
    const p = P.onchain;
    const out = [tileFigures(P, 'onchain')];
    const wanted = [
      ['Sponsored operations', 'nuri_wirex_paymaster'],
      ['Base dripper', 'base_dripper'],
      ['Euro token on Base', 'base_weur_token'],
      ['Gnosis euro token', 'gnosis_eure_token'],
    ];
    const links = wanted.map(([label, id]) => {
      const addr = addrById(P, id);
      const href = addr ? safeUrl(addr.explorer) : null;
      return href ? el('li', {}, `${label}: `, external(href, addr.name || addr.address || 'explorer')) : null;
    }).filter(Boolean);
    if (links.length) out.push(caption('Verify onchain'), el('ul', { class: 'plain' }, links));
    else out.push(caveat('No explorer links yet — data/addresses.json has not reported these addresses.'));
    return out;
  },

  bitcoin(P) {
    const p = P.bitcoin;
    return [
      tileFigures(P, 'bitcoin'),
      caveat(String(pick(p, 'metrics.not_additive_note') ?? 'Counts are per-rail profile and address rows, not holders and not humans; funded counts are never summed across rails.')),
    ];
  },

  social(P) {
    const p = P.social;
    const accounts = pick(p, 'metrics.platforms', 'metrics.post_bridge_accounts', 'metrics.connected_platforms');
    const list = Array.isArray(accounts) ? accounts : [];
    const chip = (a) => {
      if (!a || typeof a !== 'object') return el('span', { class: 'chip' }, String(a));
      const who = [pick(a, 'platform', 'name'), pick(a, 'account', 'handle')].filter(Boolean).map(String).join(' · ');
      const attribution = String(pick(a, 'attribution') ?? '');
      const mine = attribution && !attribution.includes('not_nuri') ? '' : ' — not Nuri brand';
      return el('span', { class: 'chip', title: attribution || null }, who + mine);
    };
    const out = [tileFigures(P, 'social')];
    if (list.length) out.push(caption('Connected accounts'), el('div', { class: 'chips' }, list.slice(0, 12).map(chip)));
    const note = pick(p, 'metrics.platforms_note', 'metrics.reach_note', 'metrics.x.engagement_note');
    if (note) out.push(caveat(String(note)));
    out.push(caveat('Reach, not product usage: a follower or a post is not a banked user.'));
    return out;
  },

  traffic(P) {
    const p = P.traffic;
    const pages = pairs(pick(p, 'metrics.top_pages', 'metrics.pages', 'top_pages')).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    const crawlers = pick(p, 'metrics.llm_crawlers', 'metrics.crawlers', 'metrics.assistant_crawlers');
    const out = [figures([...values(P, ROWS.traffic).map(({ label, value, fmt, sub }) => [label, value, fmt, sub]), ['Window', windowLabel(p), formatText, 'what the sample covers']])];
    if (pages.length) out.push(caption('Top pages by unique visitors'), bars(pages.slice(0, 8)));
    if (crawlers && typeof crawlers === 'object') out.push(caption('Crawlers'), bars(pairs(crawlers).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 6)));
    out.push(caveat(String(pick(p, 'metrics.method_note') ?? 'Crawler requests are automated reads, not visitors; distinct IPs are not people.')));
    return out;
  },

  product(P) {
    const p = P.product;
    const chains = pick(p, 'metrics.chains.list', 'metrics.chain_list', 'metrics.chains');
    const features = pick(p, 'metrics.features', 'features');
    const trust = pick(p, 'metrics.trust', 'metrics.trust_list', 'trust');
    const platforms = pick(p, 'metrics.platforms', 'platforms');
    const out = [tileFigures(P, 'product')];
    if (Array.isArray(chains) && chains.length) out.push(caption('Chains'), el('div', { class: 'chips' }, chains.slice(0, 16).map((c) => el('span', { class: 'chip' }, typeof c === 'object' && c ? formatText(pick(c, 'name', 'label', 'title', 'chain')) : String(c)))));
    if (Array.isArray(features) && features.length) {
      out.push(el('div', { class: 'features' }, features.slice(0, 12).map((f) => (f && typeof f === 'object'
        ? el('div', { class: 'feature' }, el('b', {}, formatText(pick(f, 'name', 'title'))), el('span', { class: 'note quiet' }, formatText(pick(f, 'note', 'detail', 'description'))))
        : el('div', { class: 'feature' }, el('b', {}, String(f)))))));
    }
    if (Array.isArray(trust) && trust.length) {
      out.push(caption('Trust'), el('ul', { class: 'plain' }, trust.slice(0, 8).map((t) => (t && typeof t === 'object'
        ? el('li', {}, el('b', {}, formatText(pick(t, 'item', 'name', 'title', 'label'))), ' — ', el('span', { class: 'note quiet' }, formatText(pick(t, 'evidence', 'detail', 'note'))))
        : el('li', {}, String(t))))));
    }
    const store = pick(p, 'metrics.app_store.url', 'metrics.store_url');
    const href = safeUrl(store);
    if (href) out.push(el('p', { class: 'note quiet' }, 'App store listing: ', external(href, formatText(pick(p, 'metrics.app_store.seller') ?? store))));
    const countryNote = pick(p, 'metrics.countries.note');
    if (countryNote) out.push(caveat(String(countryNote)));
    if (Array.isArray(platforms) && platforms.length) out.push(caption('Platforms'), el('div', { class: 'chips' }, platforms.slice(0, 8).map((pl) => el('span', { class: 'chip' }, typeof pl === 'object' && pl ? `${formatText(pick(pl, 'name'))} · ${formatText(pick(pl, 'verified'))}` : String(pl)))));
    return out;
  },
};

/* ------------------------------------------------------------------ address registry */

const ROLE_ORDER = ['nuri', 'partner', 'token', 'swap-route'];

function addrRows(list) {
  return list.map((a) => {
    const href = safeUrl(a.explorer);
    const role = String(a.role ?? 'unlabelled');
    return el('tr', {},
      el('td', {}, formatText(pick(a, 'name', 'id'))),
      el('td', {}, el('span', { class: 'role ' + role }, role)),
      el('td', {}, formatText(pick(a, 'chain'))),
      el('td', { class: 'mono' }, formatText(pick(a, 'address'))),
      el('td', {}, href ? external(href, 'Explorer') : el('span', { class: 'note quiet' }, 'no link')));
  });
}

const addrTable = (rows) => el('div', { class: 'table-wrap' }, el('table', {},
  el('thead', {}, el('tr', {}, ['Name', 'Role', 'Chain', 'Address', 'Explorer'].map((h) => el('th', {}, h)))),
  el('tbody', {}, rows)));

function renderRegistry(P) {
  const pack = P.addresses;
  const list = pick(pack, 'addresses', 'metrics.registry');
  if (!Array.isArray(list) || !list.filter((a) => a && typeof a === 'object').length) {
    return [el('p', { class: 'note quiet' }, 'No addresses reported yet — this table fills from data/addresses.json.')];
  }
  const all = list.filter((a) => a && typeof a === 'object');
  const ours = all.filter((a) => String(a.role) !== 'infra-not-ours');
  const infra = all.filter((a) => String(a.role) === 'infra-not-ours');
  const roles = ['all', ...ROLE_ORDER.filter((r) => ours.some((a) => String(a.role) === r)), ...[...new Set(ours.map((a) => String(a.role ?? 'unlabelled')))].filter((r) => !ROLE_ORDER.includes(r))];

  const main = el('div');
  const select = el('select', { id: 'role-filter', 'aria-label': 'Filter addresses by role' }, roles.map((r) => el('option', { value: r }, r === 'all' ? 'All roles' : r)));
  const infraBox = el('details', { class: 'disclosure' },
    el('summary', {}, `Infrastructure that is not ours (${infra.length})`),
    infra.length ? addrTable(addrRows(infra)) : el('p', { class: 'note quiet' }, 'None reported.'));

  const draw = () => {
    const shown = ours.filter((a) => select.value === 'all' || String(a.role ?? 'unlabelled') === select.value);
    main.replaceChildren(shown.length ? addrTable(addrRows(shown)) : el('p', { class: 'note quiet' }, 'No address with this role in the pack.'));
    infraBox.hidden = select.value !== 'all';
  };
  select.addEventListener('change', draw);
  draw();

  const links = all.filter((a) => safeUrl(a.explorer)).length;
  return [
    el('div', { class: 'controls' }, el('label', { for: 'role-filter' }, 'Role'), select),
    main,
    infraBox,
    el('p', { class: 'note quiet' }, `${formatInt(all.length)} addresses in the pack · ${formatInt(links)} carry an explorer link. Infrastructure entries are kept separate and hidden by default. Every address can be re-checked on its explorer.`),
  ];
}

/* ------------------------------------------------------------------ hero, method, chat */

const HERO = [
  ['Usernames', ['users.metrics.cockpit_summary.values.registeredUsernames', 'users.metrics.banking_kpi.values.usernames', 'users.metrics.registeredUsernames'], formatInt],
  ['Wirex accounts', ['users.metrics.cockpit_summary.values.wirexRegistrations', 'users.metrics.banking_kpi.values.wirex_users', 'users.metrics.wirexRegistrations'], formatInt],
  ['Money moved · card and bank', ['traction.metrics.wirex.volume_all_time_eur_display', 'traction.metrics.wirex.volume_all_time_eur'], formatEur],
  ['Money moved · Base transfers', ['traction.metrics.base.weur_unique_transfer_volume_eur_display', 'traction.metrics.base.weur_unique_transfer_volume_eur'], formatEur],
  ['Swaps routed', ['swaps.metrics.totals.transactions', 'swaps.metrics.transactions', 'swaps.metrics.total'], formatInt],
  ['Sponsored operations', ['onchain.metrics.paymaster_userops', 'onchain.metrics.wirex_userOps', 'onchain.metrics.userops'], formatInt],
];

const SECTIONS = [
  ['Development momentum', ['github']],
  ['Users and growth', ['users']],
  ['Where users are', ['geo']],
  ['Money moved', ['traction']],
  ['Swaps', ['swaps']],
  ['Onchain footprint', ['onchain']],
  ['Address registry', ['addresses']],
  ['Bitcoin', ['bitcoin']],
  ['Social', ['social']],
  ['Traffic', ['traffic']],
  ['Product and trust', ['product']],
];

const TILES = [
  ['dev', 'github'], ['users', 'users'], ['geo', 'geo'], ['money', 'traction'], ['swaps', 'swaps'],
  ['onchain', 'onchain'], ['bitcoin', 'bitcoin'], ['social', 'social'], ['traffic', 'traffic'], ['product', 'product'],
];

function renderHero(P) {
  const strip = document.querySelector('[data-mount="hero-strip"]');
  if (strip) strip.replaceChildren(...HERO.map(([label, paths, fmt]) => figure(label, pick(P, ...paths), fmt)));
  const reported = PACKS.filter((n) => P[n] && P[n].metrics && Object.keys(P[n].metrics).length);
  const status = document.querySelector('[data-mount="hero-status"]');
  if (status) {
    status.textContent = reported.length
      ? `${reported.length} of ${PACKS.length} packs report figures; ${PACKS.length - reported.length} are empty, stale or unreachable — those cards say so instead of showing a zero.`
      : LOAD_MODE === 'file'
        ? `${FILE_HINT} Nothing below is a number until the packs load.`
        : `No pack reports figures yet. Every number below is a dash until the refresh scripts run; each card names its state.`;
  }
  const dates = PACKS.map((n) => asOf(P[n] && P[n].generated_at)).filter(Boolean).sort();
  const meta = document.querySelector('[data-mount="hero-meta"]');
  if (meta) {
    meta.textContent = `Newest refresh in the deck: ${dates.length ? dates[dates.length - 1] : MISSING} · packs reporting: ${reported.length} of ${PACKS.length}${dates.length ? ` · four newest: ${dates.slice(-4).reverse().join(' · ')}` : ''}`;
  }
}

function renderMethod(P) {
  const dl = document.querySelector('[data-mount="method"]');
  if (!dl) return;
  dl.replaceChildren(...SECTIONS.flatMap(([title, packs]) => [
    el('dt', {}, title),
    el('dd', {}, packs.map((n) => `${sourceLine(P[n], n)}${packState(P[n], n).kind === 'empty' ? ' · not yet reported' : ''}`).join(' — ')),
  ]));
}

function hideIllustrations() {
  for (const img of document.querySelectorAll('img.illo')) {
    const hide = () => { img.hidden = true; };
    img.addEventListener('error', hide, { once: true });
    if (img.complete && img.naturalWidth === 0) hide();
  }
}

function initChat() {
  const panel = document.querySelector('.chat-panel');
  const fab = document.querySelector('.chat-fab');
  const form = document.querySelector('[data-chat-form]');
  const input = document.querySelector('#chat-input');
  const out = document.querySelector('[data-mount="chat-answer"]');
  if (!panel || !fab || !form || !input || !out) return;

  fab.addEventListener('click', () => {
    panel.hidden = !panel.hidden;
    fab.setAttribute('aria-expanded', String(!panel.hidden));
    if (!panel.hidden) input.focus();
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const q = input.value.trim();
    if (!q) return;
    out.replaceChildren(el('p', { class: 'note quiet' }, 'Asking…'));
    try {
      const res = await fetch(new URL('ask', base()), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q }),
      });
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      const answer = typeof data === 'string' ? data : formatText(pick(data, 'answer', 'text', 'reply'));
      const sources = pick(data, 'sources', 'source', 'references');
      out.replaceChildren(el('p', { class: 'note' }, answer));
      if (Array.isArray(sources) && sources.length) {
        out.append(el('ul', { class: 'sources' }, sources.slice(0, 8).map((s) => {
          const label = s && typeof s === 'object' ? formatText(pick(s, 'title', 'name', 'label', 'url')) : String(s);
          const href = safeUrl(s && typeof s === 'object' ? pick(s, 'url', 'link') : s);
          return el('li', {}, href ? external(href, label) : label);
        })));
      }
      input.value = '';
    } catch {
      out.replaceChildren(el('p', { class: 'note quiet' }, 'The read-only agent is offline.'));
    }
  });
}

/* ------------------------------------------------------------------ boot */

const base = () => {
  const b = (typeof document !== 'undefined' && document.baseURI) || './';
  return b.endsWith('/') ? b : b + '/';
};

async function loadPacks() {
  if (LOAD_MODE === 'file') return {}; // a file:// page cannot read the packs; say so instead of logging errors
  const results = await Promise.allSettled(PACKS.map(async (n) => {
    const res = await fetch(new URL(`data/${n}.json`, base()), { cache: 'no-cache' });
    if (!res.ok) throw new Error(`${n}: HTTP ${res.status}`);
    return res.json();
  }));
  const packs = {};
  PACKS.forEach((n, i) => { packs[n] = results[i].status === 'fulfilled' ? results[i].value : null; });
  return packs;
}

async function boot() {
  hideIllustrations();
  const P = await loadPacks();
  renderHero(P);
  for (const [slug, pack] of TILES) {
    const mount = document.querySelector(`[data-mount="${slug}"]`);
    const src = document.querySelector(`[data-src="${slug}"]`);
    if (src) src.textContent = sourceLine(P[pack], pack);
    if (!mount) continue;
    try {
      mount.replaceChildren(statusLine(packState(P[pack], pack)), evidenceBlock(P[pack], pack, EVIDENCE[pack]), ...RENDER[slug](P));
    } catch (err) {
      mount.replaceChildren(statusLine({ kind: 'unavailable', text: `This card could not render (${err.message})` }));
    }
  }
  const registry = document.querySelector('[data-mount="registry"]');
  if (registry) {
    const src = document.querySelector('[data-src="registry"]');
    if (src) src.textContent = sourceLine(P.addresses, 'addresses');
    registry.replaceChildren(statusLine(packState(P.addresses, 'addresses')), evidenceBlock(P.addresses, 'addresses', EVIDENCE.addresses), ...renderRegistry(P));
  }
  renderMethod(P);
  initChat();
}

export const MOUNTS = ['hero-strip', 'hero-status', 'hero-meta', 'dev', 'users', 'geo', 'money', 'swaps', 'onchain', 'bitcoin', 'registry', 'social', 'traffic', 'product', 'method', 'chat-answer'];

if (typeof document !== 'undefined') {
  boot().catch((err) => {
    const node = document.querySelector('[data-mount="hero-status"]');
    if (node) node.textContent = `The deck could not render: ${err.message}`;
  });
}
