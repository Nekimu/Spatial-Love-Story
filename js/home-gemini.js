/* ==========================================================================
   js/home-gemini.js · Portada Principal Versión 2.0 + Portales a Versión 1.0
   --------------------------------------------------------------------------
   - Alimentado íntegramente por `historia.yaml` (vía `js/datos-yaml.js`).
   - Replica la experiencia espacial de `gemini.google/about/` (<gemini-love-hero>)
     con 8 fotografías flotantes, bokeh :has() y lightbox FLIP.
   - Calcula y actualiza cada segundo los 3 contadores oficiales:
     1) Desde que nos conocimos: 14 de marzo de 2026
     2) Oficialmente novios: 27 de marzo de 2026 + Aniversario cada día 27 de mes
     3) Nuestra Boda tentativa: 27 de marzo de 2027 (1 año después de novios)
   - Conecta cada capítulo con su experiencia de storytelling (v1.0).
   ========================================================================== */
(function () {
  'use strict';

  const U = window.Unibody;
  if (!U || !window.HISTORIA) return;

  const { esc, rico, plano, pad2, romano, fecha, reduced } = U;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const EASE_GEMINI = 'cubic-bezier(0.2, 0, 0, 1)';
  const FLIP_DURATION = 500;
  const numFmt = new Intl.NumberFormat('es-MX');

  const EXPAND_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 -960 960 960" width="24" height="24" aria-hidden="true"><path fill="currentColor" d="M120-120v-240h80v104l124-124 56 56-124 124h104v80H120Zm480 0v-80h104L580-324l56-56 124 124v-104h80v240H600ZM324-580 200-704v104h-80v-240h240v80H256l124 124-56 56Zm312 0-56-56 124-124H600v-80h240v240h-80v-104L636-580Z"/></svg>`;

  /* Coordenadas espaciales inspiradas en <gemini-hero-gemini4> de gemini.google/about/ */
  const SLOTS_HERO = [
    { x: 5,  y: 7,  w: 17, xMd: 4,  yMd: 5,  wMd: 22, xSm: 4,  ySm: 4,  wSm: 38, enterDelay: '80ms',   floatDuration: '9.6s',  floatDelay: '0s',    floatX: 1,  depth: 0.14 },
    { x: 24, y: 4,  w: 13, xMd: 30, yMd: 3,  wMd: 17, xSm: 56, ySm: 3,  wSm: 36, enterDelay: '220ms',  floatDuration: '11.2s', floatDelay: '-2.3s', floatX: -1, depth: 0.08 },
    { x: 63, y: 5,  w: 14, xMd: 56, yMd: 4,  wMd: 18, xSm: 6,  ySm: 58, wSm: 38, enterDelay: '360ms',  floatDuration: '10.4s', floatDelay: '-4.1s', floatX: 1,  depth: 0.11 },
    { x: 80, y: 9,  w: 16, xMd: 76, yMd: 8,  wMd: 20, xSm: 54, ySm: 56, wSm: 40, enterDelay: '500ms',  floatDuration: '12.0s', floatDelay: '-1.5s', floatX: -1, depth: 0.16 },
    { x: 3,  y: 52, w: 15, xMd: 3,  yMd: 54, wMd: 21, xSm: 5,  ySm: 77, wSm: 40, enterDelay: '640ms',  floatDuration: '10.8s', floatDelay: '-3.4s', floatX: -1, depth: 0.10 },
    { x: 21, y: 61, w: 17, xMd: 26, yMd: 63, wMd: 22, xSm: 53, ySm: 76, wSm: 41, enterDelay: '780ms',  floatDuration: '9.9s',  floatDelay: '-5.0s', floatX: 1,  depth: 0.18 },
    { x: 62, y: 59, w: 16, xMd: 54, yMd: 62, wMd: 21, xSm: 14, ySm: 30, wSm: 34, enterDelay: '920ms',  floatDuration: '11.6s', floatDelay: '-2.8s', floatX: -1, depth: 0.13 },
    { x: 81, y: 51, w: 15, xMd: 77, yMd: 53, wMd: 19, xSm: 54, ySm: 29, wSm: 34, enterDelay: '1060ms', floatDuration: '10.2s', floatDelay: '-6.2s', floatX: 1,  depth: 0.09 }
  ];

  let TODAS_LAS_FOTOS = [];
  let MAPA_FOTOS = new Map();
  let COLECCIONES_HERO = [];

  function resolverUrlCapitulo(capId) {
    if (capId === 'epilogo') return (window.EPILOGO && window.EPILOGO.archivo) || 'epilogo.html';
    if (capId === 'final') return (window.HISTORIA.final && window.HISTORIA.final.archivo) || 'final.html';
    const c = (window.CAPITULOS || {})[capId];
    if (c) return c.archivo || `capitulo.html?id=${encodeURIComponent(c.id)}`;
    return 'index.html';
  }

  function construirIndiceFotos() {
    TODAS_LAS_FOTOS = [];
    MAPA_FOTOS = new Map();
    const H = window.HISTORIA || {};
    const ep = H.epilogo || {};
    const caps = H.capitulos || [];

    function registrarFoto(f, meta) {
      if (!f || !f.src) return null;
      const id = f.id || `foto-${TODAS_LAS_FOTOS.length + 1}`;
      if (MAPA_FOTOS.has(id)) return MAPA_FOTOS.get(id);
      const item = {
        id,
        src: f.src,
        mini: f.mini || f.src,
        tono: f.tono || '#141218',
        aspect: f.aspect || '4/5',
        pie: f.pie || meta.episodioTitulo || meta.capituloTitulo,
        capituloId: meta.capituloId,
        capituloArchivo: meta.capituloArchivo,
        capituloCorto: meta.capituloCorto,
        capituloTitulo: meta.capituloTitulo,
        episodioTitulo: meta.episodioTitulo,
        fecha: fecha(f.fecha || meta.fecha),
        lugar: f.lugar || meta.lugar || '',
        index: TODAS_LAS_FOTOS.length
      };
      TODAS_LAS_FOTOS.push(item);
      MAPA_FOTOS.set(item.id, item);
      return item;
    }

    /* 1. Foto maestra del Epílogo 3D */
    if (ep.maestra) {
      registrarFoto(ep.maestra, {
        capituloId: 'epilogo',
        capituloArchivo: ep.archivo || 'epilogo.html',
        capituloCorto: 'El Origen 3D',
        capituloTitulo: plano(ep.titulo || 'Antes de ti'),
        episodioTitulo: 'Rompecabezas 3D · 14 de marzo de 2026',
        fecha: '2026-03-14',
        lugar: 'El día que nos conocimos'
      });
    }

    /* 2. Todas las fotos de cada capítulo en historia.yaml */
    caps.forEach(cap => {
      const capUrl = cap.archivo || `capitulo.html?id=${encodeURIComponent(cap.id)}`;
      const capCorto = `Capítulo ${cap.romano || romano(cap.numero)}`;
      if (cap.portada) {
        registrarFoto(cap.portada, {
          capituloId: cap.id,
          capituloArchivo: capUrl,
          capituloCorto: capCorto,
          capituloTitulo: plano(cap.titulo),
          episodioTitulo: 'Portada · ' + plano(cap.titulo),
          fecha: cap.portada.fecha || cap.periodo,
          lugar: cap.portada.lugar || cap.periodo
        });
      }
      (cap.episodios || []).forEach(e => {
        (e.fotos || []).forEach(f => {
          registrarFoto(f, {
            capituloId: cap.id,
            capituloArchivo: capUrl,
            capituloCorto: capCorto,
            capituloTitulo: plano(cap.titulo),
            episodioTitulo: plano(e.titulo),
            fecha: e.fecha,
            lugar: e.lugar
          });
        });
      });
    });

    /* 3. Colecciones para las píldoras del Hero */
    const idsDestacadas = (H.portadaPrincipal && H.portadaPrincipal.destacadasHero) || [];
    COLECCIONES_HERO = [
      {
        id: 'destacadas',
        nombre: '✦ Selección Principal',
        ids: idsDestacadas.length ? idsDestacadas : TODAS_LAS_FOTOS.slice(0, 8).map(f => f.id)
      },
      ...caps.map(cap => {
        const idsCap = TODAS_LAS_FOTOS.filter(f => f.capituloId === cap.id).map(f => f.id);
        return {
          id: cap.id,
          nombre: `Cap. ${cap.romano || romano(cap.numero)}`,
          ids: idsCap.slice(0, 8)
        };
      })
    ];
  }

  construirIndiceFotos();

  /* Helper para renderizar <img> siguiendo optimize-image-priority */
  function renderMediaImg(foto, opts = {}) {
    const srcFinal = U.resolverSrc ? U.resolverSrc(foto) : foto.src;
    const tieneMiniRemota = foto.mini && U.esUrlRemota && U.esUrlRemota(foto.mini) && U.esUrlRemota(foto.src);
    const srcset = tieneMiniRemota
      ? ` srcset="${esc(foto.mini)} 540w, ${esc(foto.src)} 1080w" sizes="${opts.sizes || '(max-width: 600px) 45vw, 320px'}"`
      : '';
    let carga = ' decoding="async"';
    if (opts.lcp) {
      carga = ' fetchpriority="high" decoding="async"';
    } else if (opts.lazy) {
      carga = ' loading="lazy" decoding="async"';
    }
    return `<img src="${esc(srcFinal)}"${srcset} alt="${esc(foto.pie)}"${carga} referrerpolicy="no-referrer" draggable="false">`;
  }

  /* ========================================================================
     1. Motor FLIP Stage Lightbox (<dialog id="gemini-lightbox">)
     ======================================================================== */
  const lightbox = document.getElementById('gemini-lightbox');
  const stageTarget = document.getElementById('stage-target');
  const stageBox = document.getElementById('stage-box');
  const stageMedia = document.getElementById('stage-media');
  const stageCaptionMain = document.getElementById('stage-caption-main');
  const stageCaptionMeta = document.getElementById('stage-caption-meta');
  const stageCounter = document.getElementById('stage-counter');
  const heroEl = document.querySelector('gemini-love-hero');

  let lbLista = TODAS_LAS_FOTOS;
  let lbIndex = -1;
  let lbAnimating = false;
  let lbOriginEl = null;
  let cinemaTimer = 0;

  function parseAspect(asp) {
    if (!asp) return 0.8;
    const [w, h] = String(asp).split('/').map(Number);
    return (w && h) ? (w / h) : 0.8;
  }

  function calcularStageRect(foto) {
    const bounds = stageTarget.getBoundingClientRect();
    const ratio = parseAspect(foto && foto.aspect);
    const extraCaptionH = 68;
    const availH = Math.max(200, bounds.height - extraCaptionH);
    let w = Math.min(bounds.width, availH * ratio);
    let h = w / ratio + extraCaptionH;
    if (h > bounds.height) {
      h = bounds.height;
      w = (h - extraCaptionH) * ratio;
    }
    return new DOMRect(
      bounds.left + (bounds.width - w) / 2,
      bounds.top + (bounds.height - h) / 2,
      w,
      h
    );
  }

  function aplicarStageRect(r) {
    Object.assign(stageBox.style, {
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`
    });
  }

  async function animarStage(fromRect, toRect) {
    const a = r => ({
      left: `${r.left}px`,
      top: `${r.top}px`,
      width: `${r.width}px`,
      height: `${r.height}px`
    });
    const anim = stageBox.animate([a(fromRect), a(toRect)], {
      duration: reduced ? 0 : FLIP_DURATION,
      easing: EASE_GEMINI,
      fill: 'forwards'
    });
    await anim.finished.catch(() => {});
    return anim;
  }

  function poblarStage(foto) {
    const srcFinal = U.resolverSrc ? U.resolverSrc(foto) : foto.src;
    stageMedia.innerHTML = `<img src="${esc(srcFinal)}" alt="${esc(foto.pie)}" referrerpolicy="no-referrer" decoding="async">`;
    stageCaptionMain.textContent = foto.pie || '';
    const metas = [foto.capituloCorto, foto.episodioTitulo, foto.fecha, foto.lugar].filter(Boolean);
    const linkCap = foto.capituloArchivo
      ? `<a class="stage-chapter-link" href="${esc(foto.capituloArchivo)}" data-ir>Entrar a ${esc(foto.capituloCorto)} →</a>`
      : '';
    stageCaptionMeta.innerHTML = `<span>${esc(metas.join(' · '))}</span>${linkCap}`;
    stageCounter.textContent = `${pad2(lbIndex + 1)} / ${pad2(lbLista.length)}`;
  }

  async function abrirLightbox(lista, index, originBtn) {
    if (lbAnimating || lbIndex !== -1 || !lightbox) return;
    lbAnimating = true;
    lbLista = lista && lista.length ? lista : TODAS_LAS_FOTOS;
    lbIndex = index;
    lbOriginEl = originBtn || null;

    const foto = lbLista[lbIndex];
    const mediaNode = originBtn ? (originBtn.querySelector('.item-media') || originBtn) : null;
    const fromRect = mediaNode
      ? mediaNode.getBoundingClientRect()
      : new DOMRect(window.innerWidth / 2 - 120, window.innerHeight / 2 - 150, 240, 300);

    if (originBtn) originBtn.classList.add('active');
    if (heroEl && heroEl.contains(originBtn)) heroEl.classList.add('open');

    document.documentElement.style.overflow = 'hidden';
    poblarStage(foto);

    lightbox.showModal();
    lightbox.getBoundingClientRect();
    document.body.classList.add('lightbox-open');

    const toRect = calcularStageRect(foto);
    aplicarStageRect(toRect);

    document.getElementById('stage-close')?.focus({ preventScroll: true });

    const anim = await animarStage(fromRect, toRect);
    anim.cancel();
    aplicarStageRect(toRect);
    lbAnimating = false;
  }

  async function cerrarLightbox() {
    if (lbAnimating || lbIndex === -1) return;
    detenerCinema();
    lbAnimating = true;

    const fromRect = stageBox.getBoundingClientRect();
    const mediaNode = lbOriginEl ? (lbOriginEl.querySelector('.item-media') || lbOriginEl) : null;
    let toRect = mediaNode ? mediaNode.getBoundingClientRect() : null;

    if (!toRect || toRect.width === 0 || toRect.bottom < 0 || toRect.top > window.innerHeight) {
      toRect = new DOMRect(window.innerWidth / 2 - 90, window.innerHeight / 2 - 110, 180, 220);
    }

    document.body.classList.add('lightbox-closing');
    document.body.classList.remove('lightbox-open');
    if (heroEl) {
      heroEl.classList.add('closing');
      heroEl.classList.remove('open');
    }

    const anim = await animarStage(fromRect, toRect);

    document.body.classList.remove('lightbox-closing');
    if (heroEl) heroEl.classList.remove('closing');
    if (lbOriginEl) lbOriginEl.classList.remove('active');

    lightbox.close();
    anim.cancel();
    stageMedia.replaceChildren();
    document.documentElement.style.overflow = '';

    const prevOrigin = lbOriginEl;
    lbIndex = -1;
    lbOriginEl = null;
    lbAnimating = false;
    if (prevOrigin && prevOrigin.focus) prevOrigin.focus({ preventScroll: true });
  }

  async function navegarLightbox(delta) {
    if (lbAnimating || lbIndex === -1 || lbLista.length < 2) return;
    if (lbOriginEl) lbOriginEl.classList.remove('active');
    lbIndex = (lbIndex + delta + lbLista.length) % lbLista.length;
    const foto = lbLista[lbIndex];

    const candidato = document.querySelector(`[data-foto-id="${foto.id}"]`);
    if (candidato) {
      lbOriginEl = candidato;
      lbOriginEl.classList.add('active');
    }

    const prevRect = stageBox.getBoundingClientRect();
    poblarStage(foto);
    const nextRect = calcularStageRect(foto);
    aplicarStageRect(nextRect);
    const anim = await animarStage(prevRect, nextRect);
    anim.cancel();
  }

  function alternarCinema() {
    if (cinemaTimer) {
      detenerCinema();
      return;
    }
    if (lbIndex === -1) {
      abrirLightbox(TODAS_LAS_FOTOS, 0, document.querySelector('.floater-item'));
    }
    cinemaTimer = window.setInterval(() => {
      navegarLightbox(1);
    }, 3400);
  }

  function detenerCinema() {
    if (cinemaTimer) {
      clearInterval(cinemaTimer);
      cinemaTimer = 0;
    }
  }

  document.getElementById('stage-prev')?.addEventListener('click', () => { detenerCinema(); navegarLightbox(-1); });
  document.getElementById('stage-next')?.addEventListener('click', () => { detenerCinema(); navegarLightbox(1); });
  document.getElementById('stage-close')?.addEventListener('click', cerrarLightbox);
  document.getElementById('btn-hero-cinema')?.addEventListener('click', alternarCinema);

  lightbox?.addEventListener('cancel', e => {
    e.preventDefault();
    cerrarLightbox();
  });
  lightbox?.addEventListener('click', e => {
    if (e.target === lightbox) cerrarLightbox();
  });

  window.addEventListener('keydown', e => {
    if (lbIndex === -1) return;
    if (e.key === 'Escape') cerrarLightbox();
    else if (e.key === 'ArrowRight') { detenerCinema(); navegarLightbox(1); }
    else if (e.key === 'ArrowLeft') { detenerCinema(); navegarLightbox(-1); }
  });

  window.addEventListener('resize', () => {
    if (lbIndex !== -1 && !lbAnimating) {
      aplicarStageRect(calcularStageRect(lbLista[lbIndex]));
    }
  });

  /* ========================================================================
     2. Custom Element <gemini-love-hero> (Réplica de gemini.google/about/)
     ======================================================================== */
  class GeminiLoveHero extends HTMLElement {
    constructor() {
      super();
      this.floatersEl = null;
      this.items = [];
      this.scrollRaf = 0;
      this.ptrRaf = 0;
      this.ptr = { x: 0, y: 0, tx: 0, ty: 0 };
      this.currentFotos = [];
    }

    connectedCallback() {
      this.floatersEl = this.querySelector('[data-slot="floaters"]');
      this.renderTexts();
      this.renderPresetPills();
      this.loadCollection('destacadas', true);

      this.onScroll = () => {
        if (this.scrollRaf || lbIndex !== -1) return;
        this.scrollRaf = requestAnimationFrame(() => {
          this.scrollRaf = 0;
          const sy = Math.max(0, -this.getBoundingClientRect().top);
          this.style.setProperty('--scroll', String(Math.round(sy)));
        });
      };

      if (finePointer && !reduced) {
        this.addEventListener('pointermove', e => {
          this.ptr.tx = (e.clientX / window.innerWidth - 0.5) * 2;
          this.ptr.ty = (e.clientY / window.innerHeight - 0.5) * 2;
          if (!this.ptrRaf) this.ptrRaf = requestAnimationFrame(() => this.tickPointer());
        }, { passive: true });
      }

      this.resizeObserver = new ResizeObserver(() => this.updateHeight());
      window.addEventListener('scroll', this.onScroll, { passive: true });
      window.addEventListener('resize', () => this.updateHeight());
      this.onScroll();

      requestAnimationFrame(() => {
        setTimeout(() => {
          this.classList.add('ready');
          this.enableInteraction();
        }, 160);
      });
    }

    tickPointer() {
      this.ptrRaf = 0;
      this.ptr.x += (this.ptr.tx - this.ptr.x) * 0.08;
      this.ptr.y += (this.ptr.ty - this.ptr.y) * 0.08;
      this.style.setProperty('--ptr-x', this.ptr.x.toFixed(4));
      this.style.setProperty('--ptr-y', this.ptr.y.toFixed(4));
      if (Math.abs(this.ptr.tx - this.ptr.x) > 0.002 || Math.abs(this.ptr.ty - this.ptr.y) > 0.002) {
        this.ptrRaf = requestAnimationFrame(() => this.tickPointer());
      }
    }

    renderTexts() {
      const P = (window.HISTORIA && window.HISTORIA.portadaPrincipal) || {};
      const eyebrowEl = this.querySelector('#hero-eyebrow-text');
      if (eyebrowEl && P.ceja) eyebrowEl.textContent = P.ceja;

      const titleEl = this.querySelector('#hero-title');
      if (titleEl) {
        const palabras = P.tituloPalabras || ['Mira', 'todo', 'lo', 'que', 'hemos', '*vivido*'];
        titleEl.innerHTML = palabras
          .map((w, i) => `<span class="word" style="--i:${i}">${rico(w)}</span>`)
          .join(' ');
      }

      const subEl = this.querySelector('#hero-subtitle');
      if (subEl && P.subtitulo) subEl.textContent = P.subtitulo;

      const footEl = this.querySelector('#hero-footer-note');
      if (footEl && P.pie) footEl.textContent = P.pie;
    }

    renderPresetPills() {
      const container = this.querySelector('#hero-pills');
      if (!container) return;
      const html = COLECCIONES_HERO.map((col, idx) =>
        `<button type="button" class="pill-preset" data-preset="${esc(col.id)}" aria-pressed="${idx === 0}">${esc(col.nombre)}</button>`
      ).join('') + `<button type="button" class="pill-preset" data-preset="aleatorio" aria-pressed="false">↻ Aleatorio</button>`;
      container.innerHTML = html;

      if (!this._pillsBound) {
        this._pillsBound = true;
        container.addEventListener('click', e => {
          const btn = e.target.closest('[data-preset]');
          if (!btn) return;
          const presetId = btn.dataset.preset;
          [...container.querySelectorAll('.pill-preset')].forEach(b => {
            b.setAttribute('aria-pressed', String(b === btn));
          });
          this.loadCollection(presetId, false);
        });
      }
    }

    loadCollection(presetId, initial) {
      let fotos = [];
      if (presetId === 'aleatorio') {
        const copia = [...TODAS_LAS_FOTOS];
        for (let i = copia.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [copia[i], copia[j]] = [copia[j], copia[i]];
        }
        fotos = copia.slice(0, SLOTS_HERO.length);
      } else {
        const col = COLECCIONES_HERO.find(x => x.id === presetId) || COLECCIONES_HERO[0];
        fotos = (col ? col.ids : []).map(id => MAPA_FOTOS.get(id)).filter(Boolean);
      }
      if (!fotos.length) fotos = TODAS_LAS_FOTOS.slice(0, SLOTS_HERO.length);
      this.currentFotos = fotos;

      if (!initial) {
        this.classList.remove('ready');
      }

      this.floatersEl.innerHTML = SLOTS_HERO.map((slot, idx) => {
        const f = fotos[idx % fotos.length];
        if (!f) return '';
        const st = [
          `--x:${slot.x}`, `--y:${slot.y}`, `--w:${slot.w}`,
          `--x-md:${slot.xMd}`, `--y-md:${slot.yMd}`, `--w-md:${slot.wMd}`,
          `--x-sm:${slot.xSm}`, `--y-sm:${slot.xSm ? slot.ySm : 10}`, `--w-sm:${slot.wSm}`,
          `--enter-delay:${initial ? slot.enterDelay : (idx * 75) + 'ms'}`,
          `--float-duration:${slot.floatDuration}`,
          `--float-delay:${slot.floatDelay}`,
          `--float-x:${slot.floatX}`,
          `--depth:${slot.depth}`,
          `--aspect:${f.aspect}`,
          `--tono:${f.tono}`
        ].join(';');

        return `<button type="button" class="floater-item${initial ? '' : ' interactive'}" style="${st}" data-slot="item" data-foto-id="${esc(f.id)}" data-idx="${idx}" aria-label="Abrir recuerdo: ${esc(f.pie)}">` +
          `<div class="item-enter">` +
            `<div class="item-float">` +
              `<div class="item-media" data-slot="item-media">` +
                renderMediaImg(f, { lcp: initial && idx === 0, sizes: '(max-width: 600px) 42vw, (max-width: 1024px) 24vw, 18vw' }) +
                `<div class="floater-caption"><small>${esc(f.capituloCorto)}</small><span>${esc(f.pie)}</span></div>` +
              `</div>` +
              `<span class="expand-icon" aria-hidden="true">${EXPAND_SVG}</span>` +
            `</div>` +
          `</div>` +
        `</button>`;
      }).join('');

      this.items = [...this.floatersEl.querySelectorAll('[data-slot="item"]')];
      this.items.forEach((btn, idx) => {
        this.resizeObserver?.observe(btn);
        btn.addEventListener('click', () => {
          abrirLightbox(this.currentFotos, idx, btn);
        });
      });

      this.updateHeight();

      if (!initial) {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            this.classList.add('ready');
            this.items.forEach(el => el.classList.add('interactive'));
          });
        });
      }
    }

    enableInteraction() {
      this.items.forEach(item => {
        item.classList.add('interactive');
      });
    }

    updateHeight() {
      let maxBottom = 0;
      this.items.forEach(el => {
        maxBottom = Math.max(maxBottom, el.offsetTop + el.offsetHeight);
      });
      const h = Math.max(window.innerHeight, maxBottom + 140);
      this.style.setProperty('--hero-height', `${Math.ceil(h)}px`);
    }
  }

  if (!customElements.get('gemini-love-hero')) {
    customElements.define('gemini-love-hero', GeminiLoveHero);
  }

  /* ========================================================================
     3. Los 3 Contadores Automáticos en Vivo (14 Mar / 27 cada mes / 27 Mar 2027)
     ======================================================================== */
  function actualizarContadoresEnVivo() {
    if (!window.DatosAmor || !window.DatosAmor.calcularEstadoFechas) return;
    const est = window.DatosAmor.calcularEstadoFechas(new Date());

    /* 1) Fecha de conocernos: 14 de marzo de 2026 */
    const elConocernosDias = document.getElementById('cnt-conocernos-dias');
    const elConocernosReloj = document.getElementById('cnt-conocernos-reloj');
    const elConocernosEtiq = document.getElementById('cnt-conocernos-etiqueta');
    if (elConocernosDias) {
      elConocernosDias.innerHTML = `${numFmt.format(est.conocernos.dias)} <em>días</em>`;
    }
    if (elConocernosReloj) {
      elConocernosReloj.textContent = `${pad2(est.conocernos.horas)} h · ${pad2(est.conocernos.minutos)} min · ${pad2(est.conocernos.segundos)} s desde que nos conocimos`;
    }
    if (elConocernosEtiq) {
      elConocernosEtiq.textContent = est.conocernos.etiqueta;
    }

    /* 2) Oficialmente novios: 27 de marzo de 2026 + Aniversario mensual cada 27 */
    const elNoviosMeses = document.getElementById('cnt-novios-meses');
    const elNoviosReloj = document.getElementById('cnt-novios-reloj');
    const elNoviosEtiq = document.getElementById('cnt-novios-etiqueta');
    const elNovios27 = document.getElementById('cnt-novios-27');
    if (elNoviosMeses) {
      const m = est.novios.mesesCumplidos;
      elNoviosMeses.innerHTML = `${m} <em>${m === 1 ? 'mes' : 'meses'}</em> · ${numFmt.format(est.novios.dias)} días`;
    }
    if (elNoviosReloj) {
      elNoviosReloj.textContent = `${pad2(est.novios.horas)} h · ${pad2(est.novios.minutos)} min · ${pad2(est.novios.segundos)} s siendo novios oficiales`;
    }
    if (elNoviosEtiq) {
      elNoviosEtiq.textContent = est.novios.etiqueta;
    }
    if (elNovios27) {
      if (est.novios.esHoyAniversario) {
        elNovios27.innerHTML = `✨ <strong>¡Hoy es 27!</strong> Feliz mes #${est.novios.mesesCumplidos} de novios`;
      } else {
        const f27 = est.novios.faltaProximo27;
        elNovios27.innerHTML = `Próximo <strong>día 27</strong> (mes #${est.novios.proximoMesNumero} · ${esc(est.novios.proximoFechaEtiqueta)}): faltan <strong>${f27.dias}d ${pad2(f27.horas)}h ${pad2(f27.minutos)}m ${pad2(f27.segundos)}s</strong>`;
      }
    }

    /* 3) Día de la boda tentativo: 27 de marzo de 2027 (1 año de novios) */
    const elBodaDias = document.getElementById('cnt-boda-dias');
    const elBodaReloj = document.getElementById('cnt-boda-reloj');
    const elBodaEtiq = document.getElementById('cnt-boda-etiqueta');
    const elBodaBarra = document.getElementById('cnt-boda-barra');
    if (elBodaDias) {
      elBodaDias.innerHTML = `Faltan ${numFmt.format(est.boda.dias)} <em>días</em>`;
    }
    if (elBodaReloj) {
      elBodaReloj.textContent = `${pad2(est.boda.horas)} h · ${pad2(est.boda.minutos)} min · ${pad2(est.boda.segundos)} s para nuestro 1.er aniversario y boda`;
    }
    if (elBodaEtiq) {
      elBodaEtiq.textContent = est.boda.etiqueta;
    }
    if (elBodaBarra) {
      elBodaBarra.style.width = `${est.boda.progresoPorcentaje.toFixed(1)}%`;
    }
  }

  actualizarContadoresEnVivo();
  setInterval(actualizarContadoresEnVivo, 1000);

  /* ========================================================================
     4. Renderizar Línea del Tiempo de Hitos (hitos en historia.yaml)
     ======================================================================== */
  function renderizarHitos() {
    const cont = document.getElementById('hitos-lista');
    if (!cont) return;
    const hitos = (window.HISTORIA && window.HISTORIA.hitos) || [];
    cont.innerHTML = hitos.map(h => {
      const url = resolverUrlCapitulo(h.capitulo);
      return `<a class="milestone-card" href="${esc(url)}" data-ir>` +
        `<span class="milestone-date">${esc(fecha(h.fecha))}</span>` +
        `<strong class="milestone-title">${esc(h.titulo)}</strong>` +
        `<p class="milestone-desc">${esc(h.detalle)}</p>` +
      `</a>`;
    }).join('');
  }

  /* ========================================================================
     5. Renderizar Portales de Capítulos 50/50 + Enlace a versión 1.0 por capítulo
     ======================================================================== */
  function renderizarPortalesCapitulos() {
    const capContainer = document.getElementById('capitulos-lista');
    if (!capContainer) return;

    const H = window.HISTORIA || {};
    const ep = H.epilogo || {};
    const caps = H.capitulos || [];

    /* Portal 0: El Origen en 3D (epilogo.html) */
    const fotoMaestra = ep.maestra ? MAPA_FOTOS.get(ep.maestra.id) : null;
    const htmlOrigen = ep.maestra ? (
      `<article class="chapter-showcase scroll-reveal" id="sec-epilogo" style="--cap-acento:#f43f5e;--cap-acento-2:#f59e0b">` +
        `<div class="chapter-info">` +
          `<span class="chapter-pill"><span>El Origen 3D</span> · 14 de marzo de 2026</span>` +
          `<h3 class="chapter-heading">${rico(ep.titulo || 'Antes de ti, eran *piezas sueltas*.')}</h3>` +
          `<div class="chapter-hito-tag">✦ 14 de marzo de 2026 · El día que nos conocimos</div>` +
          `<p class="chapter-summary">${esc(ep.entrada || '')}</p>` +
          `<div class="episode-active-card">` +
            `<span class="episode-active-meta">Experiencia Interactiva 3D · 7 fragmentos</span>` +
            `<p class="episode-active-text">Al entrar a este capítulo, las piezas sueltas vuelan en el espacio 3D y se ensamblan con tu scroll hasta formar nuestra primera imagen juntos.</p>` +
          `</div>` +
          `<div class="chapter-cta-row">` +
            `<a class="btn-chapter-enter" href="${esc(ep.archivo || 'epilogo.html')}" data-ir>Entrar al Rompecabezas 3D ${U.ICON.flecha}</a>` +
          `</div>` +
        `</div>` +
        `<div class="chapter-cloud" data-cloud="epilogo">` +
          (fotoMaestra ? (
            `<button type="button" class="cloud-card" style="grid-column:2 / 12;grid-row:1 / 7;--float-duration:10s;--float-delay:0s;--float-x:1;--aspect:${fotoMaestra.aspect};--tono:${fotoMaestra.tono}" data-foto-id="${esc(fotoMaestra.id)}" aria-label="Ver foto maestra">` +
              `<div class="item-media" style="--aspect:${fotoMaestra.aspect};--tono:${fotoMaestra.tono}">` +
                renderMediaImg(fotoMaestra, { lazy: true, sizes: '(max-width: 600px) 88vw, 520px' }) +
                `<div class="floater-caption"><small>El Origen · 14 Mar 2026</small><span>${esc(fotoMaestra.pie)}</span></div>` +
              `</div>` +
              `<span class="expand-icon" aria-hidden="true">${EXPAND_SVG}</span>` +
            `</button>`
          ) : '') +
        `</div>` +
      `</article>`
    ) : '';

    /* Portales de Capítulos I..N desde historia.yaml */
    const htmlCaps = caps.map(cap => {
      const episodios = cap.episodios || [];
      const tema = cap.tema || {};
      const acento = tema.acento || '#f43f5e';
      const acento2 = tema.acento2 || '#f59e0b';
      const capUrl = cap.archivo || `capitulo.html?id=${encodeURIComponent(cap.id)}`;
      const capRomano = cap.romano || romano(cap.numero);

      const todasFotosCap = [
        ...(cap.portada ? [MAPA_FOTOS.get(cap.portada.id)] : []),
        ...episodios.flatMap(e => (e.fotos || []).map(f => MAPA_FOTOS.get(f.id)))
      ].filter(Boolean);

      const tabsHtml = episodios.length > 1
        ? `<div class="episode-tabs" role="tablist" aria-label="Episodios de ${esc(plano(cap.titulo))}">` +
            episodios.map((e, idx) =>
              `<button type="button" class="ep-tab" role="tab" aria-selected="${idx === 0}" data-ep-idx="${idx}">${esc(plano(e.titulo))}</button>`
            ).join('') +
            `<button type="button" class="ep-tab" role="tab" aria-selected="false" data-ep-idx="all">Todas (${todasFotosCap.length})</button>` +
          `</div>`
        : '';

      const epInicial = episodios[0] || {};
      return `<article class="chapter-showcase scroll-reveal" id="sec-${esc(cap.id)}" style="--cap-acento:${esc(acento)};--cap-acento-2:${esc(acento2)}">` +
        `<div class="chapter-info">` +
          `<span class="chapter-pill"><span>Capítulo ${esc(capRomano)}</span> · ${esc(cap.periodo || '')}</span>` +
          `<h3 class="chapter-heading">${rico(cap.titulo)}</h3>` +
          (cap.hitoRelacion ? `<div class="chapter-hito-tag">✦ ${esc(cap.hitoRelacion)}</div>` : '') +
          `<p class="chapter-summary">${esc(cap.resumen || '')}</p>` +
          tabsHtml +
          `<div class="episode-active-card" data-ep-card>` +
            `<span class="episode-active-meta" data-ep-meta>${esc([fecha(epInicial.fecha), epInicial.lugar].filter(Boolean).join(' · ') || cap.periodo || '')}</span>` +
            `<p class="episode-active-text" data-ep-text>${esc(epInicial.texto || cap.resumen || '')}</p>` +
          `</div>` +
          `<div class="chapter-cta-row">` +
            `<a class="btn-chapter-enter" href="${esc(capUrl)}" data-ir>Entrar al Capítulo ${esc(capRomano)} · Storytelling ${U.ICON.flecha}</a>` +
          `</div>` +
        `</div>` +
        `<div class="chapter-cloud" data-cloud="${esc(cap.id)}"></div>` +
      `</article>`;
    }).join('');

    capContainer.innerHTML = htmlOrigen + htmlCaps;

    /* Evento lightbox para la foto maestra del Origen */
    const btnOrigen = capContainer.querySelector('#sec-epilogo .cloud-card');
    if (btnOrigen && fotoMaestra) {
      btnOrigen.addEventListener('click', () => abrirLightbox([fotoMaestra], 0, btnOrigen));
    }

    /* Inicializar la nube flotante interactiva de cada capítulo */
    caps.forEach(cap => {
      const article = document.getElementById(`sec-${cap.id}`);
      const cloud = article?.querySelector('[data-cloud]');
      const metaEl = article?.querySelector('[data-ep-meta]');
      const textEl = article?.querySelector('[data-ep-text]');
      if (!cloud) return;

      function pintarNube(epIdx) {
        let fotosRaw = [];
        if (epIdx === 'all') {
          if (cap.portada) fotosRaw.push(cap.portada);
          (cap.episodios || []).forEach(e => fotosRaw.push(...(e.fotos || [])));
          if (metaEl) metaEl.textContent = `${cap.periodo || ''} · Capítulo completo (${fotosRaw.length} fotos)`;
          if (textEl) textEl.textContent = cap.resumen || '';
        } else {
          const ep = (cap.episodios || [])[Number(epIdx)] || (cap.episodios || [])[0];
          fotosRaw = ep ? (ep.fotos || []) : [];
          if (fotosRaw.length === 1 && cap.portada && cap.portada.id !== fotosRaw[0].id) {
            fotosRaw = [cap.portada, ...fotosRaw];
          }
          if (ep && metaEl) metaEl.textContent = [fecha(ep.fecha), ep.lugar].filter(Boolean).join(' · ') || cap.periodo || '';
          if (ep && textEl) textEl.textContent = ep.texto || cap.resumen || '';
        }

        const fotosCatalogadas = fotosRaw.map(f => MAPA_FOTOS.get(f.id)).filter(Boolean);
        cloud.innerHTML = fotosCatalogadas.map((f, k) => {
          const dur = (9.5 + (k % 4) * 1.1).toFixed(1) + 's';
          const del = (-k * 1.4).toFixed(1) + 's';
          const fx = k % 2 === 0 ? 1 : -1;
          return `<button type="button" class="cloud-card" style="--float-duration:${dur};--float-delay:${del};--float-x:${fx};--aspect:${f.aspect};--tono:${f.tono}" data-foto-id="${esc(f.id)}" data-k="${k}" aria-label="Ver foto: ${esc(f.pie)}">` +
            `<div class="item-media" style="--aspect:${f.aspect};--tono:${f.tono}">` +
              renderMediaImg(f, { lazy: true, sizes: '(max-width: 600px) 85vw, 340px' }) +
              `<div class="floater-caption"><small>${esc(f.episodioTitulo)}</small><span>${esc(f.pie)}</span></div>` +
            `</div>` +
            `<span class="expand-icon" aria-hidden="true">${EXPAND_SVG}</span>` +
          `</button>`;
        }).join('');

        [...cloud.querySelectorAll('.cloud-card')].forEach(btn => {
          btn.addEventListener('click', () => {
            abrirLightbox(fotosCatalogadas, Number(btn.dataset.k), btn);
          });
        });
      }

      pintarNube(0);

      article.querySelectorAll('.ep-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          article.querySelectorAll('.ep-tab').forEach(t => t.setAttribute('aria-selected', String(t === tab)));
          pintarNube(tab.dataset.epIdx);
        });
      });
    });
  }

  /* ========================================================================
     6. Renderizar Constelación Completa de las 56 Fotografías
     ======================================================================== */
  function renderizarConstelacion() {
    const filterBar = document.getElementById('constellation-filters');
    const stageGrid = document.getElementById('constellation-stage');
    if (!filterBar || !stageGrid) return;

    const caps = (window.HISTORIA && window.HISTORIA.capitulos) || [];
    const filtros = [
      { id: 'todas', label: `Todas las memorias (${TODAS_LAS_FOTOS.length})` },
      { id: 'epilogo', label: `El Origen 3D (${TODAS_LAS_FOTOS.filter(f => f.capituloId === 'epilogo').length})` },
      ...caps.map(cap => {
        const count = TODAS_LAS_FOTOS.filter(f => f.capituloId === cap.id).length;
        return { id: cap.id, label: `Cap. ${cap.romano || romano(cap.numero)} (${count})` };
      })
    ];

    filterBar.innerHTML = filtros.map((f, i) =>
      `<button type="button" class="filter-btn" data-filter="${esc(f.id)}" aria-pressed="${i === 0}">${esc(f.label)}</button>`
    ).join('');

    stageGrid.innerHTML = TODAS_LAS_FOTOS.map((f, idx) => {
      const staggerY = (idx % 3 === 1) ? '22px' : (idx % 3 === 2 ? '10px' : '0px');
      const dur = (9.2 + (idx % 5) * 0.9).toFixed(1) + 's';
      const del = (-(idx % 7) * 1.3).toFixed(1) + 's';
      const fx = idx % 2 === 0 ? 1 : -1;
      return `<button type="button" class="constellation-item scroll-reveal" style="--stagger-y:${staggerY};--float-duration:${dur};--float-delay:${del};--float-x:${fx}" data-cap="${esc(f.capituloId)}" data-foto-id="${esc(f.id)}" data-idx="${idx}" aria-label="${esc(f.pie)}">` +
        `<div class="item-media" style="--aspect:${f.aspect};--tono:${f.tono}">` +
          renderMediaImg(f, { lazy: true, sizes: '(max-width: 600px) 46vw, 260px' }) +
          `<div class="floater-caption"><small>${esc(f.capituloCorto)} · ${esc(f.episodioTitulo)}</small><span>${esc(f.pie)}</span></div>` +
        `</div>` +
        `<span class="expand-icon" aria-hidden="true">${EXPAND_SVG}</span>` +
      `</button>`;
    }).join('');

    const itemsConst = [...stageGrid.querySelectorAll('.constellation-item')];
    itemsConst.forEach(btn => {
      btn.addEventListener('click', () => {
        const visibles = itemsConst.filter(el => !el.hidden);
        const listaVisibles = visibles.map(el => TODAS_LAS_FOTOS[Number(el.dataset.idx)]);
        const pos = visibles.indexOf(btn);
        abrirLightbox(listaVisibles, Math.max(0, pos), btn);
      });
    });

    if (!filterBar._bound) {
      filterBar._bound = true;
      filterBar.addEventListener('click', e => {
        const btn = e.target.closest('[data-filter]');
        if (!btn) return;
        const cat = btn.dataset.filter;
        filterBar.querySelectorAll('.filter-btn').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
        [...stageGrid.querySelectorAll('.constellation-item')].forEach(el => {
          el.hidden = !(cat === 'todas' || el.dataset.cap === cat);
        });
      });
    }
  }

  /* ========================================================================
     7. Fallback de Scroll-Driven Animations (scroll-entry-exit-effects)
     ======================================================================== */
  function activarFallbackScrollReveal() {
    if (!reduced && !CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
      const revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'none';
            revealObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.12 });

      document.querySelectorAll('.scroll-reveal').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(32px) scale(0.95)';
        el.style.transition = `opacity 0.7s ${EASE_GEMINI}, transform 0.7s ${EASE_GEMINI}`;
        revealObserver.observe(el);
      });
    }
  }

  renderizarHitos();
  renderizarPortalesCapitulos();
  renderizarConstelacion();
  activarFallbackScrollReveal();

  /* Si historia.yaml trajo cambios nuevos por HTTP/HTTPS, refrescar vistas */
  window.addEventListener('historia:actualizada', () => {
    construirIndiceFotos();
    if (heroEl && heroEl.renderTexts) {
      heroEl.renderTexts();
      heroEl.renderPresetPills();
      heroEl.loadCollection('destacadas', false);
    }
    actualizarContadoresEnVivo();
    renderizarHitos();
    renderizarPortalesCapitulos();
    renderizarConstelacion();
  });
})();
