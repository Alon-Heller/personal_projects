// Shared helpers for the player and the editor: answer hashing, Markdown, small DOM utils.
(function () {
  'use strict';

  // ---------- SHA-256 (sync, so it works on file:// and in every browser) ----------
  const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ]);
  const ror = (x, n) => (x >>> n) | (x << (32 - n));

  function sha256(str) {
    const msg = new TextEncoder().encode(str);
    const len = msg.length;
    const buf = new Uint8Array(((len + 9 + 63) >> 6) << 6);
    buf.set(msg);
    buf[len] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(buf.length - 8, Math.floor((len * 8) / 2 ** 32));
    dv.setUint32(buf.length - 4, (len * 8) >>> 0);
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64);
    for (let off = 0; off < buf.length; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4);
      for (let i = 16; i < 64; i++) {
        const s0 = ror(w[i - 15], 7) ^ ror(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = ror(w[i - 2], 17) ^ ror(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
      }
      let [a, b, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) {
        const t1 = (h + (ror(e, 6) ^ ror(e, 11) ^ ror(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
        const t2 = ((ror(a, 2) ^ ror(a, 13) ^ ror(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
        h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = b; b = a; a = (t1 + t2) >>> 0;
      }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
      H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map((x) => x.toString(16).padStart(8, '0')).join('');
  }

  // ---------- Answers ----------
  // Case, spaces, punctuation and accents/niqqud don't matter: "Soup for two!" === "SOUPFORTWO".
  function normalizeAnswer(s) {
    return String(s || '')
      .normalize('NFKD')
      .toUpperCase()
      .replace(/[^\p{L}\p{N}]/gu, '');
  }
  function hashAnswer(salt, answer) {
    const n = normalizeAnswer(answer);
    return n ? sha256(salt + '|' + n) : null;
  }

  // ---------- Markdown (small, puzzle-friendly subset; inline HTML is allowed) ----------
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function inline(s, images) {
    const codes = [];
    s = s.replace(/`([^`]+)`/g, (_, c) => { codes.push(esc(c)); return '\u0000' + (codes.length - 1) + '\u0000'; });
    s = s.replace(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g, (_, alt, src, title) => {
      const real = src.startsWith('img:') ? (images && images[src.slice(4)]) || '' : src;
      return `<img src="${esc(real)}" alt="${esc(alt)}"${title ? ` title="${esc(title)}"` : ''}>`;
    });
    s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, href) => `<a href="${esc(href)}" target="_blank" rel="noopener">${t}</a>`);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/(^|[^*])\*(?!\s)(.+?)\*(?!\*)/g, '$1<em>$2</em>');
    s = s.replace(/~~(.+?)~~/g, '<del>$1</del>');
    return s.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${codes[i]}</code>`);
  }

  const RAW_BLOCK = /^\s*<\/?(div|table|thead|tbody|tr|td|th|p|ul|ol|li|iframe|svg|figure|section|details|summary|center|h[1-6]|pre|blockquote|img|br|hr|style|audio|video|span|a)\b/i;

  function markdown(src, images) {
    if (!src) return '';
    const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let i = 0;
    const isBlockStart = (l) =>
      /^```/.test(l) || /^#{1,4}\s/.test(l) || /^\s*\|/.test(l) || /^>/.test(l) ||
      /^\s*[-*+]\s+/.test(l) || /^\s*\d+[.)]\s+/.test(l) || /^(-{3,}|\*{3,})\s*$/.test(l) || RAW_BLOCK.test(l);

    while (i < lines.length) {
      const line = lines[i];
      let m;
      if (/^\s*$/.test(line)) { i++; continue; }

      if ((m = line.match(/^```(.*)$/))) {
        const buf = [];
        i++;
        while (i < lines.length && !/^```/.test(lines[i])) buf.push(lines[i++]);
        i++;
        out.push(`<pre class="mono">${esc(buf.join('\n'))}</pre>`);
        continue;
      }
      if ((m = line.match(/^(#{1,4})\s+(.*)$/))) {
        const lvl = m[1].length + 1;
        out.push(`<h${lvl}>${inline(m[2], images)}</h${lvl}>`);
        i++;
        continue;
      }
      if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push('<hr>'); i++; continue; }

      if (/^\s*\|/.test(line)) {
        const rows = [];
        while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(lines[i++]);
        const cells = (r) => r.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
        const isSep = (r) => /^\s*\|?\s*:?-{2,}/.test(r) && /^[\s|:-]+$/.test(r);
        let html = '<table>';
        let body = rows;
        if (rows.length > 1 && isSep(rows[1])) {
          html += '<thead><tr>' + cells(rows[0]).map((c) => `<th>${inline(c, images)}</th>`).join('') + '</tr></thead>';
          body = rows.slice(2);
        }
        html += '<tbody>' + body.map((r) => '<tr>' + cells(r).map((c) => `<td>${inline(c, images)}</td>`).join('') + '</tr>').join('') + '</tbody></table>';
        out.push(`<div class="table-wrap">${html}</div>`);
        continue;
      }
      if (/^>/.test(line)) {
        const buf = [];
        while (i < lines.length && /^>/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''));
        out.push(`<blockquote>${markdown(buf.join('\n'), images)}</blockquote>`);
        continue;
      }
      const listRe = /^\s*([-*+]|\d+[.)])\s+(.*)$/;
      if (listRe.test(line)) {
        const ordered = /^\s*\d/.test(line);
        const items = [];
        while (i < lines.length && listRe.test(lines[i]) && /^\s*\d/.test(lines[i]) === ordered) {
          items.push(lines[i++].match(listRe)[2]);
        }
        const tag = ordered ? 'ol' : 'ul';
        out.push(`<${tag}>${items.map((it) => `<li>${inline(it, images)}</li>`).join('')}</${tag}>`);
        continue;
      }
      if (RAW_BLOCK.test(line)) {
        const buf = [];
        while (i < lines.length && !/^\s*$/.test(lines[i])) buf.push(lines[i++]);
        out.push(buf.join('\n'));
        continue;
      }
      // Paragraph: single newlines are kept as line breaks (puzzles care about line layout).
      const buf = [line];
      i++;
      while (i < lines.length && !/^\s*$/.test(lines[i]) && !isBlockStart(lines[i])) buf.push(lines[i++]);
      out.push(`<p>${buf.map((l) => inline(l, images)).join('<br>')}</p>`);
    }
    return out.join('\n');
  }

  // ---------- DOM ----------
  function h(tag, attrs, ...children) {
    const el = document.createElement(tag);
    let value;
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v == null || v === false) continue;
      if (k === 'value') value = v; // applied after children so <select> options exist
      else if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'style' && typeof v === 'object') {
        for (const [prop, val] of Object.entries(v)) {
          if (prop.startsWith('--')) el.style.setProperty(prop, val);
          else el.style[prop] = val;
        }
      }
      else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== 'string') el[k] = v;
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (const c of children.flat(Infinity)) {
      if (c == null || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    if (value !== undefined) el.value = value;
    return el;
  }

  const uid = (prefix) => prefix + '-' + Math.random().toString(36).slice(2, 8);

  window.HuntCore = { sha256, normalizeAnswer, hashAnswer, markdown, esc, h, uid };
})();
