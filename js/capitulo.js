/* ==========================================================================
   js/capitulo.js · Versión 1.0 Adaptada por Capítulo, Storytelling y Fechas
   --------------------------------------------------------------------------
   - Construye la portada del capítulo, la franja de contexto temporal
     (configurada en `historia.yaml`), los episodios con cálculo
     automático de días e hitos de relación y su carrusel 3D interactivo.
   - Alimentado íntegramente por `historia.yaml` (vía `js/datos-yaml.js`).
   ========================================================================== */
(function () {
  'use strict';
  const U = window.Unibody;
  if (!U) return;
  const $ = s => document.querySelector(s);
  const { esc, rico, plano, romano, pad2, fecha, img } = U;

  function calcularInsigniaEpisodio(fechaIso) {
    if (!fechaIso || fechaIso === 'fecha-date') return '';
    const [y, m, d] = String(fechaIso).split('-').map(Number);
    if (!y || !m || !d) return '';
    const dtEp = new Date(y, m - 1, d, 12, 0, 0);
    const F = (window.HISTORIA && window.HISTORIA.fechas) || {};
    if (!F.conocernos || F.conocernos === 'fecha-date') return '';
    const dtConocernos = new Date(F.conocernos);
    const dtNovios = F.novios && F.novios !== 'fecha-date' ? new Date(F.novios) : dtConocernos;
    if (Number.isNaN(dtConocernos.getTime())) return '';
    const diaMes = Number(F.diaAniversarioMensual || dtNovios.getDate() || 1);

    const diasDesdeConocernos = Math.max(1, Math.round((dtEp.getTime() - dtConocernos.getTime()) / 86400000) + 1);
    const diasDeNovios = Math.round((dtEp.getTime() - dtNovios.getTime()) / 86400000);

    if (d === diaMes && dtEp >= dtNovios) {
      const meses = (y - dtNovios.getFullYear()) * 12 + (m - 1 - dtNovios.getMonth());
      if (meses === 0) return `✦ Día ${diaMes} · Oficialmente novios`;
      return `✦ Aniversario día ${diaMes} · Mes #${meses} de novios`;
    }
    if (diasDeNovios >= 0) {
      return `Día ${diasDesdeConocernos} desde conocernos · Día ${diasDeNovios + 1} de novios`;
    }
    return `Día ${diasDesdeConocernos} desde que nos conocimos`;
  }

  function renderizarCapitulo() {
    const id = window.PAGINA_ID;
    const C = (window.CAPITULOS || {})[id];
    if (!C) return;

    /* Aplicar tema del capítulo si viene definido en historia.yaml */
    if (C.tema) {
      const r = document.documentElement.style;
      if (C.tema.fondo) r.setProperty('--fondo', C.tema.fondo);
      if (C.tema.acento) r.setProperty('--acento', C.tema.acento);
      if (C.tema.acento2) r.setProperty('--acento-2', C.tema.acento2);
      if (C.tema.resplandor) r.setProperty('--resplandor', C.tema.resplandor);
      if (C.tema.resplandor2) r.setProperty('--resplandor-2', C.tema.resplandor2);
      if (C.tema.velo) r.setProperty('--velo', C.tema.velo);
    }

    const numRomano = C.romano || romano(C.numero);
    if (window.SITIO) {
      document.title = `Capítulo ${numRomano} · ${plano(C.titulo)} — ${window.SITIO.marca}`;
    }

    const eps = C.episodios || [];
    const p = C.portada || {};
    const total = eps.reduce((s, e) => s + (e.fotos || []).length, 0);

    /* 1. Portada del capítulo */
    const portada = $('#portada');
    if (portada) {
      portada.style.setProperty('--tono', p.tono || '#120f14');
      portada.innerHTML =
        img(p, { prioridad: true, sizes: '100vw', wMini: 960, wGrande: 1920, alt: p.alt || p.pie || '', vtFijo: `portada-${id}` }) +
        `<div class="portada-txt gutter">` +
          `<p class="ceja">Capítulo ${esc(numRomano)}${C.periodo ? ' · ' + esc(C.periodo) : ''}</p>` +
          `<h1 class="display">${rico(C.titulo)}</h1>` +
          (C.resumen ? `<p class="entrada">${esc(C.resumen)}</p>` : '') +
          `<p class="datos">` +
            `<span><b>${eps.length}</b> episodio${eps.length === 1 ? '' : 's'}</span>` +
            `<span><b>${total}</b> fotografía${total === 1 ? '' : 's'}</span>` +
            (C.hitoRelacion ? `<span>✦ <b>${esc(C.hitoRelacion)}</b></span>` : '') +
          `</p>` +
        `</div>`;
    }

    /* 2. Franja de contexto de fechas (desde historia.yaml) */
    let franjaEl = document.getElementById('franja-hito');
    if (!franjaEl && portada) {
      franjaEl = document.createElement('div');
      franjaEl.id = 'franja-hito';
      franjaEl.className = 'gutter';
      portada.insertAdjacentElement('afterend', franjaEl);
    }
    if (franjaEl) {
      const F = (window.HISTORIA && window.HISTORIA.fechas) || {};
      const est = window.DatosAmor && window.DatosAmor.calcularEstadoFechas
        ? window.DatosAmor.calcularEstadoFechas(new Date())
        : null;
      const diaMes = (est && est.novios.diaAniversarioMensual) || F.diaAniversarioMensual || 1;
      const textoProximo = est
        ? (est.novios.esHoyAniversario
            ? `¡Hoy es ${diaMes}! (${est.novios.mesesCumplidos} meses)`
            : `${est.novios.mesesCumplidos} meses · Próx. ${diaMes} en ${est.novios.faltaProximo27.dias}d`)
        : `Día ${diaMes} de cada mes`;
      const fConocernosTxt = F.conocernos && F.conocernos !== 'fecha-date' ? fecha(String(F.conocernos).slice(0, 10)) : 'fecha-date';
      const fNoviosTxt = F.novios && F.novios !== 'fecha-date' ? fecha(String(F.novios).slice(0, 10)) : 'fecha-date';
      const fBodaTxt = F.boda && F.boda !== 'fecha-date' ? fecha(String(F.boda).slice(0, 10)) : 'fecha-date';

      franjaEl.innerHTML =
        `<div class="franja-hito">` +
          `<div class="franja-hito-izq">` +
            `<span class="franja-punto" aria-hidden="true"></span>` +
            `<span><strong>Hito del capítulo:</strong> ${esc(C.hitoRelacion || C.periodo || plano(C.titulo))}</span>` +
          `</div>` +
          `<div class="franja-hito-der">` +
            `<span class="chip-fecha">Conocernos: <b>${esc(fConocernosTxt)}</b></span>` +
            `<span class="chip-fecha">Novios: <b>${esc(fNoviosTxt)}</b> (${esc(textoProximo)})</span>` +
            `<span class="chip-fecha">Boda: <b>${esc(fBodaTxt)}</b></span>` +
          `</div>` +
        `</div>`;
    }

    const pieCap = document.getElementById('pie-capitulo');
    if (pieCap && C.hitoRelacion) {
      pieCap.textContent = `Capítulo ${numRomano} · ${C.hitoRelacion}`;
    }

    /* 3. Episodios con storytelling, fechas y carrusel 3D */
    const contEps = $('#episodios');
    if (contEps) {
      contEps.innerHTML = eps.map((e, i) => {
        const insignia = calcularInsigniaEpisodio(e.fecha);
        return `<article class="episodio" id="episodio-${i + 1}">` +
          `<div class="ep-texto">` +
            `<p class="ep-n"><b>${pad2(i + 1)}</b>Episodio</p>` +
            `<h2 class="ep-titulo">${rico(e.titulo)}</h2>` +
            `<p class="ep-lugar">` +
              (e.fecha ? `<span>${esc(fecha(e.fecha))}</span>` : '') +
              (e.lugar ? `<span>${esc(e.lugar)}</span>` : '') +
            `</p>` +
            (insignia ? `<div><span class="ep-badge-dia">${esc(insignia)}</span></div>` : '') +
            (e.texto ? `<p class="ep-cuerpo">${esc(e.texto)}</p>` : '') +
          `</div>` +
          `<div class="ep-fotos">${(e.fotos || []).length ? U.carruselHTML(e.fotos, `Fotos de «${plano(e.titulo)}»`) : ''}</div>` +
        `</article>`;
      }).join('');

      [...contEps.querySelectorAll('.episodio')].forEach((el, i) => {
        const e = eps[i], nodo = el.querySelector('.carrusel');
        if (!nodo) return;
        const lista = (e.fotos || []).map(f => ({
          src: f.src,
          mini: f.mini,
          alt: f.alt || f.pie || plano(e.titulo),
          pie: f.pie,
          titulo: plano(e.titulo),
          meta: [fecha(e.fecha), e.lugar, `Capítulo ${numRomano} · Episodio ${i + 1}`]
        }));
        const car = U.carrusel(nodo, {
          alAbrir: (k, origen) => U.visor.abrir(lista, k, origen, kk => car.sincronizar(kk), `${id}-${i}`)
        });
      });
    }

    /* 4. Puente al capítulo siguiente / anterior */
    U.puente($('#puente'));
  }

  renderizarCapitulo();
  window.addEventListener('historia:actualizada', renderizarCapitulo);
})();
