/* ==========================================================================
   js/final.js · El Mural · Pared-Álbum Completa + Los 3 Contadores Oficiales
   --------------------------------------------------------------------------
   - Reúne la foto maestra al centro y todas las fotografías de cada capítulo
     listado en `historia.yaml`.
   - En el cierre muestra los 3 contadores automáticos en tiempo real desde
     `historia.yaml`.
   ========================================================================== */
(function () {
  'use strict';
  const U = window.Unibody;
  let F = window.FINAL || {}, S = window.SITIO, E = window.EPILOGO;
  if (!U || !S) return;
  const $ = s => document.querySelector(s);
  const { esc, rico, plano, romano, pad2, fecha, img } = U;
  const NUM = new Intl.NumberFormat('es-MX');

  function azar(seed) {
    let a = seed >>> 0;
    return () => {
      a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }

  let lista = [];

  function renderizarMural() {
    F = window.FINAL || F;
    S = window.SITIO || S;
    E = window.EPILOGO || E;
    const F_FECHAS = (window.HISTORIA && window.HISTORIA.fechas) || {};
    const R = azar(42), incl = F.inclinacion ?? 5;
    const marcos = F.marcos && F.marcos.length ? F.marcos : ['papel'];
    const pines = F.pines || {};
    lista = [];
    let nMarco = 0;

    function impresa(f, x) {
      const i = lista.length;
      lista.push({ src: f.src, mini: f.mini, alt: f.alt || f.pie || x.titulo, pie: f.pie, titulo: x.titulo, meta: x.meta });
      const marco = x.marco || marcos[nMarco++ % marcos.length];
      const r = ((R() - .5) * 2 * incl).toFixed(2), y = Math.round((R() - .5) * 24);
      return `<figure class="impresa ${esc(marco)}" style="--r:${r}deg;--y:${y}px;--pin:${esc(x.pin)}">` +
        `<button class="impresa-btn" type="button" data-f="${i}" aria-label="Ver «${esc(f.pie || x.titulo)}»">` +
        `<span class="impresa-foto" style="--tono:${esc(f.tono || '#2a2025')}">${img(f, { sizes: x.sizes || '(max-width: 700px) 46vw, 226px', vtFijo: x.vt, alt: '' })}</span>` +
        `${f.pie ? `<span class="impresa-pie">${esc(f.pie)}</span>` : ''}</button><span class="pin" aria-hidden="true"></span></figure>`;
    }

    /* 1. Cabecera */
    $('#cabecera').innerHTML =
      `<p class="ceja">${esc(F.ceja || 'El final')}</p>` +
      `<h1 class="display">${rico(F.titulo || 'Nuestro *álbum*')}</h1>` +
      `<p class="entrada">${esc(F.entrada || '')}</p>` +
      `<p class="cuentas" id="cuentas"></p>`;

    /* 2. Centro: La foto maestra */
    if (E && E.maestra) {
      const m = Object.assign({}, E.maestra, { pie: (F.centro && F.centro.pie) || 'fecha-date · La imagen completa' });
      $('#centro').innerHTML = impresa(m, {
        titulo: E.ceja || 'El Origen · fecha-date',
        meta: ['El Origen 3D', F_FECHAS.conocernosEtiqueta || 'fecha-date · El día que nos conocimos'],
        pin: pines.epilogo || '#f4f0ec',
        marco: 'negro',
        sizes: '(max-width: 700px) 80vw, 400px',
        vt: 'portada-final'
      });
    }

    /* 3. Grupos por cada capítulo en historia.yaml */
    const caps = (window.HISTORIA && window.HISTORIA.capitulos) || [];
    let html = '', fotos = E && E.maestra ? 1 : 0, eps = 0, n = 0;

    caps.forEach(c => {
      n++;
      const numRomano = c.romano || romano(c.numero);
      const pin = pines[c.id] || (c.tema && c.tema.acento) || '#f43f5e';
      const capUrl = c.archivo || `capitulo.html?id=${encodeURIComponent(c.id)}`;
      let tiras = '';
      (c.episodios || []).forEach(e => {
        eps++;
        (e.fotos || []).forEach(f => {
          fotos++;
          tiras += impresa(f, {
            titulo: plano(e.titulo),
            meta: [`Capítulo ${numRomano} · ${plano(c.titulo)}`, fecha(e.fecha), e.lugar],
            pin
          });
        });
      });
      html += `<section class="grupo" aria-label="Capítulo ${esc(numRomano)}: ${esc(plano(c.titulo))}">` +
        `<a class="etiqueta" href="${esc(capUrl)}" data-ir style="--pin:${esc(pin)};--r:${((R() - .5) * 4).toFixed(2)}deg">` +
          `<span class="n">Capítulo ${esc(numRomano)}</span>` +
          `<span class="t">${esc(plano(c.titulo))}</span>` +
          (c.periodo ? `<span class="p">${esc(c.periodo)}</span>` : '') +
        `</a>` +
        `<div class="fotos-grupo">${tiras}</div>` +
      `</section>`;
    });

    const fConocernosTxt = F_FECHAS.conocernos && F_FECHAS.conocernos !== 'fecha-date' ? fecha(String(F_FECHAS.conocernos).slice(0, 10)) : 'fecha-date';
    const fNoviosTxt = F_FECHAS.novios && F_FECHAS.novios !== 'fecha-date' ? fecha(String(F_FECHAS.novios).slice(0, 10)) : 'fecha-date';
    const fBodaTxt = F_FECHAS.boda && F_FECHAS.boda !== 'fecha-date' ? fecha(String(F_FECHAS.boda).slice(0, 10)) : 'fecha-date';
    const diaMes = F_FECHAS.diaAniversarioMensual || 1;

    $('#grupos').innerHTML = html;
    $('#cuentas').innerHTML =
      `<span><b>${fotos}</b> fotografías</span>` +
      `<span><b>${n}</b> capítulo${n === 1 ? '' : 's'}</span>` +
      `<span><b>${eps}</b> episodios</span>` +
      `<span>✦ <b>${esc(fConocernosTxt)} — ${esc(fBodaTxt)}</b></span>`;

    /* 4. Despedida + Los 3 Contadores Automáticos en vivo */
    const d = F.despedida || {};
    $('#despedida').innerHTML =
      `<h2 class="display">${rico(d.titulo || 'Fin. *Por ahora.*')}</h2>` +
      (d.texto ? `<p class="entrada">${esc(d.texto)}</p>` : '') +
      `<div class="sigue-grid">` +
        `<div class="sigue">` +
          `<span class="k">Nos conocimos</span>` +
          `<span class="v">${esc(fConocernosTxt)}</span>` +
          `<span class="d" id="final-cnt-conocernos">—</span>` +
        `</div>` +
        `<div class="sigue">` +
          `<span class="k">Oficialmente novios · Cada ${esc(String(diaMes))}</span>` +
          `<span class="v">${esc(fNoviosTxt)}</span>` +
          `<span class="d" id="final-cnt-novios">—</span>` +
        `</div>` +
        `<div class="sigue">` +
          `<span class="k">Nuestra Boda (1.er Aniversario)</span>` +
          `<span class="v">${esc(fBodaTxt)}</span>` +
          `<span class="d" id="final-cnt-boda">—</span>` +
        `</div>` +
      `</div>` +
      `<a class="boton claro" href="index.html" data-ir>Volver a la Portada Flotante Principal ${U.ICON.flecha}</a>`;

    const pieFinal = document.getElementById('pie-final');
    if (pieFinal) {
      pieFinal.textContent = `El Mural · ${fConocernosTxt} — ${fBodaTxt}`;
    }
  }

  $('#mural').addEventListener('click', e => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    U.visor.abrir(lista, +b.dataset.f, b, null, 'final');
  });

  function actualizarRelojesFinal() {
    if (!window.DatosAmor || !window.DatosAmor.calcularEstadoFechas) return;
    const est = window.DatosAmor.calcularEstadoFechas(new Date());
    const diaMes = est.novios.diaAniversarioMensual;
    const el1 = document.getElementById('final-cnt-conocernos');
    const el2 = document.getElementById('final-cnt-novios');
    const el3 = document.getElementById('final-cnt-boda');
    if (el1) {
      el1.textContent = `Hace ${NUM.format(est.conocernos.dias)} días · ${pad2(est.conocernos.horas)}:${pad2(est.conocernos.minutos)}:${pad2(est.conocernos.segundos)}`;
    }
    if (el2) {
      const m = est.novios.mesesCumplidos;
      const prox = est.novios.esHoyAniversario
        ? `¡Hoy es ${diaMes}!`
        : `Próx. ${diaMes} en ${est.novios.faltaProximo27.dias}d ${pad2(est.novios.faltaProximo27.horas)}h`;
      el2.textContent = `${m} ${m === 1 ? 'mes' : 'meses'} (${NUM.format(est.novios.dias)} días) · ${prox}`;
    }
    if (el3) {
      el3.textContent = `Faltan ${NUM.format(est.boda.dias)} días · ${pad2(est.boda.horas)}:${pad2(est.boda.minutos)}:${pad2(est.boda.segundos)}`;
    }
  }

  renderizarMural();
  actualizarRelojesFinal();
  setInterval(actualizarRelojesFinal, 1000);
  window.addEventListener('historia:actualizada', () => {
    renderizarMural();
    actualizarRelojesFinal();
  });
})();
