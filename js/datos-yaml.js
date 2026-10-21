/* ==========================================================================
   js/datos-yaml.js · Cargador Maestro de historia.yaml + Motor de Fechas
   --------------------------------------------------------------------------
   - Lee y parsea `historia.yaml` en tiempo real cuando se sirve por HTTP/HTTPS.
   - Incluye respaldo sincronizado automático por si se abre con doble clic (file://).
   - Pobla window.HISTORIA, window.SITIO, window.EPILOGO, window.CAPITULOS,
     window.FINAL y aplica los colores del tema de cada capítulo.
   - Calcula automáticamente:
     1) Tiempo desde que se conocieron (14 de marzo de 2026)
     2) Tiempo de novios (27 de marzo de 2026) + próximo aniversario día 27 de cada mes
     3) Cuenta regresiva a la boda (27 de marzo de 2027 · 1 año de novios)
   ========================================================================== */
(function () {
  'use strict';
  const root = typeof window !== 'undefined' ? window : globalThis;

  /* ---------- Parser YAML ligero para la estructura de historia.yaml ---------- */
  function parseValorYaml(raw) {
    let s = raw.trim();
    if (!s) return '';
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
      return s.slice(1, -1).replace(/\\"/g, '"');
    }
    if (s === 'true') return true;
    if (s === 'false') return false;
    if (s === 'null') return null;
    if (/^-?\d+(\.\d+)?$/.test(s)) return Number(s);
    return s;
  }

  function stripComment(line) {
    let inSingle = false, inDouble = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === "'" && !inDouble) inSingle = !inSingle;
      else if (ch === '"' && !inSingle && line[i - 1] !== '\\') inDouble = !inDouble;
      else if (ch === '#' && !inSingle && !inDouble && (i === 0 || /\s/.test(line[i - 1]))) {
        return line.slice(0, i);
      }
    }
    return line;
  }

  function parseYaml(texto) {
    const rawLines = String(texto || '').replace(/\r\n?/g, '\n').split('\n');
    const lines = [];
    for (const raw of rawLines) {
      const clean = stripComment(raw).replace(/\s+$/, '');
      if (!clean.trim()) continue;
      const indent = clean.match(/^ */)[0].length;
      lines.push({ indent, text: clean.trim() });
    }

    let idx = 0;
    function parseBlock(baseIndent) {
      if (idx >= lines.length || lines[idx].indent < baseIndent) return {};
      const isArray = lines[idx].text.startsWith('- ');
      if (isArray) {
        const arr = [];
        while (idx < lines.length && lines[idx].indent === baseIndent && lines[idx].text.startsWith('- ')) {
          const itemText = lines[idx].text.slice(2).trim();
          const itemIndent = baseIndent + 2;
          idx++;
          if (!itemText) {
            arr.push(parseBlock(itemIndent));
          } else if (
            itemText.includes(':') &&
            !itemText.startsWith('"') &&
            !itemText.startsWith("'")
          ) {
            const colonPos = itemText.indexOf(':');
            const k = itemText.slice(0, colonPos).trim();
            const vRest = itemText.slice(colonPos + 1).trim();
            const obj = {};
            if (vRest) {
              obj[k] = parseValorYaml(vRest);
            } else {
              obj[k] = parseBlock(itemIndent + 2);
            }
            if (idx < lines.length && lines[idx].indent >= itemIndent) {
              const extra = parseBlock(lines[idx].indent);
              if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
                Object.assign(obj, extra);
              }
            }
            arr.push(obj);
          } else {
            arr.push(parseValorYaml(itemText));
          }
        }
        return arr;
      } else {
        const obj = {};
        while (idx < lines.length && lines[idx].indent === baseIndent && !lines[idx].text.startsWith('- ')) {
          const line = lines[idx].text;
          const colonPos = line.indexOf(':');
          if (colonPos === -1) { idx++; continue; }
          const key = line.slice(0, colonPos).trim();
          const valPart = line.slice(colonPos + 1).trim();
          idx++;
          if (valPart) {
            obj[key] = parseValorYaml(valPart);
          } else if (idx < lines.length && lines[idx].indent > baseIndent) {
            obj[key] = parseBlock(lines[idx].indent);
          } else {
            obj[key] = null;
          }
        }
        return obj;
      }
    }
    return parseBlock(0);
  }

  /* ---------- Respaldo embebido sincronizado con historia.yaml ---------- */
  const FALLBACK_YAML = `
version: "2.0"
marca: "Unibody"
subtituloMarca: "Nuestra Historia"
pareja:
  el: "Mí"
  ella: "Ti"
googleDrive:
  activo: true
  apiKey: ""
  carpetaRaizId: ""
  modo: "reemplazar"
  cacheMinutos: 5
  carpetasPorCapitulo:
    epilogo: ""
    cap-1: ""
    cap-2: ""
    cap-3: ""
    cap-4: ""
fechas:
  conocernos: "2026-03-14T00:00:00"
  conocernosEtiqueta: "14 de marzo de 2026 · El día que nos conocimos"
  novios: "2026-03-27T00:00:00"
  noviosEtiqueta: "27 de marzo de 2026 · Oficialmente novios"
  diaAniversarioMensual: 27
  aniversarioMensualNota: "Cada 27 de mes celebramos un mes más siendo novios"
  boda: "2027-03-27T17:00:00"
  bodaEtiqueta: "27 de marzo de 2027 · Nuestra Boda (1.er Aniversario)"
hitos:
  - fecha: "2026-03-14"
    titulo: "El primer encuentro"
    detalle: "14 de marzo de 2026 · El día en que nuestros caminos se cruzaron por primera vez."
    capitulo: "epilogo"
  - fecha: "2026-03-27"
    titulo: "Oficialmente novios"
    detalle: "27 de marzo de 2026 · El inicio de nuestra tradición de celebrar cada día 27."
    capitulo: "cap-1"
  - fecha: "2026-05-27"
    titulo: "Dos meses de novios"
    detalle: "27 de mayo de 2026 · Un 27 guardado desde la mañana hasta el pastel con velas."
    capitulo: "cap-1"
  - fecha: "2026-06-22"
    titulo: "Tarde de aventura"
    detalle: "Junio de 2026 · Cafés, espejos, risas espontáneas y flores en el pelo."
    capitulo: "cap-2"
  - fecha: "2026-07-18"
    titulo: "Nuestro viaje al mar"
    detalle: "18 al 20 de julio de 2026 · Tres días de olas, lancha, muelle y atardeceres dorados."
    capitulo: "cap-3"
  - fecha: "2026-07-24"
    titulo: "La pregunta y el Sí"
    detalle: "24 de julio de 2026 · Un picnic al atardecer, dos copas, un anillo y un para siempre."
    capitulo: "cap-4"
  - fecha: "2027-03-27"
    titulo: "Nuestra Boda"
    detalle: "27 de marzo de 2027 · Exactamente un año después de hacernos novios."
    capitulo: "final"
portadaPrincipal:
  ceja: "Nuestra historia en movimiento · 14 Mar 2026 — 27 Mar 2027"
  tituloPalabras:
    - "Mira"
    - "todo"
    - "lo"
    - "que"
    - "hemos"
    - "*vivido*"
  subtitulo: "De mí para ti · Nos conocimos un 14 de marzo, nos hicimos novios un 27 de marzo y cada recuerdo flota en nuestro propio universo. Toca cualquier fotografía o entra a cada capítulo para vivir la historia."
  pie: "Pasa el cursor sobre las fotos flotantes para enfocarlas o entra a cada capítulo"
  destacadasHero:
    - "ep-maestra"
    - "c1-portada"
    - "c1-e3-5"
    - "c2-e3-2"
    - "c2-e4-4"
    - "c3-e1-1"
    - "c3-e4-6"
    - "c4-e1-3"
epilogo:
  archivo: "epilogo.html"
  corto: "Origen 3D"
  ceja: "El Origen · 14 y 27 de marzo de 2026"
  titulo: "Dos caminos.<br>Una sola *historia*."
  entrada: "El 14 de marzo de 2026 nos conocimos y el 27 de marzo comenzó oficialmente nuestra historia. Desliza para unir cada pieza hasta formar la imagen completa."
  transicion: "fundido"
  tema:
    fondo: "#07070a"
    acento: "#f43f5e"
    acento2: "#f59e0b"
    resplandor: "rgba(244,63,94,.17)"
    resplandor2: "rgba(245,158,11,.10)"
    velo: "#0b080b"
  maestra:
    id: "ep-maestra"
    src: "assets/fotos/epilogo/maestra.webp"
    mini: "assets/fotos/epilogo/maestra-s.webp"
    tono: "#1d1312"
    aspect: "4/5"
    alt: "Nuestra primera foto juntos"
    pie: "Nuestra primera foto juntos · Marzo de 2026"
  fragmentos:
    - texto: "Hubo un 14 de marzo en que dos caminos se cruzaron."
      nota: "14 de marzo de 2026 · El día que nos conocimos"
    - texto: "Trece días después, el *27 de marzo*, empezó oficialmente lo nuestro."
      nota: "27 de marzo de 2026 · Nuestro primer día como novios"
    - texto: "Después vinieron los cafés, los espejos y cada día *27*."
      nota: "Primavera y junio de 2026 · Celebrando cada mes juntos"
    - texto: "Luego el *mar* y una tarde con una pregunta."
      nota: "Julio de 2026 · Las olas y el sí al atardecer"
    - texto: "Y hoy, rumbo a nuestro próximo *27 de marzo*, todo encaja."
      nota: "27 de marzo de 2027 · El día de nuestra boda"
  cierre:
    ceja: "El Origen"
    titulo: "Una sola *imagen*."
    texto: "Así se ve todo cuando cada pieza está en su lugar. Ahora sí, recorramos capítulo por capítulo."
capitulos:
  - id: "cap-1"
    numero: 1
    romano: "I"
    archivo: "capitulo-1.html"
    titulo: "Donde todo *empezó*"
    periodo: "14 Mar — 27 May 2026"
    hitoCapitulo: "Nos conocimos el 14 de marzo · Novios desde el 27 de marzo de 2026"
    resumen: "Del 14 de marzo en que nos conocimos al 27 de marzo en que nos hicimos novios, nuestras primeras salidas y aquel segundo aniversario mensual del 27 de mayo."
    transicion: "iris"
    tema:
      fondo: "#0a0709"
      acento: "#f43f5e"
      acento2: "#fb923c"
      resplandor: "rgba(244,63,94,.18)"
      resplandor2: "rgba(251,146,60,.10)"
      velo: "#12080c"
    portada:
      id: "c1-portada"
      src: "assets/fotos/capitulo-1/portada.webp"
      mini: "assets/fotos/capitulo-1/portada-s.webp"
      tono: "#282525"
      aspect: "16/10"
      alt: "Selfie de los dos, muy cerca, una mañana de mayo"
      pie: "Una mañana de mayo, muy cerca"
    episodios:
      - titulo: "Las primeras fotos"
        fecha: "2026-04-16"
        lugar: "Tras nuestro primer 27 de marzo"
        texto: "Después de conocernos el 14 de marzo y hacernos novios el 27, cada paseo empezó a convertirse en recuerdo: la montaña detrás, una tienda cualquiera, una luz morada. Así empezó este álbum."
        fotos:
          - id: "c1-e1-1"
            src: "assets/fotos/capitulo-1/e1-1.webp"
            mini: "assets/fotos/capitulo-1/e1-1-s.webp"
            tono: "#231e23"
            aspect: "4/5"
            pie: "Un paseo con la montaña detrás"
          - id: "c1-e1-2"
            src: "assets/fotos/capitulo-1/e1-2.webp"
            mini: "assets/fotos/capitulo-1/e1-2-s.webp"
            tono: "#29261e"
            aspect: "4/5"
            pie: "Haciendo tiempo, juntos"
          - id: "c1-e1-3"
            src: "assets/fotos/capitulo-1/e1-3.webp"
            mini: "assets/fotos/capitulo-1/e1-3-s.webp"
            tono: "#1e0f1d"
            aspect: "4/5"
            pie: "Luz morada"
          - id: "c1-e1-4"
            src: "assets/fotos/capitulo-1/e1-4.webp"
            mini: "assets/fotos/capitulo-1/e1-4-s.webp"
            tono: "#2d2421"
            aspect: "4/5"
            pie: "Abrazados, celebrando nuestro primer mes (27 de abril)"
      - titulo: "Días de mayo"
        fecha: "2026-05-14"
        lugar: "Mayo de 2026"
        texto: "Mañanas sin prisa, caras chistosas frente a la cámara y la costumbre, cada vez más nuestra, de tomarnos una foto más."
        fotos:
          - id: "c1-e2-1"
            src: "assets/fotos/capitulo-1/e2-1.webp"
            mini: "assets/fotos/capitulo-1/e2-1-s.webp"
            tono: "#2a2420"
            aspect: "4/5"
            pie: "Una mañana de mayo"
          - id: "c1-e2-2"
            src: "assets/fotos/capitulo-1/e2-2.webp"
            mini: "assets/fotos/capitulo-1/e2-2-s.webp"
            tono: "#262221"
            aspect: "4/5"
            pie: "Tu sonrisa, de cerca"
          - id: "c1-e2-3"
            src: "assets/fotos/capitulo-1/e2-3.webp"
            mini: "assets/fotos/capitulo-1/e2-3-s.webp"
            tono: "#372c29"
            aspect: "4/5"
            pie: "Bien arreglados"
      - titulo: "Un 27 de *mayo*"
        fecha: "2026-05-27"
        lugar: "Nuestro 2.º aniversario mensual"
        texto: "Cumplíamos dos meses de novios y ese 27 quedó guardado de principio a fin: la primera foto de la mañana, el espejo por la tarde, la carretera al atardecer y, en la noche, un pastel con velas."
        fotos:
          - id: "c1-e3-1"
            src: "assets/fotos/capitulo-1/e3-1.webp"
            mini: "assets/fotos/capitulo-1/e3-1-s.webp"
            tono: "#312a26"
            aspect: "4/5"
            pie: "Temprano, todavía con sueño"
          - id: "c1-e3-2"
            src: "assets/fotos/capitulo-1/e3-2.webp"
            mini: "assets/fotos/capitulo-1/e3-2-s.webp"
            tono: "#322f2c"
            aspect: "4/5"
            pie: "Frente al espejo"
          - id: "c1-e3-3"
            src: "assets/fotos/capitulo-1/e3-3.webp"
            mini: "assets/fotos/capitulo-1/e3-3-s.webp"
            tono: "#2d2b2b"
            aspect: "4/5"
            pie: "De camino"
          - id: "c1-e3-4"
            src: "assets/fotos/capitulo-1/e3-4.webp"
            mini: "assets/fotos/capitulo-1/e3-4-s.webp"
            tono: "#1f1916"
            aspect: "4/5"
            pie: "Pastel y velas por nuestro día 27"
          - id: "c1-e3-5"
            src: "assets/fotos/capitulo-1/e3-5.webp"
            mini: "assets/fotos/capitulo-1/e3-5-s.webp"
            tono: "#201916"
            aspect: "4/5"
            pie: "Y un beso para cerrar el día"
  - id: "cap-2"
    numero: 2
    romano: "II"
    archivo: "capitulo-2.html"
    titulo: "Nuestros *días*"
    periodo: "31 May — 28 Jun 2026"
    hitoCapitulo: "Rumbo a nuestro 3.er mes de novios (27 de junio de 2026)"
    resumen: "Los días normales que, vistos juntos, resultaron ser los mejores: tardes de café, aventuras espontáneas y nuestro tercer 27 juntos."
    transicion: "cortina"
    tema:
      fondo: "#0a0806"
      acento: "#f59e0b"
      acento2: "#fde68a"
      resplandor: "rgba(245,158,11,.16)"
      resplandor2: "rgba(244,63,94,.08)"
      velo: "#120d06"
    portada:
      id: "c2-portada"
      src: "assets/fotos/capitulo-2/portada.webp"
      mini: "assets/fotos/capitulo-2/portada-s.webp"
      tono: "#2e2a1f"
      aspect: "16/10"
      alt: "Los dos sobre el pasto, con flores en el pelo"
      pie: "Los dos sobre el pasto, con flores en el pelo"
    episodios:
      - titulo: "Cafés y espejos"
        fecha: "2026-05-31"
        lugar: "Finales de mayo y principios de junio"
        texto: "Una bebida verde en la mesa, el espejo de siempre y nosotros intentando salir bien en la foto. Casi nunca a la primera."
        fotos:
          - id: "c2-e1-1"
            src: "assets/fotos/capitulo-2/e1-1.webp"
            mini: "assets/fotos/capitulo-2/e1-1-s.webp"
            tono: "#292828"
            aspect: "4/5"
            pie: "Un café por la tarde"
          - id: "c2-e1-2"
            src: "assets/fotos/capitulo-2/e1-2.webp"
            mini: "assets/fotos/capitulo-2/e1-2-s.webp"
            tono: "#272423"
            aspect: "4/5"
            pie: "El espejo de siempre"
          - id: "c2-e1-3"
            src: "assets/fotos/capitulo-2/e1-3.webp"
            mini: "assets/fotos/capitulo-2/e1-3-s.webp"
            tono: "#292625"
            aspect: "4/5"
            pie: "Y un beso, también en el espejo"
      - titulo: "Lo de todos los días"
        fecha: "2026-06-15"
        lugar: "Junio de 2026"
        texto: "Sol de mediodía, lentes oscuros, caras raras y paseos que se alargaban hasta la noche. Nada extraordinario y, justo por eso, todo."
        fotos:
          - id: "c2-e2-1"
            src: "assets/fotos/capitulo-2/e2-1.webp"
            mini: "assets/fotos/capitulo-2/e2-1-s.webp"
            tono: "#222226"
            aspect: "4/5"
            pie: "Sol de mediodía"
          - id: "c2-e2-2"
            src: "assets/fotos/capitulo-2/e2-2.webp"
            mini: "assets/fotos/capitulo-2/e2-2-s.webp"
            tono: "#1c1919"
            aspect: "4/5"
            pie: "Caras de siempre"
          - id: "c2-e2-3"
            src: "assets/fotos/capitulo-2/e2-3.webp"
            mini: "assets/fotos/capitulo-2/e2-3-s.webp"
            tono: "#282422"
            aspect: "4/5"
            pie: "Tú y yo en el espejo"
          - id: "c2-e2-4"
            src: "assets/fotos/capitulo-2/e2-4.webp"
            mini: "assets/fotos/capitulo-2/e2-4-s.webp"
            tono: "#1e1816"
            aspect: "4/5"
            pie: "Una noche de junio"
      - titulo: "Tarde de *aventura*"
        fecha: "2026-06-22"
        lugar: "Escapada de fin de semana"
        texto: "Hay tardes que no necesitan explicación: una risa que no se acababa y nosotros sin poder dejar de tomarnos fotos."
        fotos:
          - id: "c2-e3-1"
            src: "assets/fotos/capitulo-2/e3-1.webp"
            mini: "assets/fotos/capitulo-2/e3-1-s.webp"
            tono: "#2a292a"
            aspect: "4/5"
            pie: "Lista para la aventura"
          - id: "c2-e3-2"
            src: "assets/fotos/capitulo-2/e3-2.webp"
            mini: "assets/fotos/capitulo-2/e3-2-s.webp"
            tono: "#39322c"
            aspect: "4/5"
            pie: "La jinete más feliz"
          - id: "c2-e3-3"
            src: "assets/fotos/capitulo-2/e3-3.webp"
            mini: "assets/fotos/capitulo-2/e3-3-s.webp"
            tono: "#3b3731"
            aspect: "4/5"
            pie: "Directo a la cámara"
      - titulo: "Flores en el *pelo*"
        fecha: "2026-06-27"
        lugar: "Nuestro 3.er aniversario mensual (27 de junio)"
        texto: "Tardes cerca, muy cerca, celebrando tres meses de novios. Y un día sobre el pasto en el que terminé con flores en el pelo."
        fotos:
          - id: "c2-e4-1"
            src: "assets/fotos/capitulo-2/e4-1.webp"
            mini: "assets/fotos/capitulo-2/e4-1-s.webp"
            tono: "#2a211e"
            aspect: "4/5"
            pie: "Cachete con cachete"
          - id: "c2-e4-2"
            src: "assets/fotos/capitulo-2/e4-2.webp"
            mini: "assets/fotos/capitulo-2/e4-2-s.webp"
            tono: "#312422"
            aspect: "4/5"
            pie: "Ojos cerrados, sonrisa abierta"
          - id: "c2-e4-3"
            src: "assets/fotos/capitulo-2/e4-3.webp"
            mini: "assets/fotos/capitulo-2/e4-3-s.webp"
            tono: "#271f1d"
            aspect: "4/5"
            pie: "Un beso robado"
          - id: "c2-e4-4"
            src: "assets/fotos/capitulo-2/e4-4.webp"
            mini: "assets/fotos/capitulo-2/e4-4-s.webp"
            tono: "#282523"
            aspect: "4/5"
            pie: "Flores en el pelo"
  - id: "cap-3"
    numero: 3
    romano: "III"
    archivo: "capitulo-3.html"
    titulo: "Frente al *mar*"
    periodo: "18 — 20 Jul 2026"
    hitoCapitulo: "Nuestra escapada al mar antes del 4.º aniversario mensual"
    resumen: "Tres días de julio con sal, sol, olas y la certeza de que cualquier lugar se siente como casa cuando estamos juntos."
    transicion: "zoom"
    tema:
      fondo: "#05090b"
      acento: "#2dd4bf"
      acento2: "#7dd3fc"
      resplandor: "rgba(45,212,191,.14)"
      resplandor2: "rgba(125,211,252,.08)"
      velo: "#061012"
    portada:
      id: "c3-portada"
      src: "assets/fotos/capitulo-3/portada.webp"
      mini: "assets/fotos/capitulo-3/portada-s.webp"
      tono: "#2f3236"
      aspect: "16/10"
      alt: "Los dos de pie en la playa, frente al mar"
      pie: "Los dos de pie en la playa, frente al mar"
    episodios:
      - titulo: "Llegar al *mar*"
        fecha: "2026-07-18"
        lugar: "Día 1 · Frente a las olas"
        texto: "El primer vistazo a las olas, el viento despeinándonos, un paseo en lancha con chalecos verdes y un cocodrilo que se dejó cargar (más o menos)."
        fotos:
          - id: "c3-e1-1"
            src: "assets/fotos/capitulo-3/e1-1.webp"
            mini: "assets/fotos/capitulo-3/e1-1-s.webp"
            tono: "#332c29"
            aspect: "4/5"
            pie: "El primer vistazo al mar"
          - id: "c3-e1-2"
            src: "assets/fotos/capitulo-3/e1-2.webp"
            mini: "assets/fotos/capitulo-3/e1-2-s.webp"
            tono: "#3e3a38"
            aspect: "4/5"
            pie: "Despeinados por el viento"
          - id: "c3-e1-3"
            src: "assets/fotos/capitulo-3/e1-3.webp"
            mini: "assets/fotos/capitulo-3/e1-3-s.webp"
            tono: "#36312d"
            aspect: "4/5"
            pie: "Entre palmeras"
          - id: "c3-e1-4"
            src: "assets/fotos/capitulo-3/e1-4.webp"
            mini: "assets/fotos/capitulo-3/e1-4-s.webp"
            tono: "#2b2724"
            aspect: "4/5"
            pie: "Valientes con un cocodrilo"
          - id: "c3-e1-5"
            src: "assets/fotos/capitulo-3/e1-5.webp"
            mini: "assets/fotos/capitulo-3/e1-5-s.webp"
            tono: "#2d2e2f"
            aspect: "4/5"
            pie: "En la lancha"
      - titulo: "El muelle y la *noche*"
        fecha: "2026-07-18"
        lugar: "Noche junto al agua"
        texto: "Un beso en el muelle con el agua quieta detrás. Y cuando cayó la noche, las luces reflejadas en el agua y tu vestido de flores."
        fotos:
          - id: "c3-e2-1"
            src: "assets/fotos/capitulo-3/e2-1.webp"
            mini: "assets/fotos/capitulo-3/e2-1-s.webp"
            tono: "#2e3134"
            aspect: "4/5"
            pie: "Un beso en el muelle"
          - id: "c3-e2-2"
            src: "assets/fotos/capitulo-3/e2-2.webp"
            mini: "assets/fotos/capitulo-3/e2-2-s.webp"
            tono: "#1f1e1b"
            aspect: "4/5"
            pie: "Las luces sobre el agua"
          - id: "c3-e2-3"
            src: "assets/fotos/capitulo-3/e2-3.webp"
            mini: "assets/fotos/capitulo-3/e2-3-s.webp"
            tono: "#221d1b"
            aspect: "4/5"
            pie: "La noche era nuestra"
      - titulo: "Un día *más*"
        fecha: "2026-07-19"
        lugar: "Día 2 · Sol y mar"
        texto: "Muros antiguos pintados de amarillo, sol de tarde y el agua otra vez. La sensación de que podíamos quedarnos ahí para siempre."
        fotos:
          - id: "c3-e3-1"
            src: "assets/fotos/capitulo-3/e3-1.webp"
            mini: "assets/fotos/capitulo-3/e3-1-s.webp"
            tono: "#483e31"
            aspect: "4/5"
            pie: "Entre muros amarillos"
          - id: "c3-e3-2"
            src: "assets/fotos/capitulo-3/e3-2.webp"
            mini: "assets/fotos/capitulo-3/e3-2-s.webp"
            tono: "#32302c"
            aspect: "4/5"
            pie: "Listos para el agua"
          - id: "c3-e3-3"
            src: "assets/fotos/capitulo-3/e3-3.webp"
            mini: "assets/fotos/capitulo-3/e3-3-s.webp"
            tono: "#31353d"
            aspect: "4/5"
            pie: "Mojados y felices"
      - titulo: "El último *día*"
        fecha: "2026-07-20"
        lugar: "Día 3 · Atardecer en la playa"
        texto: "El último día lo quisimos estirar al máximo: el mar en los pies, un beso en la orilla y una tarde dorada de la que no queríamos irnos."
        fotos:
          - id: "c3-e4-1"
            src: "assets/fotos/capitulo-3/e4-1.webp"
            mini: "assets/fotos/capitulo-3/e4-1-s.webp"
            tono: "#2e2826"
            aspect: "4/5"
            pie: "Buenos días, mar"
          - id: "c3-e4-2"
            src: "assets/fotos/capitulo-3/e4-2.webp"
            mini: "assets/fotos/capitulo-3/e4-2-s.webp"
            tono: "#2c2d34"
            aspect: "4/5"
            pie: "El mar a nuestras espaldas"
          - id: "c3-e4-3"
            src: "assets/fotos/capitulo-3/e4-3.webp"
            mini: "assets/fotos/capitulo-3/e4-3-s.webp"
            tono: "#3c3c40"
            aspect: "4/5"
            pie: "Un beso en la orilla"
          - id: "c3-e4-4"
            src: "assets/fotos/capitulo-3/e4-4.webp"
            mini: "assets/fotos/capitulo-3/e4-4-s.webp"
            tono: "#312f2f"
            aspect: "4/5"
            pie: "Sol en la piel"
          - id: "c3-e4-5"
            src: "assets/fotos/capitulo-3/e4-5.webp"
            mini: "assets/fotos/capitulo-3/e4-5-s.webp"
            tono: "#30302c"
            aspect: "4/5"
            pie: "Una tarde dorada"
          - id: "c3-e4-6"
            src: "assets/fotos/capitulo-3/e4-6.webp"
            mini: "assets/fotos/capitulo-3/e4-6-s.webp"
            tono: "#303234"
            aspect: "4/5"
            pie: "Y yo, cargándote"
  - id: "cap-4"
    numero: 4
    romano: "IV"
    archivo: "capitulo-4.html"
    titulo: "Para *siempre*"
    periodo: "24 Jul 2026 — Hoy"
    hitoCapitulo: "El Sí (24 de julio de 2026) · Rumbo al 27 de marzo de 2027"
    resumen: "Una tarde de picnic en vísperas de nuestro cuarto 27, un brindis, un anillo y el camino hacia nuestra boda en nuestro primer aniversario."
    transicion: "fundido"
    tema:
      fondo: "#08070c"
      acento: "#f0abfc"
      acento2: "#fda4af"
      resplandor: "rgba(240,171,252,.14)"
      resplandor2: "rgba(253,164,175,.08)"
      velo: "#0d0912"
    portada:
      id: "c4-portada"
      src: "assets/fotos/capitulo-4/portada.webp"
      mini: "assets/fotos/capitulo-4/portada-s.webp"
      tono: "#3d3d40"
      aspect: "16/10"
      alt: "Los dos sentados en un picnic al atardecer"
      pie: "Los dos sentados en un picnic al atardecer"
    episodios:
      - titulo: "La *pregunta*"
        fecha: "2026-07-24"
        lugar: "Tres días antes de nuestro 4.º mes"
        texto: "Una manta de colores, fruta, dos copas y el cielo de la tarde. Ese día hubo un brindis, un anillo y una respuesta que lo cambió todo."
        fotos:
          - id: "c4-e1-1"
            src: "assets/fotos/capitulo-4/e1-1.webp"
            mini: "assets/fotos/capitulo-4/e1-1-s.webp"
            tono: "#27262c"
            aspect: "4/5"
            pie: "Un brindis"
          - id: "c4-e1-2"
            src: "assets/fotos/capitulo-4/e1-2.webp"
            mini: "assets/fotos/capitulo-4/e1-2-s.webp"
            tono: "#393840"
            aspect: "4/5"
            pie: "La tarde perfecta"
          - id: "c4-e1-3"
            src: "assets/fotos/capitulo-4/e1-3.webp"
            mini: "assets/fotos/capitulo-4/e1-3-s.webp"
            tono: "#383942"
            aspect: "4/5"
            pie: "Con todo el corazón"
          - id: "c4-e1-4"
            src: "assets/fotos/capitulo-4/e1-4.webp"
            mini: "assets/fotos/capitulo-4/e1-4-s.webp"
            tono: "#363842"
            aspect: "4/5"
            pie: "Un beso al atardecer"
      - titulo: "Después del *sí*"
        fecha: "2026-08-21"
        lugar: "Rumbo a nuestro 5.º mes (agosto 2026)"
        texto: "La vida siguió, pero distinta: un café con un corazón dibujado y una tarde entre vitrales y plantas."
        fotos:
          - id: "c4-e2-1"
            src: "assets/fotos/capitulo-4/e2-1.webp"
            mini: "assets/fotos/capitulo-4/e2-1-s.webp"
            tono: "#21211f"
            aspect: "4/5"
            pie: "Un corazón en la taza"
          - id: "c4-e2-2"
            src: "assets/fotos/capitulo-4/e2-2.webp"
            mini: "assets/fotos/capitulo-4/e2-2-s.webp"
            tono: "#2f2f27"
            aspect: "4/5"
            pie: "Entre vitrales y plantas"
          - id: "c4-e2-3"
            src: "assets/fotos/capitulo-4/e2-3.webp"
            mini: "assets/fotos/capitulo-4/e2-3-s.webp"
            tono: "#333230"
            aspect: "4/5"
            pie: "Bajo los colores del vitral"
      - titulo: "Hoy y cada *27*"
        fecha: "2026-09-15"
        lugar: "Rumbo al 27 de marzo de 2027"
        texto: "Todo lo anterior nos trajo a este momento. Seguimos celebrando cada 27 de mes mientras se acerca el 27 de marzo de 2027."
        fotos:
          - id: "c4-e3-1"
            src: "assets/fotos/capitulo-4/e3-1.webp"
            mini: "assets/fotos/capitulo-4/e3-1-s.webp"
            tono: "#251f1f"
            aspect: "4/5"
            pie: "Una noche de septiembre"
final:
  archivo: "final.html"
  corto: "Álbum"
  ceja: "El Mural · Nuestro Álbum"
  titulo: "Nuestro *álbum*"
  entrada: "Todas las fotografías de esta historia reunidas en una sola pared. Toca cualquiera para verla de cerca."
  transicion: "iris"
  centroPie: "14 de marzo · La imagen completa"
  marcos:
    - "papel"
    - "negro"
    - "papel"
    - "madera"
    - "papel"
  pines:
    epilogo: "#f4f0ec"
    cap-1: "#f43f5e"
    cap-2: "#f59e0b"
    cap-3: "#2dd4bf"
    cap-4: "#f0abfc"
  inclinacion: 5
  despedida:
    titulo: "Fin. *Por ahora.*"
    texto: "Nos conocimos un 14 de marzo de 2026, nos hicimos novios un 27 de marzo de 2026 y nuestro próximo gran capítulo ya tiene fecha."
`;

  function aplicarTema(tema) {
    if (!tema || typeof document === 'undefined') return;
    const r = document.documentElement.style;
    if (tema.fondo) r.setProperty('--fondo', tema.fondo);
    if (tema.acento) r.setProperty('--acento', tema.acento);
    if (tema.acento2) r.setProperty('--acento-2', tema.acento2);
    if (tema.resplandor) r.setProperty('--resplandor', tema.resplandor);
    if (tema.resplandor2) r.setProperty('--resplandor-2', tema.resplandor2);
    if (tema.velo) r.setProperty('--velo', tema.velo);
  }

  function inicializarGlobales(H) {
    root.HISTORIA = H;
    const caps = H.capitulos || [];
    const mapCaps = {};
    caps.forEach(c => {
      mapCaps[c.id] = c;
    });
    root.CAPITULOS = mapCaps;

    /* Resolver PAGINA_ID dinámica si se usa capitulo.html?id=cap-N */
    if (typeof window !== 'undefined' && (!window.PAGINA_ID || window.PAGINA_ID === 'cap-dinamico')) {
      const q = new URLSearchParams(window.location.search).get('id');
      if (q && mapCaps[q]) window.PAGINA_ID = q;
      else if (window.PAGINA_ID === 'cap-dinamico' && caps[0]) window.PAGINA_ID = caps[0].id;
    }

    const ep = H.epilogo || {};
    root.EPILOGO = ep;

    const fin = H.final || {};
    root.FINAL = {
      transicion: fin.transicion || 'iris',
      ceja: fin.ceja || 'El final',
      titulo: fin.titulo || 'Nuestro *álbum*',
      entrada: fin.entrada || '',
      centro: { pie: fin.centroPie || 'La imagen completa' },
      marcos: fin.marcos || ['papel', 'negro', 'papel', 'madera', 'papel'],
      pines: fin.pines || {},
      inclinacion: fin.inclinacion ?? 5,
      despedida: fin.despedida || { titulo: 'Fin. *Por ahora.*', texto: '' }
    };

    /* Construir índice de páginas de navegación (Inicio 2.0 -> Origen 3D -> Capítulos I..N -> Álbum) */
    const paginas = [
      { id: 'inicio', archivo: 'index.html', corto: '✦ Inicio', titulo: 'Portada Flotante' },
      {
        id: 'epilogo',
        archivo: ep.archivo || 'epilogo.html',
        corto: ep.corto || 'Origen 3D',
        titulo: 'El Origen · Rompecabezas 3D',
        ceja: 'Siguiente · El Origen en 3D',
        resumen: ep.entrada || '',
        portada: ep.maestra
      },
      ...caps.map(c => ({
        id: c.id,
        archivo: c.archivo || `capitulo.html?id=${encodeURIComponent(c.id)}`,
        corto: c.romano || String(c.numero),
        romano: true,
        titulo: `Capítulo ${c.romano || c.numero}`,
        ceja: `Siguiente · Capítulo ${c.romano || c.numero}`,
        resumen: c.resumen || '',
        portada: c.portada
      })),
      {
        id: 'final',
        archivo: fin.archivo || 'final.html',
        corto: fin.corto || 'Álbum',
        titulo: 'El Mural · Nuestro Álbum',
        ceja: 'Siguiente · El Mural completo',
        resumen: fin.entrada || 'Todas las fotos de esta historia, en una sola pared.',
        portada: ep.maestra
      }
    ];

    root.SITIO = {
      version: H.version || '2.0',
      marca: H.marca || 'Unibody',
      subtituloMarca: H.subtituloMarca || '',
      pareja: H.pareja || { el: 'Mí', ella: 'Ti' },
      primerEncuentro: (H.fechas && H.fechas.conocernos) || '2026-03-14T16:00:00',
      fechaNovios: (H.fechas && H.fechas.novios) || '2026-03-27T20:00:00',
      diaAniversarioMensual: Number((H.fechas && H.fechas.diaAniversarioMensual) || 27),
      boda: (H.fechas && H.fechas.boda) || '2027-03-27T17:00:00',
      fechas: H.fechas || {},
      hitos: H.hitos || [],
      paginas
    };

    /* Aplicar el tema correspondiente a la página actual */
    const pid = root.PAGINA_ID;
    if (pid === 'epilogo' && ep.tema) aplicarTema(ep.tema);
    else if (pid && mapCaps[pid] && mapCaps[pid].tema) aplicarTema(mapCaps[pid].tema);
  }

  /* ========================================================================
     Motor de Fechas y Contadores Automáticos (window.RelojAmor)
     - Conocernos: 14 de marzo de 2026
     - Oficialmente novios: 27 de marzo de 2026
     - Aniversario mensual: Día 27 de cada mes
     - Boda tentativa: 27 de marzo de 2027 (1 año de novios)
     ======================================================================== */
  const NOMBRES_MES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  function desglosarMs(ms) {
    const pos = Math.max(0, ms);
    return {
      totalMs: pos,
      dias: Math.floor(pos / 86400000),
      horas: Math.floor((pos % 86400000) / 3600000),
      minutos: Math.floor((pos % 3600000) / 60000),
      segundos: Math.floor((pos % 60000) / 1000)
    };
  }

  function calcularEstadoFechas(ahoraDate) {
    const ahora = ahoraDate || new Date();
    const F = (root.HISTORIA && root.HISTORIA.fechas) || {};
    const dtConocernos = new Date(F.conocernos || '2026-03-14T16:00:00');
    const dtNovios = new Date(F.novios || '2026-03-27T20:00:00');
    const dtBoda = new Date(F.boda || '2027-03-27T17:00:00');
    const diaMes = Number(F.diaAniversarioMensual || 27);

    /* 1. Tiempo desde que nos conocimos (14 Mar 2026) */
    const desdeConocernos = desglosarMs(ahora.getTime() - dtConocernos.getTime());

    /* 2. Tiempo desde que nos hicimos novios (27 Mar 2026) y meses cumplidos */
    const desdeNovios = desglosarMs(ahora.getTime() - dtNovios.getTime());

    let mesesCumplidos =
      (ahora.getFullYear() - dtNovios.getFullYear()) * 12 +
      (ahora.getMonth() - dtNovios.getMonth());
    if (ahora.getDate() < diaMes) {
      mesesCumplidos--;
    }
    mesesCumplidos = Math.max(0, mesesCumplidos);

    const esHoyVeintisiete = ahora.getDate() === diaMes && ahora >= dtNovios;

    /* Próximo 27 del mes */
    let proxAnio = ahora.getFullYear();
    let proxMes = ahora.getMonth();
    if (ahora.getDate() >= diaMes) {
      proxMes++;
      if (proxMes > 11) {
        proxMes = 0;
        proxAnio++;
      }
    }
    const proximo27 = new Date(proxAnio, proxMes, diaMes, 0, 0, 0);
    const faltaProximo27 = desglosarMs(proximo27.getTime() - ahora.getTime());
    const numeroProximoMes = mesesCumplidos + 1;
    const etiquetaProximo27 = `${diaMes} de ${NOMBRES_MES[proxMes]} de ${proxAnio}`;

    /* 3. Cuenta regresiva hacia la boda (27 Mar 2027 · 1 año de novios) */
    const faltaBoda = desglosarMs(dtBoda.getTime() - ahora.getTime());
    const totalAnioNovios = Math.max(1, dtBoda.getTime() - dtNovios.getTime());
    const progresoBoda = Math.min(100, Math.max(0, ((ahora.getTime() - dtNovios.getTime()) / totalAnioNovios) * 100));

    return {
      conocernos: {
        fecha: dtConocernos,
        etiqueta: F.conocernosEtiqueta || '14 de marzo de 2026',
        ...desdeConocernos
      },
      novios: {
        fecha: dtNovios,
        etiqueta: F.noviosEtiqueta || '27 de marzo de 2026',
        diaAniversarioMensual: diaMes,
        mesesCumplidos,
        esHoyAniversario: esHoyVeintisiete,
        proximoMesNumero: numeroProximoMes,
        proximoFechaEtiqueta: etiquetaProximo27,
        faltaProximo27,
        ...desdeNovios
      },
      boda: {
        fecha: dtBoda,
        etiqueta: F.bodaEtiqueta || '27 de marzo de 2027',
        progresoPorcentaje: progresoBoda,
        ...faltaBoda
      }
    };
  }

  /* Inicializar de inmediato con el respaldo sincronizado para que los scripts síncronos funcionen al instante */
  const datosIniciales = parseYaml(FALLBACK_YAML);
  inicializarGlobales(datosIniciales);

  /* Si estamos en servidor HTTP/HTTPS, sincronizar en vivo desde `historia.yaml` */
  let promesaCarga = Promise.resolve(root.HISTORIA);
  if (typeof window !== 'undefined' && /^https?:$/i.test(window.location.protocol)) {
    promesaCarga = fetch('historia.yaml', { cache: 'no-store' })
      .then(r => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status))))
      .then(txt => {
        const parsed = parseYaml(txt);
        if (parsed && parsed.capitulos && parsed.capitulos.length) {
          inicializarGlobales(parsed);
          window.dispatchEvent(new CustomEvent('historia:actualizada', { detail: parsed }));
        }
        return root.HISTORIA;
      })
      .catch(() => root.HISTORIA);
  }

  function reinicializar(nuevaHistoria) {
    if (!nuevaHistoria) return root.HISTORIA;
    inicializarGlobales(nuevaHistoria);
    if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('historia:actualizada', { detail: nuevaHistoria }));
    }
    return root.HISTORIA;
  }

  root.DatosAmor = {
    parseYaml,
    ready: () => promesaCarga,
    calcularEstadoFechas,
    reinicializar
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseYaml, calcularEstadoFechas };
  }
})();
