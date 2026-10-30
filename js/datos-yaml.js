/* ==========================================================================
   js/datos-yaml.js · Cargador Maestro de historia.yaml + Motor de Fechas
   --------------------------------------------------------------------------
   - Lee y parsea `historia.yaml` en tiempo real cuando se sirve por HTTP/HTTPS
     (con respaldo a `historia.example.yaml` y plantilla interna `fecha-date`).
   - Pobla window.HISTORIA, window.SITIO, window.EPILOGO, window.CAPITULOS,
     window.FINAL y aplica los colores del tema de cada capítulo.
   - Calcula automáticamente desde `historia.yaml`:
     1) Tiempo desde que se conocieron (`fechas.conocernos`)
     2) Tiempo de novios (`fechas.novios`) + próximo aniversario mensual (`fechas.diaAniversarioMensual`)
     3) Cuenta regresiva a la boda (`fechas.boda`)
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

  /* ---------- Plantilla genérica con marcadores fecha-date (sin fechas reales en el código) ---------- */
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
  conocernos: "fecha-date"
  conocernosEtiqueta: "fecha-date · El día que nos conocimos"
  novios: "fecha-date"
  noviosEtiqueta: "fecha-date · Oficialmente novios"
  diaAniversarioMensual: 1
  aniversarioMensualNota: "Cada mes celebramos un mes más siendo novios"
  boda: "fecha-date"
  bodaEtiqueta: "fecha-date · Nuestra Boda (Aniversario)"
hitos:
  - fecha: "fecha-date"
    titulo: "El primer encuentro"
    detalle: "fecha-date · El día en que nuestros caminos se cruzaron por primera vez."
    capitulo: "epilogo"
  - fecha: "fecha-date"
    titulo: "Oficialmente novios"
    detalle: "fecha-date · El inicio de nuestra tradición de celebrar cada mes."
    capitulo: "cap-1"
  - fecha: "fecha-date"
    titulo: "Aniversario mensual"
    detalle: "fecha-date · Un aniversario guardado desde la mañana hasta la noche."
    capitulo: "cap-1"
  - fecha: "fecha-date"
    titulo: "Tarde de aventura"
    detalle: "fecha-date · Cafés, espejos, risas espontáneas y flores en el pelo."
    capitulo: "cap-2"
  - fecha: "fecha-date"
    titulo: "Nuestro viaje al mar"
    detalle: "fecha-date · Días de olas, lancha, muelle y atardeceres dorados."
    capitulo: "cap-3"
  - fecha: "fecha-date"
    titulo: "La pregunta y el Sí"
    detalle: "fecha-date · Un picnic al atardecer, dos copas, un anillo y un para siempre."
    capitulo: "cap-4"
  - fecha: "fecha-date"
    titulo: "Nuestra Boda"
    detalle: "fecha-date · Un año después de hacernos novios."
    capitulo: "final"
portadaPrincipal:
  ceja: "Nuestra historia en movimiento · fecha-date — fecha-date"
  tituloPalabras:
    - "Mira"
    - "todo"
    - "lo"
    - "que"
    - "hemos"
    - "*vivido*"
  subtitulo: "De mí para ti · Nos conocimos en fecha-date, nos hicimos novios en fecha-date y cada recuerdo flota en nuestro propio universo. Toca cualquier fotografía o entra a cada capítulo para vivir la historia."
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
  ceja: "El Origen · fecha-date"
  titulo: "Dos caminos.<br>Una sola *historia*."
  entrada: "En fecha-date nos conocimos y en fecha-date comenzó oficialmente nuestra historia. Desliza para unir cada pieza hasta formar la imagen completa."
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
    pie: "Nuestra primera foto juntos · fecha-date"
  fragmentos:
    - texto: "Hubo un día en que dos caminos se cruzaron."
      nota: "fecha-date · El día que nos conocimos"
    - texto: "Después empezó oficialmente *lo nuestro*."
      nota: "fecha-date · Nuestro primer día como novios"
    - texto: "Después vinieron los cafés, los espejos y cada *aniversario mensual*."
      nota: "fecha-date · Celebrando cada mes juntos"
    - texto: "Luego el *mar* y una tarde con una pregunta."
      nota: "fecha-date · Las olas y el sí al atardecer"
    - texto: "Y hoy, rumbo a nuestra *boda*, todo encaja."
      nota: "fecha-date · El día de nuestra boda"
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
    periodo: "fecha-date — fecha-date"
    hitoCapitulo: "Nos conocimos en fecha-date · Novios desde fecha-date"
    resumen: "Desde el día en que nos conocimos hasta hacernos novios, nuestras primeras salidas y nuestros primeros aniversarios mensuales."
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
      alt: "Selfie de los dos, muy cerca"
      pie: "Una mañana juntos, muy cerca"
    episodios:
      - titulo: "Las primeras fotos"
        fecha: "fecha-date"
        lugar: "Primeras salidas"
        texto: "Después de conocernos y hacernos novios, cada paseo empezó a convertirse en recuerdo: la montaña detrás, una tienda cualquiera, una luz morada. Así empezó este álbum."
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
            pie: "Abrazados, celebrando nuestro primer mes"
      - titulo: "Días juntos"
        fecha: "fecha-date"
        lugar: "fecha-date"
        texto: "Mañanas sin prisa, caras chistosas frente a la cámara y la costumbre, cada vez más nuestra, de tomarnos una foto más."
        fotos:
          - id: "c1-e2-1"
            src: "assets/fotos/capitulo-1/e2-1.webp"
            mini: "assets/fotos/capitulo-1/e2-1-s.webp"
            tono: "#2a2420"
            aspect: "4/5"
            pie: "Una mañana juntos"
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
      - titulo: "Nuestro *aniversario*"
        fecha: "fecha-date"
        lugar: "Nuestro aniversario mensual"
        texto: "Cumplíamos un mes más de novios y ese día quedó guardado de principio a fin: la primera foto de la mañana, el espejo por la tarde, la carretera al atardecer y, en la noche, un pastel con velas."
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
            pie: "Pastel y velas por nuestro aniversario"
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
    periodo: "fecha-date — fecha-date"
    hitoCapitulo: "Rumbo a nuestro aniversario mensual (fecha-date)"
    resumen: "Los días normales que, vistos juntos, resultaron ser los mejores: tardes de café, aventuras espontáneas y un mes más juntos."
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
        fecha: "fecha-date"
        lugar: "Tardes de café"
        texto: "Una bebida en la mesa, el espejo de siempre y nosotros intentando salir bien en la foto. Casi nunca a la primera."
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
        fecha: "fecha-date"
        lugar: "fecha-date"
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
            pie: "Una noche especial"
      - titulo: "Tarde de *aventura*"
        fecha: "fecha-date"
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
        fecha: "fecha-date"
        lugar: "Nuestro aniversario mensual"
        texto: "Tardes cerca, muy cerca, celebrando un mes más de novios. Y un día sobre el pasto en el que terminé con flores en el pelo."
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
    periodo: "fecha-date — fecha-date"
    hitoCapitulo: "Nuestra escapada al mar"
    resumen: "Días con sal, sol, olas y la certeza de que cualquier lugar se siente como casa cuando estamos juntos."
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
        fecha: "fecha-date"
        lugar: "Día 1 · Frente a las olas"
        texto: "El primer vistazo a las olas, el viento despeinándonos, un paseo en lancha y una aventura inolvidable."
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
            pie: "Aventura en la costa"
          - id: "c3-e1-5"
            src: "assets/fotos/capitulo-3/e1-5.webp"
            mini: "assets/fotos/capitulo-3/e1-5-s.webp"
            tono: "#2d2e2f"
            aspect: "4/5"
            pie: "En la lancha"
      - titulo: "El muelle y la *noche*"
        fecha: "fecha-date"
        lugar: "Noche junto al agua"
        texto: "Un beso en el muelle con el agua quieta detrás. Y cuando cayó la noche, las luces reflejadas en el agua."
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
        fecha: "fecha-date"
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
        fecha: "fecha-date"
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
    periodo: "fecha-date — Hoy"
    hitoCapitulo: "El Sí (fecha-date) · Rumbo a fecha-date"
    resumen: "Una tarde de picnic, un brindis, un anillo y el camino hacia nuestra boda."
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
        fecha: "fecha-date"
        lugar: "Tarde al atardecer"
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
        fecha: "fecha-date"
        lugar: "Rumbo a nuestro aniversario"
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
      - titulo: "Hoy y *siempre*"
        fecha: "fecha-date"
        lugar: "Rumbo a nuestra boda"
        texto: "Todo lo anterior nos trajo a este momento. Seguimos celebrando cada mes mientras se acerca nuestra boda."
        fotos:
          - id: "c4-e3-1"
            src: "assets/fotos/capitulo-4/e3-1.webp"
            mini: "assets/fotos/capitulo-4/e3-1-s.webp"
            tono: "#251f1f"
            aspect: "4/5"
            pie: "Una noche especial"
final:
  archivo: "final.html"
  corto: "Álbum"
  ceja: "El Mural · Nuestro Álbum"
  titulo: "Nuestro *álbum*"
  entrada: "Todas las fotografías de esta historia reunidas en una sola pared. Toca cualquiera para verla de cerca."
  transicion: "iris"
  centroPie: "fecha-date · La imagen completa"
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
    texto: "Nos conocimos en fecha-date, nos hicimos novios en fecha-date y nuestro próximo gran capítulo ya tiene fecha."
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
    caps.forEach((c, idx) => {
      const numRomano = c.romano || String(c.numero || idx + 1);
      const primeraPalabra = String(c.titulo || '').replace(/\*/g, '').split(/\s+/).slice(0, 2).join(' ');
      c.corto = c.corto || `${numRomano} · ${primeraPalabra}`;
      c.hitoRelacion = c.hitoRelacion || c.hitoCapitulo || '';
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
      primerEncuentro: (H.fechas && H.fechas.conocernos) || 'fecha-date',
      fechaNovios: (H.fechas && H.fechas.novios) || 'fecha-date',
      diaAniversarioMensual: Number((H.fechas && H.fechas.diaAniversarioMensual) || 1),
      boda: (H.fechas && H.fechas.boda) || 'fecha-date',
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
     Motor de Fechas y Contadores Automáticos (configurados en historia.yaml)
     ======================================================================== */
  const NOMBRES_MES = [
    'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
    'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'
  ];

  function desglosarMs(ms) {
    const val = Number.isFinite(ms) ? Math.max(0, ms) : 0;
    return {
      totalMs: val,
      dias: Math.floor(val / 86400000),
      horas: Math.floor((val % 86400000) / 3600000),
      minutos: Math.floor((val % 3600000) / 60000),
      segundos: Math.floor((val % 60000) / 1000)
    };
  }

  function parseFechaSegura(valor, fallbackDate) {
    if (!valor || valor === 'fecha-date') return fallbackDate;
    const d = new Date(valor);
    return Number.isNaN(d.getTime()) ? fallbackDate : d;
  }

  function calcularEstadoFechas(ahoraDate) {
    const ahora = ahoraDate || new Date();
    const F = (root.HISTORIA && root.HISTORIA.fechas) || {};
    const dtConocernos = parseFechaSegura(F.conocernos, ahora);
    const dtNovios = parseFechaSegura(F.novios, ahora);
    const dtBoda = parseFechaSegura(F.boda, new Date(ahora.getTime() + 86400000 * 365));
    const diaMes = Number(F.diaAniversarioMensual || dtNovios.getDate() || 1);

    /* 1. Tiempo desde que nos conocimos */
    const desdeConocernos = desglosarMs(ahora.getTime() - dtConocernos.getTime());

    /* 2. Tiempo desde que nos hicimos novios y meses cumplidos */
    const desdeNovios = desglosarMs(ahora.getTime() - dtNovios.getTime());

    let mesesCumplidos =
      (ahora.getFullYear() - dtNovios.getFullYear()) * 12 +
      (ahora.getMonth() - dtNovios.getMonth());
    if (ahora.getDate() < diaMes) {
      mesesCumplidos--;
    }
    mesesCumplidos = Math.max(0, mesesCumplidos);

    const esHoyAniversario = ahora.getDate() === diaMes && ahora >= dtNovios;

    /* Próximo aniversario mensual */
    let proxAnio = ahora.getFullYear();
    let proxMes = ahora.getMonth();
    if (ahora.getDate() >= diaMes) {
      proxMes++;
      if (proxMes > 11) {
        proxMes = 0;
        proxAnio++;
      }
    }
    const proximoAniversario = new Date(proxAnio, proxMes, diaMes, 0, 0, 0);
    const faltaProximo27 = desglosarMs(proximoAniversario.getTime() - ahora.getTime());
    const numeroProximoMes = mesesCumplidos + 1;
    const etiquetaProximo27 = `${diaMes} de ${NOMBRES_MES[proxMes]} de ${proxAnio}`;

    /* 3. Cuenta regresiva hacia la boda */
    const faltaBoda = desglosarMs(dtBoda.getTime() - ahora.getTime());
    const totalAnioNovios = Math.max(1, dtBoda.getTime() - dtNovios.getTime());
    const progresoBoda = Math.min(100, Math.max(0, ((ahora.getTime() - dtNovios.getTime()) / totalAnioNovios) * 100));

    return {
      conocernos: {
        fecha: dtConocernos,
        etiqueta: F.conocernosEtiqueta || 'fecha-date',
        ...desdeConocernos
      },
      novios: {
        fecha: dtNovios,
        etiqueta: F.noviosEtiqueta || 'fecha-date',
        diaAniversarioMensual: diaMes,
        mesesCumplidos,
        esHoyAniversario,
        proximoMesNumero: numeroProximoMes,
        proximoFechaEtiqueta: etiquetaProximo27,
        faltaProximo27,
        ...desdeNovios
      },
      boda: {
        fecha: dtBoda,
        etiqueta: F.bodaEtiqueta || 'fecha-date',
        progresoPorcentaje: progresoBoda,
        ...faltaBoda
      }
    };
  }

  /* Inicializar de inmediato con el respaldo genérico para que los scripts síncronos funcionen al instante */
  const datosIniciales = parseYaml(FALLBACK_YAML);
  inicializarGlobales(datosIniciales);

  /* Si estamos en servidor HTTP/HTTPS, sincronizar en vivo desde `historia.yaml` (local) o `historia.example.yaml` */
  let promesaCarga = Promise.resolve(root.HISTORIA);
  if (typeof window !== 'undefined' && /^https?:$/i.test(window.location.protocol)) {
    promesaCarga = fetch('historia.yaml', { cache: 'no-store' })
      .then(r => (r.ok ? r.text() : fetch('historia.example.yaml', { cache: 'no-store' }).then(r2 => (r2.ok ? r2.text() : Promise.reject(new Error('HTTP ' + r2.status))))))
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
