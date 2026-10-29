/* Nuri — The Living Deck
   One static page. Reads data/*.json next to the page (never an external API), renders it, and
   says plainly when a pack is empty, stale or unreachable. No frameworks, no build step.

   Everything that touches the DOM runs only in a browser; the pure formatters are exported so
   test/page.test.mjs can exercise them in Node. */

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

/* ------------------------------------------------------------------ data lookups */

const PACKS = ['github', 'users', 'geo', 'traction', 'swaps', 'onchain', 'addresses', 'bitcoin', 'social', 'traffic', 'product'];

const getPath = (obj, path) => path.split('.').reduce((a, k) => (a === null || a === undefined ? undefined : a[k]), obj);

function pick(obj, ...paths) {
  if (!obj || typeof obj !== 'object') return null;
  for (const p of paths) {
    const v = getPath(obj, p);
    if (v !== undefined && v !== null && v !== '') return v;
  }
  return null;
}

/** Count of a list/map, or null when there is nothing to count — never a fake zero. */
function countOf(v) {
  if (Array.isArray(v)) return v.length || null;
  if (v && typeof v === 'object') return Object.keys(v).length || null;
  return finite(v);
}

const sumObj = (o) => Object.values(o).reduce((s, v) => s + (finite(v) ?? 0), 0);
const sumValues = (v) => (v && typeof v === 'object' ? sumObj(v) : finite(v) ?? 0);

function aggregateStatus(perDay) {
  if (!perDay || typeof perDay !== 'object') return null;
  const out = {};
  for (const day of Object.values(perDay)) {
    if (!day || typeof day !== 'object') continue;
    for (const [status, n] of Object.entries(day)) out[status] = (out[status] ?? 0) + (finite(n) ?? 0);
  }
  return Object.keys(out).length ? out : null;
}

/** Normalise a supplied share: 92 and 0.92 both mean 92%. */
const frac = (v) => {
  const n = finite(v);
  return n === null ? null : n > 1 ? n / 100 : n;
};

const asOf = (v) => {
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
  return el('div', { class: 'figure' + (missing ? ' missing' : '') },
    el('b', {}, missing ? MISSING : fmt(value)),
    el('span', { class: 'label' }, label),
    sub ? el('span', { class: 'sub' }, sub) : null);
}

const figures = (rows) => el('div', { class: 'figures' }, rows.map(([label, value, fmt, sub]) => figure(label, value, fmt, sub)));

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

/** Object map or array of pairs -> sorted [label, value] rows. */
function pairs(v) {
  const out = [];
  if (Array.isArray(v)) {
    for (const row of v) {
      if (Array.isArray(row) && row.length >= 2) out.push([String(row[0]), finite(row[1])]);
      else if (row && typeof row === 'object') {
        const label = pick(row, 'label', 'name', 'key', 'week', 'country', 'path', 'route', 'page');
        const value = pick(row, 'value', 'count', 'unique_ips', 'visitors', 'volume', 'total', 'hits', 'likes', 'users');
        out.push([label === null ? '' : String(label), finite(value)]);
      }
    }
  } else if (v && typeof v === 'object') {
    for (const [k, val] of Object.entries(v)) out.push([k, finite(val)]);
  }
  return out;
}

const series = (v) => pairs(v).map(([, n]) => n).filter((n) => n !== null);

/* ------------------------------------------------------------------ honesty layer: status + evidence */

const EVIDENCE = {
  github: 'indexer', swaps: 'indexer', bitcoin: 'indexer', onchain: 'onchain', addresses: 'onchain',
  users: 'operator', geo: 'operator', traction: 'provider', product: 'operator', social: 'provider', traffic: 'provider',
};

function packState(pack, name) {
  if (!pack) return { kind: 'unavailable', text: `Unavailable — data/${name}.json could not be read` };
  const age = ageDays(pack.generated_at);
  const empty = !pack.metrics || typeof pack.metrics !== 'object' || Object.keys(pack.metrics).length === 0;
  if (empty) return { kind: 'empty', text: 'Not yet reported — this pack has no figures yet' };
  if (age === null) return { kind: 'unknown', text: 'Reported, but the pack carries no refresh time' };
  if (age > STALE_DAYS) return { kind: 'stale', text: `Stale — last refreshed ${age} days ago` };
  return { kind: 'fresh', text: age <= 0 ? 'Refreshed today' : `Refreshed ${age} day${age === 1 ? '' : 's'} ago` };
}

function evidenceBlock(pack, name, fallback) {
  const cls = (pack && pick(pack, 'evidence', 'evidence_class', 'class')) ?? (pack ? fallback : 'unknown');
  const cov = pick(pack, 'coverage', 'metrics.coverage', 'metrics.capture_window', 'metrics.window', 'coverage_note');
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

const RENDER = {
  dev(P) {
    const p = P.github;
    const weekly = series(pick(p, 'metrics.weekly_commits', 'weekly_commits'));
    const out = [figures([
      ['Commits · 30 days', pick(p, 'metrics.commits_30d', 'commits_30d'), formatInt],
      ['Pull requests merged · 30 days', pick(p, 'metrics.prs_merged_30d', 'prs_merged_30d'), formatInt],
      ['Contributors · 90 days', countOf(pick(p, 'metrics.contributors_90d', 'contributors_90d')), formatInt],
      ['Active repositories · 30 days', countOf(pick(p, 'metrics.repos_active_30d', 'repos_active_30d')) ?? pick(p, 'metrics.repos_active_30d_count'), formatInt],
    ])];
    if (weekly.length > 1) out.push(caption('Commits per week'), spark(weekly, 'Commits per week'));
    return out;
  },

  users(P) {
    const p = P.users;
    const out = [figures([
      ['Usernames', pick(p, 'metrics.registeredUsernames', 'metrics.usernames', 'metrics.users'), formatInt, 'profiles, not people'],
      ['Wirex accounts', pick(p, 'metrics.wirexRegistrations', 'metrics.wirexSmartAccounts', 'metrics.wirex_users'), formatInt, 'accounts opened'],
      ['Identity checks approved', pick(p, 'metrics.verificationStatus.Approved', 'metrics.kyc_approved'), formatInt, 'checks passed, not active users'],
      ['Funded accounts', pick(p, 'metrics.fundedEoas', 'metrics.funded_eoas', 'metrics.funded'), formatInt, 'have held funds at least once'],
      ['Recorded activity · 30 days', pick(p, 'metrics.activity.last30d', 'activity.last30d'), formatInt, 'support and message events'],
    ])];
    const weeks = pairs(pick(p, 'metrics.weekly_new_usernames', 'weekly_new_usernames')).sort((a, b) => a[0].localeCompare(b[0]));
    if (weeks.length) out.push(caption('New signups per week'), bars(weeks));
    out.push(caveat('A username is a profile, not a person. A support message or activity item is not an active app user.'));
    return out;
  },

  geo(P) {
    const p = P.geo;
    const hist = pick(p, 'metrics.by_country', 'metrics.by_nationality_top', 'metrics.top', 'by_country');
    const list = pairs(hist).filter(([k]) => k).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    const total = list.reduce((s, [, v]) => s + (v ?? 0), 0);
    const de = list.find(([k]) => k.toUpperCase() === 'DE');
    const denom = pick(p, 'metrics.profiles_ok', 'metrics.total_unique_eoas', 'profiles_ok');
    const out = [figures([
      ['EU share', frac(pick(p, 'metrics.eu_share', 'eu_share')), formatPct, denom ? `as reported, of ${formatInt(denom)} profiles` : 'as reported by the pack'],
      ['Germany', de && total ? de[1] / total : null, formatPct, total ? `of ${formatInt(total)} profiled users` : null],
      ['Countries', list.length || countOf(pick(p, 'metrics.countries_total')) || null, formatInt, list.length ? 'countries in this histogram' : 'as reported'],
    ])];
    if (list.length) out.push(caption('Top countries by profiled users'), bars(list.slice(0, 8)));
    out.push(caveat('Every share on this page names its denominator; no share is shown without one in the pack.'));
    return out;
  },

  money(P) {
    const p = P.traction;
    const weekly = pairs(pick(p, 'metrics.wirex.weekly_volume_eur', 'wirex.weekly_volume_eur')).sort((a, b) => a[0].localeCompare(b[0]));
    const out = [figures([
      ['Card and bank', pick(p, 'metrics.wirex.volume_all_time_eur', 'metrics.volume_all_time_eur', 'wirex.volume_all_time_eur'), formatEur, 'settled on the Wirex rails · all time'],
      ['Base euro transfers', pick(p, 'metrics.base.weur_unique_transfer_volume_eur', 'base.weur_unique_transfer_volume_eur'), formatEur, 'transfers on Base · all time'],
      ['Payments completed', pick(p, 'metrics.wirex.completed_card_bank_payments'), formatInt, 'card and bank payments'],
      ['Balance held now', pick(p, 'metrics.wirex.current_total_balance_eur'), formatEur, 'not a flow'],
    ])];
    if (weekly.length) out.push(caption('Weekly volume · card and bank, €'), bars(weekly));
    out.push(caveat('Card, bank and Base are different rails; they are reported side by side and are never added together. Money moved is not revenue.'));
    return out;
  },

  swaps(P) {
    const p = P.swaps;
    const perDay = pick(p, 'metrics.per_day', 'per_day');
    const byStatus = pick(p, 'metrics.by_status', 'metrics.status_counts', 'by_status') ?? aggregateStatus(perDay);
    const total = pick(p, 'metrics.transactions', 'metrics.total', 'transactions') ?? (perDay && typeof perDay === 'object' ? sumObj(perDay) || null : null);
    const routes = pairs(pick(p, 'metrics.top_completed_routes', 'top_completed_routes')).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    const out = [figures([
      ['Swaps routed', total, formatInt, 'all outcomes included'],
      ['Providers', countOf(pick(p, 'metrics.providers', 'metrics.provider_count', 'providers')), formatInt, 'routing providers'],
      ['Completed', byStatus ? byStatus.COMPLETED ?? null : null, formatInt],
      ['Failed', byStatus ? byStatus.FAILED ?? null : null, formatInt, 'shown, not hidden'],
    ])];
    const status = Object.entries(byStatus ?? {}).sort((a, b) => b[1] - a[1]);
    if (status.length) out.push(caption('By outcome'), bars(status.map(([k, v]) => [k.toLowerCase().replace(/_/g, ' '), v, /FAIL|EXPIRED|CANCEL/.test(k) ? 'warn' : null])));
    const daily = perDay && typeof perDay === 'object' ? Object.keys(perDay).sort().map((d) => sumValues(perDay[d])) : [];
    if (daily.length > 1) out.push(caption('Swaps per day'), spark(daily, 'Swaps per day', 'var(--sage)'));
    if (routes.length) out.push(caption('Top completed routes'), bars(routes.slice(0, 5)));
    return out;
  },

  onchain(P) {
    const p = P.onchain;
    const out = [figures([
      ['Sponsored operations', pick(p, 'metrics.paymaster_userops', 'metrics.wirex_userOps', 'metrics.paymaster_ops'), formatInt, 'paid by the paymaster'],
      ['Unique smart accounts', pick(p, 'metrics.unique_kernels', 'metrics.kernels'), formatInt, 'accounts seen onchain'],
      ['Euro transfers on Base', pick(p, 'metrics.weur_transfers'), formatInt],
      ['Gnosis drips', pick(p, 'metrics.gnosis_dripped'), formatInt],
      ['Euro recipients on Gnosis', pick(p, 'metrics.gnosis_eureRecipients'), formatInt],
    ])];
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
    return [figures([
      ['Bitcoin profiles', pick(p, 'metrics.bitcoinProfiles', 'metrics.bitcoin_profiles', 'metrics.profiles'), formatInt, 'profiles, not people'],
      ['Funded onchain addresses', pick(p, 'metrics.fundedBitcoinAddresses', 'metrics.funded_onchain'), formatInt, 'have received funds'],
      ['Arkade profiles', pick(p, 'metrics.arkadeProfiles', 'metrics.arkade_profiles', 'metrics.arkade'), formatInt],
      ['Funded Arkade addresses', pick(p, 'metrics.fundedArkadeAddresses', 'metrics.funded_arkade'), formatInt, 'have received funds'],
    ])];
  },

  social(P) {
    const p = P.social;
    const accounts = pick(p, 'metrics.post_bridge_accounts', 'metrics.connected_platforms', 'metrics.platforms');
    const eng = pick(p, 'metrics.x.recent_engagement', 'metrics.recent_engagement', 'metrics.recent_posts');
    const latest = Array.isArray(eng) && eng.length ? eng[0] : null;
    const out = [figures([
      ['Followers · X', pick(p, 'metrics.x.followers', 'metrics.x_followers', 'metrics.followers'), formatInt],
      ['Posts · X', pick(p, 'metrics.x.posts', 'metrics.x_posts', 'metrics.posts'), formatInt],
      ['Reactions on latest post', latest ? pick(latest, 'likes', 'reactions', 'engagement') : null, formatInt, latest ? `posted ${asOf(pick(latest, 'date')) ?? MISSING}` : null],
      ['Connected platforms', countOf(accounts), formatInt, 'accounts we can publish to'],
    ])];
    if (Array.isArray(accounts) && accounts.length) out.push(caption('Connected platforms'), el('div', { class: 'chips' }, accounts.slice(0, 12).map((a) => el('span', { class: 'chip' }, String(a).replace(':', ' · ')))));
    if (Array.isArray(eng) && eng.length) {
      out.push(caption('Recent posts'), el('ul', { class: 'plain' }, eng.slice(0, 3).map((e) => el('li', {},
        `${asOf(pick(e, 'date')) ?? MISSING} · ${formatInt(pick(e, 'likes', 'reactions'))} reactions · ${formatText(pick(e, 'topic', 'title'))}`))));
    }
    out.push(caveat('Reach, not product usage: a follower or a post is not a banked user.'));
    return out;
  },

  traffic(P) {
    const p = P.traffic;
    const pages = pairs(pick(p, 'metrics.top_pages', 'metrics.pages', 'top_pages')).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0));
    const crawlers = pick(p, 'metrics.llm_crawlers', 'metrics.crawlers', 'metrics.assistant_crawlers');
    const out = [figures([
      ['Unique visitors', pick(p, 'metrics.unique_ips', 'metrics.unique_ip_count'), formatInt, 'distinct IPs, not people'],
      ['Assistant crawler hits', crawlers && typeof crawlers === 'object' ? sumObj(crawlers) || null : crawlers, formatInt, 'automated requests, not visitors'],
      ['Window', pick(p, 'metrics.capture_window', 'metrics.window', 'capture_window'), formatText],
    ])];
    if (pages.length) out.push(caption('Top pages by unique visitors'), bars(pages.slice(0, 8)));
    if (crawlers && typeof crawlers === 'object') out.push(caption('Crawlers'), bars(pairs(crawlers).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0)).slice(0, 6)));
    out.push(caveat('Crawler requests are automated reads, not visitors.'));
    return out;
  },

  product(P) {
    const p = P.product;
    const chains = pick(p, 'metrics.chains', 'metrics.chain_list', 'chains');
    const features = pick(p, 'metrics.features', 'features');
    const trust = pick(p, 'metrics.trust', 'metrics.trust_list', 'trust');
    const out = [figures([
      ['Countries', pick(p, 'metrics.countries', 'metrics.countries_count'), formatInt, 'where the product works'],
      ['Chains', countOf(chains), formatInt],
      ['App version', pick(p, 'metrics.app_version', 'metrics.version', 'app_version'), formatText],
      ['App store rating', pick(p, 'metrics.app_store_rating', 'metrics.rating', 'app_store_rating'), (v) => `${formatText(v)} / 5`],
    ])];
    const chip = (c) => el('span', { class: 'chip' }, typeof c === 'object' && c ? formatText(pick(c, 'name', 'label', 'title', 'chain')) : String(c));
    if (Array.isArray(chains) && chains.length) out.push(caption('Chains'), el('div', { class: 'chips' }, chains.slice(0, 16).map(chip)));
    if (Array.isArray(features) && features.length) {
      out.push(el('div', { class: 'features' }, features.slice(0, 12).map((f) => (typeof f === 'object' && f
        ? el('div', { class: 'feature' }, el('b', {}, formatText(pick(f, 'name', 'title'))), formatText(pick(f, 'detail', 'description')))
        : el('div', { class: 'feature' }, String(f))))));
    }
    if (Array.isArray(trust) && trust.length) out.push(caption('Trust'), el('ul', { class: 'plain' }, trust.slice(0, 8).map((t) => el('li', {}, typeof t === 'object' && t ? formatText(pick(t, 'name', 'title', 'label')) : String(t)))));
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
  const list = pick(pack, 'addresses', 'metrics.addresses', 'metrics.registry');
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
    el('p', { class: 'note quiet' }, `${formatInt(all.length)} addresses in the pack · ${formatInt(links)} carry an explorer link. Infrastructure entries are kept separate and hidden by default.`),
  ];
}

/* ------------------------------------------------------------------ hero, method, chat */

const HERO = [
  ['Usernames', 'users', ['metrics.registeredUsernames', 'metrics.usernames', 'metrics.users'], formatInt],
  ['Wirex accounts', 'users', ['metrics.wirexRegistrations', 'metrics.wirexSmartAccounts', 'metrics.wirex_users'], formatInt],
  ['Money moved · card and bank', 'traction', ['metrics.wirex.volume_all_time_eur', 'metrics.volume_all_time_eur'], formatEur],
  ['Money moved · Base transfers', 'traction', ['metrics.base.weur_unique_transfer_volume_eur'], formatEur],
  ['Swaps routed', 'swaps', ['metrics.transactions', 'metrics.total'], formatInt],
  ['Sponsored operations', 'onchain', ['metrics.paymaster_userops', 'metrics.wirex_userOps'], formatInt],
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
  if (strip) strip.replaceChildren(...HERO.map(([label, pack, paths, fmt]) => figure(label, pick(P[pack], ...paths), fmt)));
  const reported = PACKS.filter((n) => P[n] && P[n].metrics && Object.keys(P[n].metrics).length);
  const status = document.querySelector('[data-mount="hero-status"]');
  if (status) {
    status.textContent = reported.length
      ? `${reported.length} of ${PACKS.length} packs report figures; ${PACKS.length - reported.length} are empty, stale or unreachable — those cards say so instead of showing a zero.`
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
          const label = typeof s === 'object' && s ? formatText(pick(s, 'title', 'name', 'label', 'url')) : String(s);
          const href = safeUrl(typeof s === 'object' && s ? pick(s, 'url', 'link') : s);
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
  const b = document.baseURI || './';
  return b.endsWith('/') ? b : b + '/';
};

async function loadPacks() {
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
    for (const sel of ['[data-mount="hero-status"]']) {
      const node = document.querySelector(sel);
      if (node) node.textContent = `The deck could not render: ${err.message}`;
    }
  });
}
