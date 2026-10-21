/* ==========================================================================
   js/core.js · Núcleo Compartido Unibody (Versión Fusionada 2.0 + 1.0)
   --------------------------------------------------------------------------
   - Navegación con View Transitions entre la Portada Principal (v2.0) y cada
     capítulo / epílogo 3D / álbum mural (v1.0).
   - Imágenes responsivas siguiendo `optimize-image-priority`.
   - Carrusel horizontal 3D por episodio y visor de pantalla completa.
   ========================================================================== */
(function () {
  'use strict';
  const d = document, raiz = d.documentElement;
  const VT = 'onpagereveal' in window;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (!VT && !reduced) raiz.classList.add('sin-vt', 'entrando');

  /* ---------- Transiciones entre documentos ---------- */
  function transicionDe(id) {
    const c = (window.CAPITULOS || {})[id];
    if (c && c.transicion) return c.transicion;
    if (id === 'epilogo' && window.EPILOGO) return window.EPILOGO.transicion;
    if (id === 'final' && window.FINAL) return window.FINAL.transicion;
    return 'fundido';
  }
  addEventListener('pagereveal', e => {
    if (!e.viewTransition) return;
    const t = transicionDe(window.PAGINA_ID);
    if (t && t !== 'fundido') { try { e.viewTransition.types.add(t); } catch (_) {} }
  });
  let saliendo = false;
  addEventListener('pageshow', e => {
    raiz.classList.remove('saliendo');
    if (e.persisted) raiz.classList.remove('entrando');
    saliendo = false;
  });
  if (raiz.classList.contains('entrando')) setTimeout(() => raiz.classList.remove('entrando'), 1000);

  /* ---------- Utilidades ---------- */
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const pad2 = n => String(n).padStart(2, '0');
  const rico = t => String(t || '')
    .split(/<br\s*\/?>/i)
    .map(x => esc(x).replace(/\*(.+?)\*/g, '<em>$1</em>'))
    .join('<br>');
  const plano = t => String(t || '').replace(/<br\s*\/?>/gi, ' ').replace(/\*/g, '');

  function romano(n) {
    const num = Number(n);
    if (!num || isNaN(num)) return String(n || '');
    const m = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let vNum = num, s = '';
    for (const [v, r] of m) while (vNum >= v) { s += r; vNum -= v; }
    return s;
  }

  const fLargo = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long', year: 'numeric' });
  const fMes = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric' });

  function fecha(s) {
    if (!s) return '';
    const [y, m, dd] = String(s).split('-').map(Number);
    if (!y) return String(s);
    if (!m) return String(y);
    return dd ? fLargo.format(new Date(y, m - 1, dd)) : fMes.format(new Date(y, m - 1, 1));
  }

  function duracion(ms) {
    ms = Math.max(0, ms);
    return {
      d: Math.floor(ms / 864e5),
      h: Math.floor(ms % 864e5 / 36e5),
      m: Math.floor(ms % 36e5 / 6e4),
      s: Math.floor(ms % 6e4 / 1e3)
    };
  }

  const listo = fn => (d.readyState === 'loading' ? d.addEventListener('DOMContentLoaded', fn, { once: true }) : fn());

  const ICON = {
    prev: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M10 3L5 8l5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    sig: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 3l5 5-5 5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    pausa: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="3" width="2.6" height="10" rx="1" fill="currentColor"/><rect x="9.4" y="3" width="2.6" height="10" rx="1" fill="currentColor"/></svg>',
    play: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z" fill="currentColor"/></svg>',
    abrir: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M9.5 2.5h4v4M6.5 13.5h-4v-4M13.5 2.5L9 7M2.5 13.5L7 9" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    cerrar: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>',
    flecha: '<svg viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
  };

  const LOGO = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 21C5.5 15 8.6 11.6 12 10" stroke="#f43f5e" stroke-width="1.6" stroke-linecap="round"/><path d="M20.5 21C18.5 15 15.4 11.6 12 10" stroke="#f59e0b" stroke-width="1.6" stroke-linecap="round"/><path d="M12 10V3" stroke="#f4f0ec" stroke-width="1.6" stroke-linecap="round"/><circle cx="12" cy="10" r="2" fill="#f4f0ec"/></svg>';

  /* ---------- Placeholder SVG sin peticiones de red mientras carga Google Drive ---------- */
  function placeholderSvg(tono) {
    const c1 = encodeURIComponent(tono || '#1a1520');
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 500"><defs><radialGradient id="g" cx="50%" cy="40%" r="70%"><stop offset="0%" stop-color="%23f43f5e" stop-opacity="0.22"/><stop offset="100%" stop-color="${c1}" stop-opacity="1"/></radialGradient></defs><rect width="400" height="500" fill="${c1}"/><rect width="400" height="500" fill="url(%23g)"/></svg>`;
  }

  function esUrlRemota(u) {
    return /^https?:\/\/|^data:/i.test(String(u || '').trim());
  }

  function resolverSrc(f) {
    if (!f) return placeholderSvg('#18141c');
    return esUrlRemota(f.src) ? f.src : placeholderSvg(f.tono);
  }

  /* ---------- Imágenes responsivas (siguiendo optimize-image-priority) ---------- */
  function img(f, o = {}) {
    if (!f) return '';
    const srcFinal = resolverSrc(f);
    const tieneMiniRemota = f.mini && esUrlRemota(f.mini) && esUrlRemota(f.src);
    const wm = (f.anchos && f.anchos[0]) || o.wMini || 540;
    const wg = (f.anchos && f.anchos[1]) || o.wGrande || 1080;
    const set = tieneMiniRemota
      ? ` srcset="${esc(f.mini)} ${wm}w, ${esc(f.src)} ${wg}w" sizes="${o.sizes || '(max-width: 700px) 92vw, 540px'}"`
      : '';
    const carga = o.prioridad
      ? ' fetchpriority="high" decoding="async"'
      : ' loading="lazy" decoding="async"';
    const vt = o.vt ? ` data-vt="${esc(o.vt)}"` : '';
    const st = o.vtFijo ? ` style="view-transition-name:${esc(o.vtFijo)}"` : '';
    return `<img src="${esc(srcFinal)}"${set} alt="${esc(o.alt ?? f.alt ?? f.pie ?? '')}"${o.clase ? ` class="${o.clase}"` : ''}${carga}${vt}${st} referrerpolicy="no-referrer" draggable="false">`;
  }

  /* ---------- Navegación con transición ---------- */
  function ir(url, origen) {
    if (saliendo || !url) return;
    if (VT) {
      const el = origen && (origen.matches && origen.matches('[data-vt]') ? origen : (origen.querySelector && origen.querySelector('[data-vt]')));
      if (el) el.style.viewTransitionName = el.dataset.vt;
      location.href = url;
      return;
    }
    if (reduced) { location.href = url; return; }
    saliendo = true;
    raiz.classList.remove('entrando');
    raiz.classList.add('saliendo');
    setTimeout(() => { location.href = url; }, 460);
  }

  d.addEventListener('click', e => {
    const a = e.target.closest('a[data-ir]');
    if (!a) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    ir(a.getAttribute('href'), a);
  });

  /* ---------- Barra superior unificada (alimentada por historia.yaml) ---------- */
  function barra() {
    const el = d.getElementById('barra'), S = window.SITIO;
    if (!el || !S) return;
    const id = window.PAGINA_ID;
    const sub = S.subtituloMarca ? `<small class="marca-sub">${esc(S.subtituloMarca)}</small>` : '';
    el.innerHTML =
      `<a class="marca" href="index.html" data-ir aria-label="${esc(S.marca)}: ir a la portada principal">${LOGO}<span>${esc(S.marca)}</span>${sub}</a>` +
      `<nav class="nav" aria-label="Navegación de capítulos">${S.paginas.map(p =>
        `<a href="${esc(p.archivo)}" data-ir aria-label="${esc(p.titulo)}"${p.id === id ? ' aria-current="page"' : ''}${p.romano ? ' class="romano"' : ''}>${esc(p.corto)}</a>`
      ).join('')}</nav>`;
  }

  addEventListener('historia:actualizada', () => barra());

  /* ---------- Resolución de configuración de capítulos ---------- */
  function cargar(p) {
    if (!p) return Promise.resolve(null);
    const reg = window.CAPITULOS || {};
    if (reg[p.id]) return Promise.resolve(reg[p.id]);
    return Promise.resolve(null);
  }

  /* ---------- Puente hacia la página siguiente / anterior ---------- */
  async function puente(contenedor) {
    const S = window.SITIO;
    if (!contenedor || !S) return;
    const i = S.paginas.findIndex(p => p.id === window.PAGINA_ID);
    const sig = S.paginas[i + 1], ant = S.paginas[i - 1];
    let html = '';
    if (sig) {
      let titulo = sig.titulo, portada = sig.portada, ceja = sig.ceja || 'Siguiente', sub = sig.resumen || '';
      const cfg = await cargar(sig);
      if (cfg) {
        titulo = cfg.titulo;
        portada = cfg.portada;
        ceja = `Siguiente · Capítulo ${cfg.romano || romano(cfg.numero)}`;
        sub = cfg.resumen || '';
      }
      html += `<a class="siguiente" href="${esc(sig.archivo)}" data-ir style="--tono:${esc((portada && portada.tono) || '#120f14')}">` +
        img(portada, { sizes: '(max-width: 1180px) 100vw, 1180px', wMini: 960, wGrande: 1920, vt: `portada-${sig.id}`, alt: '' }) +
        `<div class="siguiente-txt"><p class="ceja">${esc(ceja)}</p><h2 class="siguiente-t">${rico(titulo)}</h2>${sub ? `<p class="entrada">${esc(sub)}</p>` : ''}<span class="boton claro">Continuar ${ICON.flecha}</span></div></a>`;
    }
    const linksPie = [];
    if (ant) linksPie.push(`<a href="${esc(ant.archivo)}" data-ir>← Volver a ${esc(ant.titulo)}</a>`);
    if (window.PAGINA_ID !== 'inicio' && (!ant || ant.id !== 'inicio')) {
      linksPie.push(`<a href="index.html" data-ir>✦ Ir a la Portada Flotante Principal</a>`);
    }
    if (linksPie.length) {
      html += `<p class="anterior">${linksPie.join(' &nbsp;·&nbsp; ')}</p>`;
    }
    contenedor.innerHTML = html;
  }

  /* ---------- Carrusel horizontal 3D ---------- */
  function carruselHTML(fotos, etiqueta) {
    const n = fotos.length;
    const diapos = fotos.map((f, k) =>
      `<figure class="diapo${k === 0 ? ' actual' : ''}" data-k="${k}" role="group" aria-roledescription="foto" aria-label="${k + 1} de ${n}">` +
        `<div class="diapo-in" style="--tono:${esc(f.tono || '#151218')}">` +
          img(f, { sizes: '(max-width: 700px) 72vw, 420px' }) +
          (f.pie ? `<figcaption class="diapo-pie">${esc(f.pie)}</figcaption>` : '') +
          `<span class="diapo-sombra"></span><span class="diapo-borde"></span>` +
        `</div>` +
      `</figure>`
    ).join('');

    const ui = n > 1
      ? `<div class="carrusel-ui"><div class="puntos" role="group" aria-label="Elegir foto">${fotos.map((f, k) => `<button class="punto" type="button" data-p="${k}" aria-current="${k === 0}" aria-label="Foto ${k + 1} de ${n}"><span><i></i></span></button>`).join('')}</div><span class="contador">01 / ${pad2(n)}</span><div class="carrusel-btns"><button class="icono" type="button" data-c="play" aria-label="Pausar presentación">${ICON.pausa}</button><button class="icono" type="button" data-c="prev" aria-label="Foto anterior" disabled>${ICON.prev}</button><button class="icono" type="button" data-c="sig" aria-label="Foto siguiente">${ICON.sig}</button><button class="icono" type="button" data-c="abrir" aria-label="Ver en pantalla completa">${ICON.abrir}</button></div></div>`
      : `<div class="carrusel-ui"><div class="carrusel-btns"><button class="icono" type="button" data-c="abrir" aria-label="Ver en pantalla completa">${ICON.abrir}</button></div></div>`;

    return `<div class="carrusel"><div class="pista${n > 1 ? '' : ' sola'}" tabindex="0" role="region" aria-roledescription="carrusel" aria-label="${esc(etiqueta)}. Usa las flechas para cambiar de foto.">${diapos}</div>${ui}</div>`;
  }

  const carruseles = new Set();
  let ticRaf = 0, ticPrev = 0;
  function tic(now) {
    const dt = ticPrev ? Math.min(64, now - ticPrev) : 16;
    ticPrev = now;
    let alguno = false;
    carruseles.forEach(c => {
      if (!c.corriendo()) return;
      alguno = true;
      c.t += dt;
      if (c.t >= c.ms) { c.t = 0; c.ir((c.activa + 1) % c.n, true); }
      c.relleno();
    });
    if (alguno) ticRaf = requestAnimationFrame(tic);
    else { ticRaf = 0; ticPrev = 0; }
  }
  const despertar = () => { if (!ticRaf) ticRaf = requestAnimationFrame(tic); };
  const io = 'IntersectionObserver' in window ? new IntersectionObserver(es => es.forEach(en => {
    const c = en.target._carrusel;
    if (!c) return;
    c.visible = en.intersectionRatio >= .55;
    if (c.visible) despertar();
  }), { threshold: [0, .55] }) : null;

  function carrusel(el, opt = {}) {
    const pista = el.querySelector('.pista'), diapos = [...pista.children];
    const puntos = [...el.querySelectorAll('.punto')], cuenta = el.querySelector('.contador');
    const bPlay = el.querySelector('[data-c="play"]'), bPrev = el.querySelector('[data-c="prev"]'), bSig = el.querySelector('[data-c="sig"]');
    const partes = diapos.map(x => ({ inn: x.querySelector('.diapo-in'), img: x.querySelector('img'), sombra: x.querySelector('.diapo-sombra'), lt: '' }));
    const c = { pista, n: diapos.length, activa: 0, t: 0, ms: opt.ms || 5600, pausa: reduced, encima: false, arr: null, sup: false, cw: 1, pos: [], paso: 1, raf: 0, visible: !io, lf: -1 };
    c.medir = () => {
      c.cw = pista.clientWidth || 1;
      c.pos = diapos.map(x => x.offsetLeft + x.offsetWidth / 2);
      c.paso = c.n > 1 ? (c.pos[1] - c.pos[0]) || 1 : 1;
    };
    c.ir = (k, suave) => {
      k = clamp(k, 0, c.n - 1);
      pista.scrollTo({ left: c.pos[k] - c.cw / 2, behavior: suave && !reduced ? 'smooth' : 'auto' });
    };
    c.corriendo = () => c.n > 1 && c.visible && !c.pausa && !c.encima && !c.arr && !d.hidden && !visorAbierto();
    c.relleno = () => {
      const f = c.pausa ? 1 : clamp(c.t / c.ms);
      if (Math.abs(f - c.lf) < .002) return;
      const i = puntos[c.activa] && puntos[c.activa].querySelector('i');
      if (i) i.style.transform = `scaleX(${f.toFixed(3)})`;
      c.lf = f;
    };
    function actualizar() {
      const centro = pista.scrollLeft + c.cw / 2;
      let mejor = c.activa, md = 1e9;
      for (let k = 0; k < c.n; k++) {
        const dd = (c.pos[k] - centro) / c.paso, ad = Math.abs(dd);
        if (ad < md) { md = ad; mejor = k; }
        if (c.n < 2) continue;
        const p = partes[k], dc = clamp(dd, -1.4, 1.4), a1 = Math.min(ad, 1);
        const t = `translateZ(${(-Math.min(ad, 1.6) * 80).toFixed(1)}px) rotateY(${(-dc * 14).toFixed(2)}deg) scale(${(1 - a1 * .05).toFixed(3)})`;
        if (t !== p.lt) {
          p.inn.style.transform = t;
          if (p.img) p.img.style.transform = `translate3d(${(-clamp(dd, -1, 1) * 7).toFixed(2)}%,0,0) scale(1.16)`;
          p.sombra.style.opacity = (a1 * .5).toFixed(3);
          p.lt = t;
        }
      }
      if (mejor !== c.activa) {
        c.activa = mejor;
        c.t = 0;
        puntos.forEach(pp => { const i = pp.querySelector('i'); if (i) i.style.transform = 'scaleX(0)'; });
        ui();
        if (opt.alCambiar) opt.alCambiar(mejor);
      }
    }
    function ui() {
      puntos.forEach((pp, k) => pp.setAttribute('aria-current', String(k === c.activa)));
      diapos.forEach((x, k) => x.classList.toggle('actual', k === c.activa));
      if (cuenta) cuenta.textContent = `${pad2(c.activa + 1)} / ${pad2(c.n)}`;
      if (bPrev) bPrev.disabled = c.activa === 0;
      if (bSig) bSig.disabled = c.activa === c.n - 1;
      c.lf = -1;
      c.relleno();
    }
    function pausar(v) {
      c.pausa = v;
      c.lf = -1;
      c.relleno();
      if (bPlay) {
        bPlay.innerHTML = v ? ICON.play : ICON.pausa;
        bPlay.setAttribute('aria-label', v ? 'Reanudar presentación' : 'Pausar presentación');
      }
      if (!v) despertar();
    }
    const usuario = () => { if (!c.pausa) pausar(true); };
    c.sincronizar = k => { if (k !== c.activa) { usuario(); c.ir(k, false); } };

    pista.addEventListener('scroll', () => { if (!c.raf) c.raf = requestAnimationFrame(() => { c.raf = 0; actualizar(); }); }, { passive: true });
    el.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') c.encima = true; });
    el.addEventListener('pointerleave', () => { c.encima = false; despertar(); });
    pista.addEventListener('pointerdown', e => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || c.n < 2) return;
      c.arr = { x: e.clientX, sl: pista.scrollLeft, movido: false, lx: e.clientX, lt: performance.now(), v: 0, inicio: c.activa, id: e.pointerId };
    });
    pista.addEventListener('pointermove', e => {
      const a = c.arr;
      if (!a) return;
      const dx = e.clientX - a.x;
      if (!a.movido && Math.abs(dx) > 5) {
        a.movido = true;
        pista.classList.add('arrastrando');
        try { pista.setPointerCapture(a.id); } catch (_) {}
      }
      if (!a.movido) return;
      pista.scrollLeft = a.sl - dx;
      const now = performance.now(), dt = now - a.lt;
      if (dt > 0) a.v = a.v * .5 + ((e.clientX - a.lx) / dt) * .5;
      a.lx = e.clientX;
      a.lt = now;
    });
    const soltar = () => {
      const a = c.arr;
      c.arr = null;
      if (!a || !a.movido) return;
      c.sup = true;
      setTimeout(() => { c.sup = false; }, 60);
      const centro = pista.scrollLeft + c.cw / 2;
      let k = 0, md = 1e9;
      c.pos.forEach((p, j) => { const m = Math.abs(p - centro); if (m < md) { md = m; k = j; } });
      if (k === a.inicio && Math.abs(a.v) > .35) k += a.v < 0 ? 1 : -1;
      usuario();
      c.ir(k, true);
      const fin = () => pista.classList.remove('arrastrando');
      if ('onscrollend' in window) pista.addEventListener('scrollend', fin, { once: true });
      setTimeout(fin, 900);
    };
    pista.addEventListener('pointerup', soltar);
    pista.addEventListener('pointercancel', soltar);
    pista.addEventListener('lostpointercapture', soltar);
    pista.addEventListener('keydown', e => {
      if (e.key === 'ArrowRight') { e.preventDefault(); usuario(); c.ir(c.activa + 1, true); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); usuario(); c.ir(c.activa - 1, true); }
      else if (e.key === 'Enter' && opt.alAbrir) { e.preventDefault(); opt.alAbrir(c.activa, pista); }
    });
    let tx = 0, ty = 0, hecho = false;
    pista.addEventListener('touchstart', e => { const t = e.touches[0]; tx = t.clientX; ty = t.clientY; hecho = false; }, { passive: true });
    pista.addEventListener('touchmove', e => {
      if (hecho) return;
      const t = e.touches[0], dx = Math.abs(t.clientX - tx), dy = Math.abs(t.clientY - ty);
      if (dx > 10 && dx > dy) { hecho = true; usuario(); }
    }, { passive: true });
    el.addEventListener('click', e => {
      const p = e.target.closest('[data-p]');
      if (p) { usuario(); c.ir(+p.dataset.p, true); return; }
      const b = e.target.closest('[data-c]');
      if (b) {
        const a = b.dataset.c;
        if (a === 'play') { pausar(!c.pausa); c.t = 0; }
        else if (a === 'prev') { usuario(); c.ir(c.activa - 1, true); }
        else if (a === 'sig') { usuario(); c.ir(c.activa + 1, true); }
        else if (a === 'abrir' && opt.alAbrir) opt.alAbrir(c.activa, b);
        return;
      }
      const x = e.target.closest('.diapo');
      if (x && !c.sup) {
        const k = +x.dataset.k;
        if (k === c.activa) { if (opt.alAbrir) opt.alAbrir(k, x); }
        else { usuario(); c.ir(k, true); }
      }
    });

    el._carrusel = c;
    carruseles.add(c);
    if (io) io.observe(el);
    if (reduced) pausar(true);
    requestAnimationFrame(() => { c.medir(); pista.scrollLeft = c.pos[0] - c.cw / 2; actualizar(); ui(); despertar(); });
    return c;
  }

  let tRes;
  addEventListener('resize', () => {
    clearTimeout(tRes);
    tRes = setTimeout(() => carruseles.forEach(c => {
      if (c.arr) return;
      c.medir();
      c.pista.scrollLeft = c.pos[c.activa] - c.cw / 2;
    }), 140);
  });

  /* ---------- Visor de fotos en pantalla completa ---------- */
  let V = null;
  const visorAbierto = () => !!(V && !V.el.hidden);
  function construirVisor() {
    const el = d.createElement('div');
    el.className = 'visor';
    el.hidden = true;
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'Visor de fotografías');
    el.innerHTML =
      `<div class="visor-top"><span class="visor-titulo"></span><span class="visor-cuenta"></span><button class="icono" type="button" data-v="cerrar" aria-label="Cerrar visor">${ICON.cerrar}</button></div>` +
      `<div class="visor-escena"><img alt=""><button class="icono visor-nav visor-prev" type="button" data-v="prev" aria-label="Foto anterior">${ICON.prev}</button><button class="icono visor-nav visor-sig" type="button" data-v="sig" aria-label="Foto siguiente">${ICON.sig}</button></div>` +
      `<div class="visor-pie"></div><div class="visor-tira" aria-label="Fotos"></div>`;
    d.body.appendChild(el);
    V = {
      el,
      img: el.querySelector('.visor-escena img'),
      titulo: el.querySelector('.visor-titulo'),
      cuenta: el.querySelector('.visor-cuenta'),
      pie: el.querySelector('.visor-pie'),
      tira: el.querySelector('.visor-tira'),
      prev: el.querySelector('[data-v="prev"]'),
      sig: el.querySelector('[data-v="sig"]'),
      lista: [],
      k: 0,
      origen: null,
      alCerrar: null
    };
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-v]');
      if (b) {
        const a = b.dataset.v;
        if (a === 'cerrar') cerrarVisor();
        else paso(a === 'sig' ? 1 : -1);
        return;
      }
      const t = e.target.closest('[data-t]');
      if (t) {
        const k = +t.dataset.t;
        if (k !== V.k) {
          const dir = k > V.k ? 1 : -1;
          V.k = k;
          mostrar(dir);
        }
      }
    });
    let sx = null;
    const esc2 = el.querySelector('.visor-escena');
    esc2.addEventListener('pointerdown', e => { sx = e.clientX; });
    esc2.addEventListener('pointerup', e => {
      if (sx == null) return;
      const dx = e.clientX - sx;
      sx = null;
      if (Math.abs(dx) > 45 && V.lista.length > 1) paso(dx < 0 ? 1 : -1);
    });
  }

  function mostrar(dir) {
    const f = V.lista[V.k], n = V.lista.length;
    V.img.style.setProperty('--dx', (dir * 40) + 'px');
    V.img.classList.add('entra');
    V.img.src = resolverSrc(f);
    V.img.alt = f.alt || f.pie || '';
    (V.img.decode ? V.img.decode().catch(() => {}) : Promise.resolve())
      .then(() => requestAnimationFrame(() => V.img.classList.remove('entra')));
    V.titulo.textContent = f.titulo || '';
    V.cuenta.textContent = n > 1 ? `${V.k + 1} / ${n}` : '';
    V.pie.innerHTML = (f.pie ? `<span class="c">${esc(f.pie)}</span>` : '') +
      (f.meta || []).filter(Boolean).map(m => `<span>${esc(m)}</span>`).join('');
    V.prev.hidden = V.sig.hidden = n < 2;
    if (V.tira.dataset.n !== String(n) || V.tira.dataset.lista !== V.id) {
      V.tira.innerHTML = n > 1
        ? V.lista.map((x, k) => `<button type="button" data-t="${k}" aria-label="Foto ${k + 1}"><img src="${esc(esUrlRemota(x.mini) ? x.mini : resolverSrc(x))}" alt="" loading="lazy" decoding="async" referrerpolicy="no-referrer"></button>`).join('')
        : '';
      V.tira.dataset.n = String(n);
      V.tira.dataset.lista = V.id;
    }
    [...V.tira.children].forEach((b, k) => b.setAttribute('aria-current', String(k === V.k)));
    const th = V.tira.children[V.k];
    if (th) V.tira.scrollTo({ left: th.offsetLeft + th.offsetWidth / 2 - V.tira.clientWidth / 2, behavior: reduced ? 'auto' : 'smooth' });
  }

  function paso(dirn) {
    const n = V.lista.length;
    V.k = (V.k + dirn + n) % n;
    mostrar(dirn);
  }

  function abrirVisor(lista, k, origen, alCerrar, id) {
    if (!V) construirVisor();
    V.lista = lista;
    V.k = k || 0;
    V.origen = origen || d.activeElement;
    V.alCerrar = alCerrar || null;
    V.id = id || String(Math.random());
    V.el.hidden = false;
    raiz.classList.add('sin-scroll');
    mostrar(0);
    requestAnimationFrame(() => V.el.classList.add('abierto'));
    V.el.querySelector('[data-v="cerrar"]').focus();
  }

  function cerrarVisor() {
    if (!visorAbierto()) return;
    V.el.classList.remove('abierto');
    raiz.classList.remove('sin-scroll');
    setTimeout(() => { V.el.hidden = true; }, 380);
    if (V.alCerrar) V.alCerrar(V.k);
    if (V.origen && V.origen.focus) V.origen.focus({ preventScroll: true });
    despertar();
  }

  addEventListener('keydown', e => {
    if (!visorAbierto()) return;
    if (e.key === 'Escape') cerrarVisor();
    else if (e.key === 'ArrowRight') paso(1);
    else if (e.key === 'ArrowLeft') paso(-1);
  });

  window.Unibody = {
    VT, reduced, esc, rico, plano, clamp, pad2, romano, fecha, duracion, listo,
    ICON, placeholderSvg, esUrlRemota, resolverSrc, img, ir, barra, cargar, puente, carruselHTML, carrusel,
    visor: { abrir: abrirVisor, cerrar: cerrarVisor }
  };
})();
