/* ==========================================================================
   js/epilogo.js · El Origen en 3D (Rompecabezas guiado por scroll)
   --------------------------------------------------------------------------
   - Adapta la experiencia 3D de la versión 1.0 como el capítulo de origen
     (configurado desde `historia.yaml`).
   - Muestra los contadores en tiempo real desde `historia.yaml`.
   ========================================================================== */
(function () {
  'use strict';
  const U = window.Unibody;
  let E = window.EPILOGO, S = window.SITIO;
  if (!U || !E) return;
  const $ = (s, r = document) => r.querySelector(s);
  const { clamp, reduced, esc, rico, plano, romano, pad2 } = U;

  function bezier(p1x, p1y, p2x, p2y) {
    const cx = 3 * p1x, bx = 3 * (p2x - p1x) - cx, ax = 1 - cx - bx;
    const cy = 3 * p1y, by = 3 * (p2y - p1y) - cy, ay = 1 - cy - by;
    const sx = t => ((ax * t + bx) * t + cx) * t;
    const sy = t => ((ay * t + by) * t + cy) * t;
    const dx = t => (3 * ax * t + 2 * bx) * t + cx;
    return x => {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      let t = x;
      for (let i = 0; i < 8; i++) {
        const e = sx(t) - x, d = dx(t);
        if (Math.abs(e) < 1e-5 || Math.abs(d) < 1e-6) break;
        t -= e / d;
      }
      return sy(clamp(t));
    };
  }
  const encajar = bezier(.22, 1, .36, 1);
  const suave = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

  /* ---------- Contenido narrativo desde historia.yaml ---------- */
  const N = Math.max(2, (E.fragmentos || []).length);
  function renderizarNarrativaEpilogo() {
    E = window.EPILOGO || E;
    S = window.SITIO || S;
    const pareja = (S && S.pareja) || {};
    const F = (window.HISTORIA && window.HISTORIA.fechas) || {};
    const etiqConocernos = F.conocernosEtiqueta || 'Nos conocimos · fecha-date';
    const etiqNovios = F.noviosEtiqueta || 'Oficialmente novios · fecha-date';
    $('#apertura').innerHTML =
      `<p class="ceja">${esc(E.ceja || 'El Origen · fecha-date')}</p>` +
      `<h1 class="display">${rico(E.titulo)}</h1>` +
      `<p class="entrada">${esc(E.entrada)}</p>` +
      `<p class="firma">De ${esc(pareja.el || 'mí')}, para ${esc(pareja.ella || 'ti')}.</p>` +
      `<div class="juntos-grid">` +
        `<div class="juntos"><span class="k">${esc(etiqConocernos)}</span><span class="v" id="juntos-conocernos">—</span></div>` +
        `<div class="juntos"><span class="k">${esc(etiqNovios)}</span><span class="v" id="juntos-novios">—</span></div>` +
      `</div>` +
      `<div class="pista-scroll"><i aria-hidden="true"></i><span>Desliza para armar nuestra primera imagen</span></div>`;

    $('#fragmentos').innerHTML = (E.fragmentos || []).map((f, i) =>
      `<section class="fragmento" data-i="${i}">` +
        `<span class="n">${i === N - 1 ? 'El centro' : 'Pieza ' + romano(i + 1)}</span>` +
        `<p class="t">${rico(f.texto)}</p>` +
        (f.nota ? `<p class="nota">${esc(f.nota)}</p>` : '') +
      `</section>`
    ).join('');

    const c = E.cierre || {};
    $('#cierre').innerHTML =
      `<p class="ceja">${esc(c.ceja || 'El Origen')}</p>` +
      `<h2 class="display">${rico(c.titulo || '')}</h2>` +
      `<p class="entrada">${esc(c.texto || '')}</p>`;

    const pieEl = $('#pie-epilogo');
    if (pieEl) pieEl.textContent = E.ceja || 'El Origen 3D · fecha-date';
  }
  renderizarNarrativaEpilogo();

  /* ---------- Contadores automáticos en tiempo real ---------- */
  const NUM = new Intl.NumberFormat('es-MX');
  function reloj() {
    if (!window.DatosAmor || !window.DatosAmor.calcularEstadoFechas) return;
    const est = window.DatosAmor.calcularEstadoFechas(new Date());
    const elConocernos = $('#juntos-conocernos');
    const elNovios = $('#juntos-novios');
    if (elConocernos) {
      elConocernos.innerHTML = `<b>${NUM.format(est.conocernos.dias)} días</b> · ${pad2(est.conocernos.horas)}:${pad2(est.conocernos.minutos)}:${pad2(est.conocernos.segundos)}`;
    }
    if (elNovios) {
      const m = est.novios.mesesCumplidos;
      const diaMes = est.novios.diaAniversarioMensual;
      const prox = est.novios.esHoyAniversario
        ? `¡Hoy es ${diaMes}!`
        : `próx. ${diaMes} en ${est.novios.faltaProximo27.dias}d`;
      elNovios.innerHTML = `<b>${m} ${m === 1 ? 'mes' : 'meses'}</b> (${NUM.format(est.novios.dias)} días · ${esc(prox)})`;
    }
  }
  reloj();
  setInterval(reloj, 1000);

  /* ---------- Geometría: contorno en cuñas + diamante central ---------- */
  const DIA = 24;
  function cuna(a1, a2) {
    const rad = a => a * Math.PI / 180;
    const borde = a => {
      const cx = Math.cos(rad(a)), cy = Math.sin(rad(a));
      const t = Math.min(Math.abs(cx) > 1e-9 ? 50 / Math.abs(cx) : 1e9, Math.abs(cy) > 1e-9 ? 50 / Math.abs(cy) : 1e9);
      return [50 + cx * t, 50 + cy * t];
    };
    const rombo = a => {
      const cx = Math.cos(rad(a)), cy = Math.sin(rad(a));
      const t = DIA / (Math.abs(cx) + Math.abs(cy));
      return [50 + cx * t, 50 + cy * t];
    };
    const norm = a => { while (a <= a1) a += 360; while (a > a1 + 360) a -= 360; return a; };
    const dentro = v => { const n = norm(v[2]); return n > a1 + 1e-6 && n < a2 - 1e-6; };
    const esquinas = [[100, 0, -45], [100, 100, 45], [0, 100, 135], [0, 0, -135]].filter(dentro).sort((p, q) => norm(p[2]) - norm(q[2]));
    const vertices = [[50, 50 - DIA, -90], [50 + DIA, 50, 0], [50, 50 + DIA, 90], [50 - DIA, 50, 180]].filter(dentro).sort((p, q) => norm(q[2]) - norm(p[2]));
    return [borde(a1), ...esquinas.map(p => [p[0], p[1]]), borde(a2), rombo(a2), ...vertices.map(p => [p[0], p[1]]), rombo(a1)];
  }
  const r3 = n => Math.round(n * 1000) / 1000;
  const centro = pl => [pl.reduce((s, p) => s + p[0], 0) / pl.length, pl.reduce((s, p) => s + p[1], 0) / pl.length];
  const M = N - 1, polis = [];
  for (let k = 0; k < M; k++) polis.push(cuna(-90 + k * 360 / M, -90 + (k + 1) * 360 / M));
  polis.push([[50, 50 - DIA], [50 + DIA, 50], [50, 50 + DIA], [50 - DIA, 50]]);

  function azar(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  const disp = polis.map((pl, i) => {
    const R = azar(97 + i * 131), [cx, cy] = centro(pl), dx = cx - 50, dy = cy - 50, l = Math.hypot(dx, dy) || 1;
    if (i === polis.length - 1) return { tx: (R() - .5) * .08, ty: -.05 - R() * .05, tz: 240 + R() * 60, rx: -20 - R() * 10, ry: 26 + R() * 12, rz: -14 - R() * 10 };
    return { tx: dx / l * (.22 + R() * .14), ty: dy / l * (.16 + R() * .10) + (R() - .5) * .05, tz: -240 + R() * 400, rx: (R() - .5) * 64, ry: (R() - .5) * 76, rz: (R() - .5) * 44 };
  });

  const url = U.resolverSrc ? U.resolverSrc(E.maestra) : ((E.maestra && E.maestra.src) || '');
  $('#piezas').innerHTML = polis.map(pl => {
    const [cx, cy] = centro(pl);
    const pts = pl.map(p => `${r3(p[0])}% ${r3(p[1])}%`).join(',');
    return `<div class="pieza" style="transform-origin:${r3(cx)}% ${r3(cy)}%"><div class="cara" style="-webkit-clip-path:polygon(${pts});clip-path:polygon(${pts});background-image:url('${esc(url)}')"><div class="brillo"></div></div><svg class="borde" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><polygon points="${pl.map(p => `${r3(p[0])},${r3(p[1])}`).join(' ')}" vector-effect="non-scaling-stroke"/></svg></div>`;
  }).join('');
  $('#kb').style.backgroundImage = `url('${esc(url)}')`;

  const R0 = azar(5);
  $('#chispas').innerHTML = Array.from({ length: 12 }, () => `<i style="left:${(10 + R0() * 80).toFixed(1)}%;--t:${(4 + R0() ** 2 * 18).toFixed(1)}px;--d:${(6 + R0() * 6).toFixed(1)}s;--r:${(-R0() * 8).toFixed(1)}s;--x:${((R0() - .5) * 40).toFixed(0)}px;--o:${(.35 + R0() * .55).toFixed(2)}"></i>`).join('');
  const piezas = [...$('#piezas').children].map(el => ({ el, brillo: el.querySelector('.brillo'), borde: el.querySelector('.borde'), lt: '', lb: -1, lo: -1, le: 0 }));

  /* ---------- Medidas ---------- */
  const ensamble = $('#ensamble'), col = $('#columna-escena'), mundo = $('#mundo'), marco = $('#marco');
  let frags = [...document.querySelectorAll('.fragmento')];
  const lN = $('#leyenda-n'), lT = $('#leyenda-t'), lL = $('#leyenda-linea');
  let tops = [], alts = [], L = 0, movil = false, fw = 1, fh = 1;
  function medir() {
    const vh = innerHeight;
    movil = innerWidth < 960;
    L = (movil ? .8 : .6) * vh;
    tops = frags.map(f => f.getBoundingClientRect().top + scrollY);
    alts = frags.map(f => Math.max(1, f.offsetHeight));
    fw = marco.offsetWidth || 1;
    fh = marco.offsetHeight || 1;
  }

  /* ---------- Bucle de animación bajo demanda ---------- */
  const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
  const ptr = { x: 0, y: 0, tx: 0, ty: 0 };
  const prog = new Array(N).fill(0);
  const introIni = performance.now() + 450, INTRO = 1800;
  let raf = 0, ultimo = 0, completo = false, activo = -2, mundoT = '', moviendo = false, lineaT = '';
  const pedir = () => { if (!raf) raf = requestAnimationFrame(cuadro); };

  function leyenda() {
    if (completo) { lN.textContent = (E.cierre && E.cierre.ceja) || E.ceja || 'fecha-date'; lT.textContent = 'Una sola imagen'; return; }
    if (activo < 0) { lN.textContent = 'El Origen'; lT.textContent = plano(E.titulo).split('.')[0] || ''; return; }
    lN.textContent = activo === N - 1 ? 'El centro' : `Pieza ${romano(activo + 1)} de ${romano(N)}`;
    lT.textContent = plano((E.fragmentos[activo] && E.fragmentos[activo].texto) || '');
  }

  function cuadro(now) {
    raf = 0;
    const dt = ultimo ? Math.min(64, now - ultimo) : 16;
    ultimo = now;
    const f = dt / 16.67, kp = reduced ? 1 : 1 - Math.pow(1 - .15, f);
    const sy = scrollY;
    let suma = 0, act = -1, quieto = true;
    for (let i = 0; i < N; i++) {
      const raw = clamp((sy + L - tops[i]) / alts[i]);
      if (raw > 0) act = i;
      let v = prog[i] + (raw - prog[i]) * kp;
      if (Math.abs(raw - v) < .0005) v = raw;
      else quieto = false;
      prog[i] = v;
      suma += v;
    }
    const lleno = prog.every(v => v >= .997);
    if (lleno !== completo) { completo = lleno; col.classList.toggle('completo', lleno); leyenda(); }
    if (act !== activo) { activo = act; frags.forEach((x, k) => x.classList.toggle('activo', k === act)); leyenda(); }
    const lt = `scaleX(${(suma / N).toFixed(4)})`;
    if (lt !== lineaT) { lL.style.transform = lt; lineaT = lt; }
    if (fino && !reduced) {
      const ka = 1 - Math.pow(1 - .08, f);
      ptr.x += (ptr.tx - ptr.x) * ka;
      ptr.y += (ptr.ty - ptr.y) * ka;
      if (Math.abs(ptr.tx - ptr.x) > .002 || Math.abs(ptr.ty - ptr.y) > .002) quieto = false;
    }
    const intro = reduced ? 1 : suave(clamp((now - introIni) / INTRO));
    if (intro < 1) quieto = false;
    const ts = completo ? .45 : 1;
    const tw = `rotateX(${(-ptr.y * 5 * ts).toFixed(3)}deg) rotateY(${(ptr.x * 7 * ts).toFixed(3)}deg)`;
    if (tw !== mundoT) { mundo.style.transform = tw; mundoT = tw; }
    const amp = movil ? .78 : 1;
    for (let i = 0; i < piezas.length; i++) {
      const p = piezas[i], s = disp[i], e = encajar(prog[i]), k = (1 - e) * intro, prof = (s.tz + 300) / 600;
      const x = k * (s.tx * fw * amp + ptr.x * 30 * prof), y = k * (s.ty * fh * amp + ptr.y * 24 * prof), z = k * s.tz * amp + Math.sin(Math.PI * e) * 70;
      const t = `translate3d(${x.toFixed(2)}px,${y.toFixed(2)}px,${z.toFixed(2)}px) rotateX(${(s.rx * k).toFixed(2)}deg) rotateY(${(s.ry * k).toFixed(2)}deg) rotateZ(${(s.rz * k).toFixed(2)}deg)`;
      if (t !== p.lt) { p.el.style.transform = t; p.lt = t; }
      const b = Math.min(.8, (Math.abs(s.ry) + Math.abs(s.rx)) * k / 70);
      if (Math.abs(b - p.lb) > .005) { p.brillo.style.opacity = b.toFixed(3); p.lb = b; }
      const o = completo ? 0 : .16 + .69 * clamp(k / .12);
      if (Math.abs(o - p.lo) > .005) { p.borde.style.opacity = o.toFixed(3); p.lo = o; }
      if (p.le < .985 && e >= .985 && !reduced) {
        p.borde.classList.remove('encaja');
        void p.borde.getBoundingClientRect();
        p.borde.classList.add('encaja');
      }
      p.le = e;
    }
    if (moviendo !== !quieto) { moviendo = !quieto; ensamble.classList.toggle('moviendo', moviendo); }
    if (!quieto) pedir();
    else ultimo = 0;
  }

  addEventListener('scroll', pedir, { passive: true });
  let tRes;
  addEventListener('resize', () => { clearTimeout(tRes); tRes = setTimeout(() => { medir(); pedir(); }, 120); });
  if (fino) {
    addEventListener('pointermove', e => {
      ptr.tx = (e.clientX / innerWidth - .5) * 2;
      ptr.ty = (e.clientY / innerHeight - .5) * 2;
      pedir();
    }, { passive: true });
  }
  if ('ResizeObserver' in window) {
    new ResizeObserver(() => { clearTimeout(tRes); tRes = setTimeout(() => { medir(); pedir(); }, 120); }).observe($('.relato'));
  }
  if (document.fonts) document.fonts.ready.then(() => { medir(); pedir(); });
  medir();
  leyenda();
  pedir();

  U.puente($('#puente'));

  addEventListener('historia:actualizada', () => {
    renderizarNarrativaEpilogo();
    frags = [...document.querySelectorAll('.fragmento')];
    medir();
    leyenda();
    reloj();
    const nuevoEp = window.EPILOGO;
    if (nuevoEp && nuevoEp.maestra && nuevoEp.maestra.src) {
      const nuevaUrl = U.resolverSrc ? U.resolverSrc(nuevoEp.maestra) : nuevoEp.maestra.src;
      document.querySelectorAll('#piezas .cara').forEach(cara => {
        cara.style.backgroundImage = `url('${esc(nuevaUrl)}')`;
      });
      const kb = $('#kb');
      if (kb) kb.style.backgroundImage = `url('${esc(nuevaUrl)}')`;
    }
    U.puente($('#puente'));
    pedir();
  });
})();
