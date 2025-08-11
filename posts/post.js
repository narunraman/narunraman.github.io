// Post-specific JS extracted from llms_information_economics.html
(function() {
  // Prevent double init if script is loaded or executed twice
  if (window.__postInitDone) return; 
  window.__postInitDone = true;

  // Helper to read site-wide mobile breakpoint from CSS var
  function getBreakpoint() {
    const rootStyles = getComputedStyle(document.documentElement);
    const val = rootStyles.getPropertyValue('--mobile-breakpoint').trim();
    const n = parseInt(val, 10);
    return isNaN(n) ? 530 : n;
  }
  // Optional larger breakpoint for placing ToC inline earlier (tablet widths)
  function getInlineBreakpoint() {
    const rootStyles = getComputedStyle(document.documentElement);
    const val = rootStyles.getPropertyValue('--toc-inline-breakpoint').trim();
    const n = parseInt(val, 10);
    return isNaN(n) ? 1200 : n; // default 1200px
  }

  // MathJax typeset helper
  function typesetMath(root) {
    try {
      if (window.MathJax?.typesetPromise) return window.MathJax.typesetPromise([root]);
      if (window.MathJax?.typeset) window.MathJax.typeset([root]);
    } catch (e) {}
  }

  function slugify(text) {
    return (text || '')
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  // Ensure only one TOC exists in the DOM
  function dedupeTOC() {
    const tocs = document.querySelectorAll('nav.toc-nav');
    if (tocs.length > 1) {
      for (let i = 1; i < tocs.length; i++) {
        tocs[i].parentNode && tocs[i].parentNode.removeChild(tocs[i]);
      }
    }
    const toc = document.querySelector('nav.toc-nav');
    if (toc && !toc.querySelector('#toc-list')) {
      const ol = document.createElement('ol');
      ol.id = 'toc-list';
      ol.className = 'toc-list';
      toc.appendChild(ol);
    }
  }

  // Switch ToC between floating (desktop) and inline (below <hr>) using a width-based toggle
  function updateTOCMode() {
    const toc = document.querySelector('.toc-nav');
    const main = document.querySelector('main.post-wrap');
    if (!toc || !main) return;

    const isInline = window.innerWidth <= getInlineBreakpoint();

    if (isInline) {
      // Place inline below first <hr>
      const hr = main.querySelector('hr');
      if (hr && hr.nextSibling !== toc) {
        hr.parentNode.insertBefore(toc, hr.nextSibling);
      }
      toc.classList.add('toc-inline');
      toc.style.display = '';
      toc.style.left = '';
    } else {
      toc.classList.remove('toc-inline');
      toc.style.display = '';
    }
  }

  function positionTOC() {
    const toc = document.querySelector('.toc-nav');
    const main = document.querySelector('main.post-wrap');
    if (!toc || !main) return;
    // Skip positioning when inline
    if (toc.classList.contains('toc-inline')) {
      toc.style.display = '';
      toc.style.left = '';
      return;
    }
    const rect = main.getBoundingClientRect();
    const tocW = toc.offsetWidth || 220;
    const gap = 24; // space between TOC and content
    const minGap = 8; // minimum margin from viewport
    const available = rect.left; // space to the left of content
    if (available < (tocW + minGap + 4)) {
      // Not enough space in floating mode; hide ToC instead of overlapping
      toc.style.display = 'none';
      return;
    }
    toc.style.display = '';
    const left = Math.round(rect.left - tocW - gap);
    toc.style.left = Math.max(minGap, left) + 'px';
  }

  // Align ToC top with the first H2 (unless locked by data-lock-top)
  function alignTOCTop() {
    const toc = document.querySelector('.toc-nav');
    if (!toc) return;
    if (toc.classList.contains('toc-inline')) return; // inline mode, no fixed top
    if (toc.hasAttribute('data-lock-top')) return; // allow page-level override
    const firstH2 = document.querySelector('main.post-wrap h2');
    if (!firstH2) return;
    const y = firstH2.getBoundingClientRect().top; // viewport-relative
    const minTop = 120; // keep below navbar
    const top = Math.max(minTop, Math.round(y));
    toc.style.top = top + 'px';
  }

  function buildTOC() {
    const container = document.querySelector('main.post-wrap');
    const tocList = document.getElementById('toc-list');
    if (!container || !tocList) return;

    const headings = Array.from(container.querySelectorAll('h2, h3'));
    const used = new Set();
    headings.forEach(h => {
      if (!h.id) {
        let base = slugify(h.textContent || 'section');
        let id = base, i = 2;
        while (used.has(id) || document.getElementById(id)) { id = base + '-' + i++; }
        h.id = id;
        used.add(id);
      }
    });

    const frag = document.createDocumentFragment();
    headings.forEach(h => {
      const li = document.createElement('li');
      li.className = 'toc-' + h.tagName.toLowerCase();
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent || h.id;
      a.addEventListener('click', e => {
        e.preventDefault();
        document.getElementById(h.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', '#' + h.id);
      });
      li.appendChild(a);
      frag.appendChild(li);
    });
    tocList.innerHTML = '';
    tocList.appendChild(frag);

    // Scroll spy based on scroll position
    const toc = document.querySelector('.toc-nav');
    const idToItem = new Map();
    Array.from(tocList.children).forEach(li => {
      const href = li.querySelector('a')?.getAttribute('href') || '';
      if (href.startsWith('#')) idToItem.set(href.slice(1), li);
    });

    let positions = [];
    function computePositions() {
      positions = headings.map(h => h.getBoundingClientRect().top + window.scrollY);
    }
    function currentOffset() {
      const comp = window.getComputedStyle(toc);
      const t = parseInt(comp.top || '140', 10);
      return isNaN(t) ? 140 : t + 10;
    }
    function setActiveByScroll() {
      const pos = window.scrollY + currentOffset();
      let idx = 0;
      for (let i = 0; i < positions.length; i++) {
        if (positions[i] <= pos) idx = i; else break;
      }
      document.querySelectorAll('.toc-list li').forEach(li => li.classList.remove('active'));
      const h = headings[idx];
      const li = h ? idToItem.get(h.id) : null;
      if (li) li.classList.add('active');
    }

    // Initial and responsive positioning/highlighting
    computePositions();
    updateTOCMode();
    positionTOC();
    alignTOCTop();
    setActiveByScroll();

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(() => { computePositions(); updateTOCMode(); alignTOCTop(); setActiveByScroll(); });
    }
    setTimeout(() => { computePositions(); updateTOCMode(); alignTOCTop(); setActiveByScroll(); }, 600);

    window.addEventListener('scroll', setActiveByScroll, { passive: true });
    window.addEventListener('resize', () => {
      computePositions();
      updateTOCMode();
      positionTOC();
      alignTOCTop();
      setActiveByScroll();
    }, { passive: true });
    window.addEventListener('load', () => {
      computePositions();
      updateTOCMode();
      positionTOC();
      alignTOCTop();
      setActiveByScroll();
    });
  }

  function fetchBib() {
    const BIB_URL = '/posts/ref.bib';
    return fetch(BIB_URL, { cache: 'no-store' }).then(r => r.ok ? r.text() : '').catch(() => '');
  }

  function formatName(raw) {
    if (!raw) return '';
    const s = raw.replace(/[{}]/g, '').trim();
    if (!s) return '';
    if (s.includes(',')) {
      const [last] = s.split(',').map(x => x.trim());
      return (last || s).trim();
    }
    const parts = s.split(/\s+/);
    return parts.length ? parts[parts.length - 1] : s;
  }

  function parseBib(tex) {
    const map = new Map();
    let i = 0; const n = tex.length;
    function skipWS() { while (i < n && /\s/.test(tex[i])) i++; }
    while (i < n) {
      if (tex[i] !== '@') { i++; continue; }
      i++; // skip '@'
      while (i < n && /[a-zA-Z]/.test(tex[i])) i++; // type
      skipWS();
      if (tex[i] !== '{' && tex[i] !== '(') continue;
      const open = tex[i]; const close = open === '{' ? '}' : ')';
      i++;
      let key = '';
      while (i < n && tex[i] !== ',' && tex[i] !== close) { key += tex[i++]; }
      key = key.trim();
      if (tex[i] !== ',') { while (i < n && tex[i] !== close) i++; i++; continue; }
      i++; // skip comma
      let depth = 1; let bodyStart = i; let bodyEnd = i;
      while (i < n && depth > 0) { if (tex[i] === open) depth++; else if (tex[i] === close) depth--; i++; if (depth > 0) bodyEnd = i; }
      const body = tex.slice(bodyStart, bodyEnd);
      const fields = {};
      let j = 0; const m = body.length;
      function readName() { let s=''; while (j < m && /\s|,/.test(body[j])) j++; while (j < m && /[A-Za-z0-9_]/.test(body[j])) s += body[j++]; return s.trim(); }
      function readValue() {
        while (j < m && /\s|=/.test(body[j])) j++;
        if (j >= m) return '';
        let ch = body[j];
        if (ch === '{') { let d=1; j++; let start=j; while (j < m && d>0) { if (body[j]==='{') d++; else if (body[j] === '}') d--; j++; } return body.slice(start, j-1).trim(); }
        else if (ch === '"') { j++; let start=j; while (j < m && body[j] !== '"') j++; const val = body.slice(start, j); j++; return val.trim(); }
        else { let s=''; while (j < m && body[j] !== ',' && body[j] !== '\n') s += body[j++]; return s.trim(); }
      }
      while (j < m) {
        const name = readName();
        if (!name) break;
        while (j < m && body[j] !== '=') j++;
        const val = readValue();
        fields[name.toLowerCase()] = val;
        while (j < m && body[j] !== ',') j++;
        if (body[j] === ',') j++;
      }
      const authors = (fields.author || '').split(/\s+and\s+/i).map(formatName).filter(Boolean);
      const year = (fields.year || '').toString().trim();
      const title = (fields.title || '').replace(/\s+/g, ' ').replace(/[{}]/g, '').trim();
      const venue = fields.journal || fields.booktitle || fields.publisher || '';
      const url = fields.doi ? ('https://doi.org/' + fields.doi) : (fields.url || '');
      map.set(key, { authors, year, title, venue, url });
    }
    return map;
  }

  function authorYearLabel(entry) {
    if (!entry) return 'Unknown';
    const n = entry.authors.length;
    const base = n === 0 ? 'Unknown' : (n === 1 ? entry.authors[0] : (entry.authors[0] + ' et al.'));
    return base + (entry.year ? ', ' + entry.year : '');
  }

  function buildInlineLabel(keys, kind) { // 'cite' | 'citep'
    const labels = keys.map(k => authorYearLabel(window.__bibMap?.get(k) || null));
    if (kind === 'citep') return '(' + labels.join('; ') + ')';
    return labels.join('; ');
  }

  function toggleCitationNote(anchor, keys) {
    if (window.__openNote && window.__openNote.anchor === anchor) { closeNote(); return; }
    closeNote();
    const note = document.createElement('div');
    note.className = 'citation-note';
    const closeBtn = document.createElement('button');
    closeBtn.className = 'note-close'; closeBtn.type = 'button'; closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', closeNote);
    note.appendChild(closeBtn);
    keys.forEach(k => {
      const e = window.__bibMap?.get(k);
      const item = document.createElement('div'); item.className = 'note-item';
      if (e) {
        const strong = document.createElement('strong'); strong.textContent = (e.authors[0] || 'Unknown') + (e.year ? ' (' + e.year + ')' : '');
        const rest = document.createElement('span'); rest.textContent = e.title ? (': ' + e.title) : '';
        item.appendChild(strong); item.appendChild(rest);
        if (e.url) {
          const sep = document.createTextNode(' ');
          const link = document.createElement('a'); link.href = e.url; link.target = '_blank'; link.rel = 'noopener noreferrer'; link.textContent = '[link]';
          item.appendChild(sep); item.appendChild(link);
        }
      } else {
        item.textContent = k;
      }
      note.appendChild(item);
    });
    document.body.appendChild(note);
    window.__openNote = { el: note, anchor };
    positionNote();
    window.addEventListener('scroll', positionNote, { passive: true });
    window.addEventListener('resize', positionNote);
    document.addEventListener('click', onDocClick, { capture: true });
    document.addEventListener('keydown', onEsc);
  }

  function closeNote() {
    if (!window.__openNote) return;
    window.removeEventListener('scroll', positionNote);
    window.removeEventListener('resize', positionNote);
    document.removeEventListener('click', onDocClick, { capture: true });
    document.removeEventListener('keydown', onEsc);
    window.__openNote.el.remove();
    window.__openNote = null;
  }

  function onDocClick(e) {
    if (!window.__openNote) return;
    if (window.__openNote.el.contains(e.target) || window.__openNote.anchor.contains(e.target)) return;
    closeNote();
  }
  function onEsc(e) { if (e.key === 'Escape') closeNote(); }

  function positionNote() {
    if (!window.__openNote) return;
    const anchorRect = window.__openNote.anchor.getBoundingClientRect();
    const content = document.querySelector('main.post-wrap');
    const contentRect = content.getBoundingClientRect();
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;
    const scrollX = window.scrollX || document.documentElement.scrollLeft || 0;
    const gutter = 16;
    const viewportRight = scrollX + document.documentElement.clientWidth;
    let left = Math.round(scrollX + contentRect.left + contentRect.width + gutter);
    const noteW = window.__openNote.el.offsetWidth || 320;
    const maxLeft = viewportRight - noteW - gutter;
    left = Math.min(left, maxLeft);
    const top = Math.round(scrollY + anchorRect.top - 6);
    window.__openNote.el.style.left = left + 'px';
    window.__openNote.el.style.top = top + 'px';
  }

  function replaceCitations() {
    const container = document.querySelector('main.post-wrap');
    if (!container) return;
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const p = node.parentElement;
        if (!p) return NodeFilter.FILTER_REJECT;
        if (/^(code|pre|script|style)$/i.test(p.tagName)) return NodeFilter.FILTER_REJECT;
        if (!/\\cite[p|t]?\s*(?:\[[^\]]*\]\s*){0,2}\{[^}]+\}/.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });
    const toProcess = [];
    let n; while ((n = walker.nextNode())) toProcess.push(n);
    toProcess.forEach(textNode => {
      const html = textNode.nodeValue.replace(/\\(citep|cite)\s*(?:\[([^\]]*)\]\s*)?(?:\[([^\]]*)\]\s*)?\{([^}]+)\}/g, (m, kind, pre, post, keysStr) => {
        const keys = keysStr.split(',').map(s => s.trim()).filter(Boolean);
        const baseLabel = buildInlineLabel(keys, kind);
        const display = kind === 'citep' && pre ? `(${pre} ${baseLabel.slice(1)}` : baseLabel;
        const data = keys.join(',');
        return '<a class="cite" href="#" data-keys="' + encodeURIComponent(data) + '" data-kind="' + kind + '">' + display + '</a>';
      });
      const span = document.createElement('span');
      span.innerHTML = html;
      textNode.parentNode.replaceChild(span, textNode);
    });

    // wire up clicks
    container.querySelectorAll('a.cite').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const keys = decodeURIComponent(a.getAttribute('data-keys') || '').split(',').filter(Boolean);
        toggleCitationNote(a, keys);
      });
    });
  }

  function initFlavorWidget() {
    const widgets = document.querySelectorAll('.flavor-widget');
    if (!widgets.length) return;

    const formulas = {
      det: "\\max_{K_2} \\; p_1\\,\\mathcal{O}(K_1) - \\mathcal{Cost}(K_2 - K_1) + \\delta\\cdot p_2\\,\\mathcal{O}(K_2) \\,",
      unc: "\\max_{K_2} \\; p_1\\,\\mathcal{O}(K_1) - \\mathcal{Cost}(K_2 - K_1) + \\delta\\, \\mathbb{E}[\\, p_2\\,\\mathcal{O}(K_2) \\,]",
      cost: "\\max_{I\\in\\{0,1\\},\\;\\phi} \\; p_1\\,\\mathcal{O}(K_1) - \\mathcal{Cost}(\\phi(p_2)-K_1) + \\delta\\, \\mathbb{E}[\\, p_2\\,\\mathcal{O}(\\phi(p_2)) - I c \\,]"
    };

    // Structured questions: prompt + options with labels and optional correctness
    const questions = {
      det: {
        prompt: 'I run a company that produces handmade wooden toys. The amount I produce is a function of the amount of capital (K) I put in, described by the function $4.73K^{0.99}$. In today\'s market, my toys sell for a price of 2.6 and I currently have capital $K_1 = 3.07$. I am trying to decide how much to grow my capital for tomorrow\'s market. I know the price my toys will sell at tomorrow is $2.25$. I also know that I will incur a cost of growing my capital equal to $(K_1-K_2)^2$. Lastly, my discount factor for the revenue acquired tomorrow is $0.17$. If I want to maximize my profit how much should I increase my capital?',
        options: [
          { label: 'A', text: '1.68' },
          { label: 'B', text: '0.89', correct: true },
          { label: 'C', text: '1.11' },
          { label: 'D', text: '0.87' }
        ]
      },
      unc: {
        prompt: 'I manage a company that produces eco-friendly packaging materials. The amount of packaging we produce depends on our level of capital (K), represented by the function $4.85K^{0.44}$. Currently, our products sell for a price of 9.18, and we have capital $K_1 = 1.74$. As we look towards tomorrow\'s market, I need to decide on the optimal increase in capital to maximize our profits. The price of our products tomorrow will follow the distribution price $3.37$ with probability $0.31$, price $1.92$ with probability $0.11$, price $9.89$ with probability $0.57$. Growing our capital will incur a cost given by $(K_1-K_2)^2$, and any revenue earned tomorrow will be discounted by the factor 0.06. To maximize profit, how much should I grow our capital?',
        options: [
          { label: 'A', text: '0.31', correct: true },
          { label: 'B', text: '1.24' },
          { label: 'C', text: '0.27' },
          { label: 'D', text: '0.22' }
        ]
      },
      cost: {
        prompt: 'As the lead engineer of a tech startup focusing on cutting-edge software solutions, I am evaluating our investment strategy in our development infrastructure, which directly influences our software capability described by $4.81K^{0.9}$. Our solutions are currently priced at 2.94, and we have a development capital of $K_1 = 7.36$ today. The pricing for our software projects tomorrow follows the distribution price $p_2 = 6.9$ with probability $0.24$), price $p_2 = 3.14$ with probability $0.46$), price $p_2 = 5.61$ with probability $0.3$). We can choose to perform a market analysis costing $0.72$, allowing us to predict tomorrow\'s exact market pricing. Without this analysis, our investment choices must rely on the price distribution. Expanding our development capital today incurs costs as defined by $(K_1-K_2)^2$, and tomorrow\'s expected revenues will be affected by a discount factor 0.69. How should I proceed to optimize our expected profitability?',
        options: [
          { label: 'A', text: 'Skip the fee and set a single $K_2 = 1.53$' },
          { label: 'B', text: 'Pay the fee. If $p_2 = 1.3$ set $K_2 = 1.58$; if $p_2 = 2.5$, $K_2 = 1.89$; if $p_2 = 3.69$, $K_2 = 2.18$', correct: true },
          { label: 'C', text: 'Pay the fee. If $p_1 = 1.3$ set $K_2 = 1.9$; if $p_2 = 2.5$, $K_2 = 1.51$; if $p_2 = 3.69$, $K_2 = 2.61$' },
          { label: 'D', text: 'Skip the fee and set a single $K_2 = 1.91$' }
        ]
      }
    };

    widgets.forEach(widget => {
      const mathBox = widget.querySelector('.flavor-math');
      const textBox = widget.querySelector('.flavor-text');
      const btns = widget.querySelectorAll('.flavor-btn');

      function setFlavor(key) {
        btns.forEach(b => b.classList.toggle('active', b.dataset.flavor === key));
        if (mathBox) {
          mathBox.innerHTML = '$$' + (formulas[key] || formulas.det) + '$$';
          try { typesetMath(mathBox); } catch (_) {}
        }
        if (textBox) {
          const q = questions[key] || questions.det;
          const optsHTML = (q.options || []).map(function(o) {
            return '<li class="' + (o.correct ? 'correct' : '') + '"><span class="option-label">' + o.label + '.</span> <span class="option-text">' + o.text + '</span></li>';
          }).join('');
          textBox.innerHTML = '<div class="question-prompt">' + q.prompt + '</div><ul class="options">' + optsHTML + '</ul>';
          try { typesetMath(textBox); } catch (_) {}
        }
      }

      btns.forEach(b => b.addEventListener('click', (e) => { e.preventDefault(); setFlavor(b.dataset.flavor); }));

      // Initialize default content if empty
      const hasContent = (mathBox && mathBox.textContent.trim()) || (textBox && textBox.textContent.trim());
      if (!hasContent) setFlavor('det');
    });
  }

  function initResultsChart() {
    const widgets = document.querySelectorAll('.results-chart');
    if (!widgets.length) return;

    widgets.forEach(widget => {
      const host = widget.querySelector('.chart-host');
      if (!host) return;
      const dataEl = widget.querySelector('script.chart-data');
      let data = null;
      try { data = dataEl ? JSON.parse(dataEl.textContent) : null; } catch (_) {}
      if (!data || !Array.isArray(data.models)) {
        data = { models: [
          { name: 'o3', scores: { det: 0.9931, unc: 0.95, cost: 0.96 } },
          { name: 'Claude 3.7 Sonnet', scores: { det: 0.64, unc: 0.52, cost: 0.53 } },
          { name: 'GPT-4o', scores: { det: 0.41, unc: 0.394, cost: 0.404 } },
          { name: 'Claude 3.5 Sonnet', scores: { det: 0.373, unc: 0.339, cost: 0.441 } }
        ]};
      }

      const legendBtns = widget.querySelectorAll('.legend-item, .flavor-btn');
      const flavors = ['det','unc','cost'];
      const labels = { det: 'Deterministic', unc: 'Uncertain', cost: 'Costly Inspection' };
      const visible = new Set(flavors);

      function render() {
        const W = Math.max(320, host.clientWidth || widget.clientWidth || 700);
        const H = 280;
        const m = { top: 20, right: 12, bottom: 48, left: 44 };
        const innerW = W - m.left - m.right;
        const innerH = H - m.top - m.bottom;
        host.innerHTML = '';
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', H);
        host.appendChild(svg);
        const g = document.createElementNS(svg.namespaceURI, 'g');
        g.setAttribute('transform', `translate(${m.left},${m.top})`);
        svg.appendChild(g);

        // grid lines and y-axis labels (0%, 20%, ..., 100%)
        for (let i = 0; i <= 5; i++) {
          const y = innerH - (i/5)*innerH;
          const line = document.createElementNS(svg.namespaceURI, 'line');
          line.setAttribute('x1', 0); line.setAttribute('x2', innerW);
          line.setAttribute('y1', y); line.setAttribute('y2', y);
          line.setAttribute('stroke', '#e9ecef'); line.setAttribute('stroke-width', '1');
          g.appendChild(line);
          const lbl = document.createElementNS(svg.namespaceURI, 'text');
          lbl.setAttribute('x', -10); lbl.setAttribute('y', y + 4);
          lbl.setAttribute('text-anchor', 'end');
          lbl.setAttribute('font-size', '12'); lbl.setAttribute('fill', '#6c757d');
          lbl.textContent = (i*20) + '%';
          g.appendChild(lbl);
        }

        const groups = data.models.length;
        const groupGap = 26;
        const groupW = (innerW - groupGap * (groups - 1)) / groups;
        const visFlavors = flavors.filter(f => visible.has(f));
        const barGap = 6;
        const barW = Math.max(8, (groupW - barGap * (visFlavors.length - 1)) / Math.max(1, visFlavors.length));

        // x-axis labels
        data.models.forEach((mdata, gi) => {
          const x0 = gi * (groupW + groupGap);
          const tx = document.createElementNS(svg.namespaceURI, 'text');
          tx.setAttribute('x', m.left + x0 + groupW/2 - m.left);
          tx.setAttribute('y', innerH + 24);
          tx.setAttribute('text-anchor', 'middle');
          tx.setAttribute('font-size', '12'); tx.setAttribute('fill', '#343a40');
          tx.textContent = mdata.name;
          g.appendChild(tx);
        });

        const colors = { det: '#0d6efd', unc: '#f1b6da', cost: '#dc3545' };

        // tooltip
        let tooltip = widget.querySelector('.chart-tooltip');
        if (!tooltip) {
          tooltip = document.createElement('div');
          tooltip.className = 'chart-tooltip';
          widget.appendChild(tooltip);
        }

        function showTip(evt, text) {
          tooltip.textContent = text;
          tooltip.style.display = 'block';
          const rect = widget.getBoundingClientRect();
          const x = evt.clientX - rect.left + 8;
          const y = evt.clientY - rect.top - 28;
          tooltip.style.left = x + 'px';
          tooltip.style.top = y + 'px';
        }
        function hideTip() { tooltip.style.display = 'none'; }

        // bars
        data.models.forEach((mdata, gi) => {
          const x0 = gi * (groupW + groupGap);
          const actFlavors = visFlavors.length ? visFlavors : [];
          actFlavors.forEach((f, fi) => {
            const val = Math.max(0, Math.min(1, +mdata.scores[f] || 0));
            const h = val * innerH;
            const x = x0 + fi * (barW + barGap);
            const y = innerH - h;
            const rect = document.createElementNS(svg.namespaceURI, 'rect');
            rect.setAttribute('x', x);
            rect.setAttribute('y', y);
            rect.setAttribute('width', barW);
            rect.setAttribute('height', h);
            rect.setAttribute('rx', 3);
            rect.setAttribute('fill', colors[f] || '#6c757d');
            rect.style.cursor = 'pointer';
            rect.addEventListener('mousemove', (e) => showTip(e, `${mdata.name} — ${labels[f]}: ${Math.round(val*100)}%`));
            rect.addEventListener('mouseleave', hideTip);
            g.appendChild(rect);
          });
        });
      }

      // legend toggle
      legendBtns.forEach(btn => {
        const f = btn.getAttribute('data-flavor');
        if (!flavors.includes(f)) return;
        btn.classList.add('legend-item');
        btn.addEventListener('click', () => {
          if (visible.has(f)) { visible.delete(f); btn.classList.remove('active'); }
          else { visible.add(f); btn.classList.add('active'); }
          render();
        });
      });

      // initial render and resize handling
      render();
      let ro;
      if (window.ResizeObserver) {
        ro = new ResizeObserver(() => render());
        ro.observe(widget);
      } else {
        window.addEventListener('resize', render, { passive: true });
      }
    });
  }

  function init() {
    // Dedupe TOC if somehow duplicated in HTML
    dedupeTOC();
    // Build ToC and citations
    buildTOC();
    fetchBib().then(tex => { window.__bibMap = parseBib(tex); replaceCitations(); typesetMath(document.querySelector('main.post-wrap')); });
    // Initialize flavor widget (interactive objective function and question text)
    initFlavorWidget();
    // Initialize results chart
    initResultsChart();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
