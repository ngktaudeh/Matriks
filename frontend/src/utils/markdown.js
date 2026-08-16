/**
 * Lightweight markdown → React-safe HTML renderer.
 * Supports: headings, bold, italic, code blocks, inline code,
 * links, unordered/ordered lists, horizontal rules, line breaks.
 * Tidak memakai library eksternal agar bundle tetap kecil.
 */

const escapeHtml = (s) =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const renderInline = (text) => {
  let t = escapeHtml(text);
  // code
  t = t.replace(/`([^`]+)`/g, '<code class="md-code">$1</code>');
  // bold
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/__([^_]+)__/g, "<strong>$1</strong>");
  // italic
  t = t.replace(/\*([^*]+)\*/g, "<em>$1</em>");
  t = t.replace(/_([^_]+)_/g, "<em>$1</em>");
  // links
  t = t.replace(
    /\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
  );
  // bare URLs
  t = t.replace(
    /(^|[\s(])(https?:\/\/[^\s)<]+)/g,
    '$1<a href="$2" target="_blank" rel="noopener noreferrer" class="md-link">$2</a>'
  );
  return t;
};

/**
 * Convert markdown string to HTML string.
 */
export const markdownToHtml = (md) => {
  if (!md) return "";
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let inCode = false;
  let codeLang = "";
  let codeBuf = [];
  let inUl = false;
  let inOl = false;

  const closeLists = () => {
    if (inUl) {
      out.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      out.push("</ol>");
      inOl = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // fenced code
    const fence = line.match(/^```(\w*)\s*$/);
    if (fence) {
      if (inCode) {
        out.push(
          `<pre class="md-pre"><code class="md-code-block${codeLang ? ` language-${codeLang}` : ""}">${escapeHtml(
            codeBuf.join("\n")
          )}</code></pre>`
        );
        codeBuf = [];
        inCode = false;
        codeLang = "";
      } else {
        closeLists();
        inCode = true;
        codeLang = fence[1] || "";
      }
      continue;
    }
    if (inCode) {
      codeBuf.push(line);
      continue;
    }

    // hr
    if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      closeLists();
      out.push('<hr class="md-hr" />');
      continue;
    }

    // headings
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      closeLists();
      const level = h[1].length;
      out.push(`<h${level} class="md-h${level}">${renderInline(h[2])}</h${level}>`);
      continue;
    }

    // unordered list
    const ul = line.match(/^[-*+]\s+(.+)$/);
    if (ul) {
      if (inOl) {
        out.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        out.push('<ul class="md-ul">');
        inUl = true;
      }
      out.push(`<li>${renderInline(ul[1])}</li>`);
      continue;
    }

    // ordered list — pertahankan nomor asli agar tidak semua jadi "1."
    const ol = line.match(/^(\d+)[.)]\s+(.+)$/);
    if (ol) {
      if (inUl) {
        out.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        out.push('<ol class="md-ol">');
        inOl = true;
      }
      out.push(`<li value="${ol[1]}">${renderInline(ol[2])}</li>`);
      continue;
    }

    // blank line
    if (/^\s*$/.test(line)) {
      closeLists();
      out.push("<br />");
      continue;
    }

    // paragraph
    closeLists();
    out.push(`<p class="md-p">${renderInline(line)}</p>`);
  }

  closeLists();
  if (inCode) {
    out.push(
      `<pre class="md-pre"><code class="md-code-block">${escapeHtml(codeBuf.join("\n"))}</code></pre>`
    );
  }

  return out.join("\n");
};
