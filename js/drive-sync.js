/* ==========================================================================
   js/drive-sync.js · Conector Dinámico con Google Drive API v3
   --------------------------------------------------------------------------
   Permite alojar las fotografías en Google Drive y servirlas vía API al
   Frontend (alojado en Google AI Studio / Cloud Run / servidor web).

   Características:
   1. Lee variables de entorno desde `.env` (`GOOGLE_CLIENT_ID`, `GOOGLE_PROJECT_ID`,
      `GOOGLE_CLIENT_SECRET`, `GOOGLE_DRIVE_API_KEY`, `GOOGLE_DRIVE_FOLDER_URL`),
      `historia.yaml` o `localStorage`.
   2. Soporta dos métodos de autenticación con Google Drive API v3:
      - OAuth 2.0 (`GOOGLE_CLIENT_ID` del JSON de credenciales web) mediante
        Google Identity Services (`Bearer` token, funciona con carpetas privadas o compartidas).
      - API Key (`GOOGLE_DRIVE_API_KEY`) para lectura pública directa sin login.
   3. Soporta una sola `carpetaRaizId` (con subcarpetas `epilogo`, `capitulo-1`..`capitulo-N`)
      o IDs individuales en `carpetasPorCapitulo`.
   4. Si creas una carpeta `capitulo-5 - Título` en Drive, crea automáticamente
      el Capítulo V en toda la web (barra, portada 2.0, capítulo 1.0 y mural).
   5. Extrae automáticamente de cada foto en Drive:
      - Fecha de captura EXIF (`imageMediaMetadata.time`) -> calcula día de novios
      - Descripción de Drive o nombre del archivo -> pie de foto (`pie`)
      - Dimensiones reales -> relación de aspecto (`aspect`)
      - Miniatura `540w` + Alta resolución `1600w` + Respaldo binario `alt=media`
   ========================================================================== */
(function () {
  'use strict';
  if (typeof window !== 'undefined' && window.DriveAmor) return;

  const STORAGE_CFG_KEY = 'unibody_drive_config_v1';
  const STORAGE_CACHE_KEY = 'unibody_drive_cache_v1';
  const STORAGE_TOKEN_KEY = 'unibody_drive_oauth_token_v1';
  const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.readonly';

  const PALETAS_DINAMICAS = [
    { fondo: '#08070c', acento: '#f43f5e', acento2: '#f59e0b', resplandor: 'rgba(244, 63, 94, 0.25)', resplandor2: 'rgba(245, 158, 11, 0.18)', velo: 'rgba(244, 63, 94, 0.08)' },
    { fondo: '#070a0f', acento: '#38bdf8', acento2: '#a855f7', resplandor: 'rgba(56, 189, 248, 0.25)', resplandor2: 'rgba(168, 85, 247, 0.18)', velo: 'rgba(56, 189, 248, 0.08)' },
    { fondo: '#080a07', acento: '#34d399', acento2: '#fbbf24', resplandor: 'rgba(52, 211, 153, 0.24)', resplandor2: 'rgba(251, 191, 36, 0.18)', velo: 'rgba(52, 211, 153, 0.08)' },
    { fondo: '#0a070b', acento: '#f0abfc', acento2: '#fb7185', resplandor: 'rgba(240, 171, 252, 0.25)', resplandor2: 'rgba(251, 113, 133, 0.18)', velo: 'rgba(240, 171, 252, 0.08)' }
  ];

  const TONOS_RESPALDO = ['#1e1620', '#18222d', '#241c18', '#172320', '#231926', '#211f1c'];

  /* ---------- Utilidades ---------- */
  function aRomano(n) {
    let num = Number(n) || 1;
    const mapa = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, r] of mapa) while (num >= v) { s += r; num -= v; }
    return s;
  }

  /* Acepta un ID puro o un enlace completo de Google Drive y devuelve el ID */
  function extraerDriveId(input) {
    const s = String(input || '').trim();
    if (!s) return '';
    const matchFolder = s.match(/\/folders\/([a-zA-Z0-9_-]{10,})/);
    if (matchFolder) return matchFolder[1];
    const matchFile = s.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (matchFile) return matchFile[1];
    const matchIdParam = s.match(/[?&]id=([a-zA-Z0-9_-]{10,})/);
    if (matchIdParam) return matchIdParam[1];
    if (/^[a-zA-Z0-9_-]{10,}$/.test(s)) return s;
    return '';
  }

  /* Convierte fecha EXIF "2026:05:27 14:22:10" o ISO a "2026-05-27" */
  function normalizarFechaDrive(metaTime, createdTime) {
    if (metaTime) {
      const m = String(metaTime).match(/^(\d{4})[:\-](\d{2})[:\-](\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
    if (createdTime) {
      const m = String(createdTime).match(/^(\d{4})-(\d{2})-(\d{2})/);
      if (m) return `${m[1]}-${m[2]}-${m[3]}`;
    }
    return '';
  }

  /* Limpia el nombre de archivo para usarlo como pie de foto si no es un código de cámara */
  function limpiarNombreArchivo(name, fallbackPie) {
    const sinExt = String(name || '').replace(/\.[a-zA-Z0-9]+$/, '').trim();
    if (!sinExt) return fallbackPie || 'Recuerdo';
    if (/^(IMG|DSC|PXL|DCIM|Screenshot|WhatsApp|Photo|Signal|VID|MVIMG|e\d+-\d+|portada|maestra)[_\-\s\d]*$/i.test(sinExt)) {
      return fallbackPie || 'Un momento juntos';
    }
    const limpio = sinExt.replace(/^\d+[\s._\-]+/, '').replace(/[_]+/g, ' ').trim();
    return limpio || fallbackPie || 'Un momento juntos';
  }

  function calcularAspecto(meta) {
    if (!meta || !meta.width || !meta.height) return '4/5';
    const r = meta.width / meta.height;
    if (r > 1.45) return '16/10';
    if (r > 1.15) return '4/3';
    if (r > 0.92) return '1/1';
    if (r < 0.65) return '9/16';
    return '4/5';
  }

  /* ---------- Gestión de Token OAuth 2.0 (Google Identity Services) ---------- */
  function obtenerTokenOAuthValido() {
    try {
      const raw = sessionStorage.getItem(STORAGE_TOKEN_KEY);
      if (!raw) return '';
      const parsed = JSON.parse(raw);
      if (parsed && parsed.accessToken && parsed.expiresAt > Date.now() + 15000) {
        return parsed.accessToken;
      }
    } catch (_) {}
    return '';
  }

  function guardarTokenOAuth(accessToken, expiresInSec) {
    try {
      const ttl = (Number(expiresInSec) || 3500) * 1000;
      sessionStorage.setItem(STORAGE_TOKEN_KEY, JSON.stringify({
        accessToken,
        expiresAt: Date.now() + ttl
      }));
    } catch (_) {}
  }

  function cargarScriptGsi() {
    return new Promise((resolve, reject) => {
      if (typeof window !== 'undefined' && window.google && window.google.accounts && window.google.accounts.oauth2) {
        resolve();
        return;
      }
      const existente = document.querySelector('script[data-gsi-client]');
      if (existente) {
        existente.addEventListener('load', () => resolve(), { once: true });
        existente.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services')), { once: true });
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true;
      s.defer = true;
      s.dataset.gsiClient = '1';
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('No se pudo cargar Google Identity Services'));
      document.head.appendChild(s);
    });
  }

  async function solicitarTokenOAuthInteractivo(clientIdOverride) {
    const cfg = obtenerConfiguracionActiva();
    const clientId = (clientIdOverride || cfg.clientId || '').trim();
    if (!clientId) {
      throw new Error('Falta GOOGLE_CLIENT_ID en .env o en la configuración.');
    }
    await cargarScriptGsi();
    return new Promise((resolve, reject) => {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: DRIVE_SCOPE,
        callback: (resp) => {
          if (resp && resp.error) {
            reject(new Error(resp.error_description || resp.error));
            return;
          }
          if (resp && resp.access_token) {
            guardarTokenOAuth(resp.access_token, resp.expires_in);
            resolve(resp.access_token);
          } else {
            reject(new Error('No se recibió access_token de Google OAuth.'));
          }
        }
      });
      tokenClient.requestAccessToken({ prompt: 'consent' });
    });
  }

  /* Construye el objeto de foto compatible con Unibody y Gemini 2.0 */
  function construirFotoDrive(file, cfg, idx, contextoPie) {
    const id = `drive-${file.id}`;
    const meta = file.imageMediaMetadata || {};
    const fechaIso = normalizarFechaDrive(meta.time, file.createdTime);
    const pie = (file.description && file.description.trim())
      ? file.description.trim()
      : limpiarNombreArchivo(file.name, contextoPie);

    /* URLs de alta velocidad de Google Drive + respaldo directo de API */
    const lh3Base = `https://lh3.googleusercontent.com/d/${file.id}`;
    const thumbBase = file.thumbnailLink
      ? file.thumbnailLink.replace(/=s\d+.*$/, '')
      : lh3Base;

    const miniUrl = `${thumbBase}=s540`;
    const fullUrl = `${thumbBase}=s1600`;
    const apiKeyParam = cfg && cfg.apiKey ? `&key=${encodeURIComponent(cfg.apiKey)}` : '';
    const mediaApiUrl = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media${apiKeyParam}`;

    return {
      id,
      driveFileId: file.id,
      nombreArchivo: file.name || '',
      src: fullUrl,
      mini: miniUrl,
      fallbackSrc: mediaApiUrl,
      tono: TONOS_RESPALDO[idx % TONOS_RESPALDO.length],
      aspect: calcularAspecto(meta),
      pie,
      fecha: fechaIso
    };
  }

  /* ---------- Respaldo automático en caso de error de carga de imagen Drive ---------- */
  if (typeof window !== 'undefined') {
    window.addEventListener('error', e => {
      const img = e.target;
      if (!img || img.tagName !== 'IMG') return;
      const srcActual = img.getAttribute('src') || '';
      const cfg = obtenerConfiguracionActiva();
      if (!cfg.apiKey) return;
      const m = srcActual.match(/googleusercontent\.com\/d\/([a-zA-Z0-9_-]+)/);
      if (m && !img.dataset.driveFallbackTried) {
        img.dataset.driveFallbackTried = '1';
        img.removeAttribute('srcset');
        img.src = `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(m[1])}?alt=media&key=${encodeURIComponent(cfg.apiKey)}`;
      }
    }, true);
  }

  /* ---------- Llamadas a Google Drive API v3 (API Key o Bearer Token OAuth 2.0) ---------- */
  async function listarArchivosCarpeta(folderId, cfg) {
    const cleanId = extraerDriveId(folderId);
    if (!cleanId) return [];
    const accessToken = (cfg && cfg.accessToken) || obtenerTokenOAuthValido();
    const apiKey = (cfg && cfg.apiKey) || '';
    if (!accessToken && !apiKey) return [];

    const q = encodeURIComponent(`'${cleanId}' in parents and trashed = false`);
    const fields = encodeURIComponent('files(id,name,mimeType,description,createdTime,imageMediaMetadata(time,width,height),thumbnailLink)');
    const keyQuery = (!accessToken && apiKey) ? `&key=${encodeURIComponent(apiKey)}` : '';
    const url = `https://www.googleapis.com/drive/v3/files?q=${q}&fields=${fields}&orderBy=name,createdTime&pageSize=200&supportsAllDrives=true&includeItemsFromAllDrives=true${keyQuery}`;

    const fetchOpts = {};
    if (accessToken) {
      fetchOpts.headers = { Authorization: `Bearer ${accessToken}` };
    }

    const res = await fetch(url, fetchOpts);
    if (!res.ok) {
      let msg = `HTTP ${res.status}`;
      try {
        const errJson = await res.json();
        if (errJson && errJson.error && errJson.error.message) msg = errJson.error.message;
      } catch (_) {}
      throw new Error(msg);
    }
    const data = await res.json();
    return data.files || [];
  }

  function esCarpeta(file) {
    return file && file.mimeType === 'application/vnd.google-apps.folder';
  }

  function esImagen(file) {
    return file && /^image\/(jpeg|png|webp|gif|heic|heif|avif|bmp)$/i.test(file.mimeType || '');
  }

  /* Lee una carpeta de capítulo en Drive (puede contener fotos sueltas y/o subcarpetas de episodios) */
  async function leerCarpetaCapituloDrive(folderId, cfg, tituloCapitulo) {
    const items = await listarArchivosCarpeta(folderId, cfg);
    const subcarpetas = items.filter(esCarpeta);
    const imagenesDirectas = items.filter(esImagen);

    let fotoPortada = null;
    const fotosSueltas = [];

    imagenesDirectas.forEach((f, idx) => {
      const fotoObj = construirFotoDrive(f, cfg, idx, tituloCapitulo);
      if (!fotoPortada && /^(00[-_\s]*)?portada/i.test(f.name || '')) {
        fotoPortada = fotoObj;
      } else {
        fotosSueltas.push(fotoObj);
      }
    });

    const episodiosDrive = [];
    for (let i = 0; i < subcarpetas.length; i++) {
      const sub = subcarpetas[i];
      const subItems = await listarArchivosCarpeta(sub.id, cfg);
      const subImgs = subItems.filter(esImagen);
      if (!subImgs.length) continue;

      const tituloEp = limpiarNombreArchivo(sub.name, `Episodio ${i + 1}`);
      const fotosEp = subImgs.map((imgFile, k) => construirFotoDrive(imgFile, cfg, k, tituloEp));
      const primeraConFecha = fotosEp.find(x => x.fecha);

      episodiosDrive.push({
        titulo: tituloEp,
        fecha: primeraConFecha ? primeraConFecha.fecha : '',
        lugar: (sub.description && sub.description.trim()) || '',
        texto: '',
        fotos: fotosEp
      });
    }

    if (!fotoPortada) {
      if (fotosSueltas.length) fotoPortada = fotosSueltas[0];
      else if (episodiosDrive.length && episodiosDrive[0].fotos.length) fotoPortada = episodiosDrive[0].fotos[0];
    }

    return {
      portada: fotoPortada,
      fotosSueltas,
      episodiosDrive
    };
  }

  /* Detecta a qué capítulo corresponde el nombre de una subcarpeta en la carpeta raíz de Drive */
  function identificarSubcarpetaCapitulo(nombreCarpeta) {
    const n = String(nombreCarpeta || '').trim();
    if (/^(00[-_\s]*)?(epilogo|epílogo|origen|rompecabezas)/i.test(n)) {
      return { tipo: 'epilogo', id: 'epilogo' };
    }
    const mCap = n.match(/^(?:cap(?:itulo|ítulo)?[-_\s]*|0*)(\d+)(?:[\s\-_:·]+(.*))?$/i);
    if (mCap) {
      const num = Number(mCap[1]);
      const tituloExtra = (mCap[2] || '').trim();
      return {
        tipo: 'capitulo',
        id: `cap-${num}`,
        numero: num,
        tituloExtra
      };
    }
    return null;
  }

  /* ---------- Lector de variables de entorno (.env en local / window.ENV en servidor) ---------- */
  let envVariables = {};

  function parseDotEnv(texto) {
    const out = {};
    const lineas = String(texto || '').replace(/\r\n?/g, '\n').split('\n');
    for (const raw of lineas) {
      const linea = raw.trim();
      if (!linea || linea.startsWith('#')) continue;
      const eqIdx = linea.indexOf('=');
      if (eqIdx === -1) continue;
      const key = linea.slice(0, eqIdx).trim().replace(/^export\s+/, '');
      let val = linea.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      } else {
        const hashIdx = val.indexOf(' #');
        if (hashIdx !== -1) val = val.slice(0, hashIdx).trim();
      }
      if (key) out[key] = val;
    }
    return out;
  }

  async function cargarVariablesEntorno() {
    const combinadas = {};
    if (typeof process !== 'undefined' && process && process.env) {
      Object.assign(combinadas, process.env);
    }
    if (typeof window !== 'undefined' && window.ENV && typeof window.ENV === 'object') {
      Object.assign(combinadas, window.ENV);
    }
    if (typeof window !== 'undefined' && /^https?:$/i.test(window.location.protocol)) {
      try {
        const res = await fetch('.env', { cache: 'no-store' });
        if (res.ok) {
          const txt = await res.text();
          Object.assign(combinadas, parseDotEnv(txt));
        }
      } catch (_) {}
    }
    envVariables = combinadas;
    return envVariables;
  }

  function extraerCarpetasDeEnv(env) {
    const mapa = {};
    if (!env) return mapa;
    if (env.GOOGLE_DRIVE_FOLDER_EPILOGO) mapa.epilogo = env.GOOGLE_DRIVE_FOLDER_EPILOGO;
    for (const [k, v] of Object.entries(env)) {
      if (!v) continue;
      const m = k.match(/^GOOGLE_DRIVE_FOLDER_CAP_(\d+)$/i);
      if (m) mapa[`cap-${Number(m[1])}`] = v;
    }
    return mapa;
  }

  /* ---------- Obtener configuración combinada (.env + historia.yaml + localStorage override) ---------- */
  function obtenerConfiguracionActiva() {
    const yamlCfg = (window.HISTORIA && window.HISTORIA.googleDrive) || {};
    let localCfg = {};
    try {
      const raw = localStorage.getItem(STORAGE_CFG_KEY);
      if (raw) localCfg = JSON.parse(raw) || {};
    } catch (_) {}

    const envKey = (
      envVariables.GOOGLE_DRIVE_API_KEY ||
      envVariables.VITE_GOOGLE_DRIVE_API_KEY ||
      envVariables.API_KEY ||
      ''
    ).trim();

    const envClientId = (
      envVariables.GOOGLE_CLIENT_ID ||
      envVariables.VITE_GOOGLE_CLIENT_ID ||
      ''
    ).trim();

    const envProjectId = (envVariables.GOOGLE_PROJECT_ID || '').trim();
    const envClientSecret = (envVariables.GOOGLE_CLIENT_SECRET || '').trim();
    const envAuthUri = (envVariables.GOOGLE_AUTH_URI || 'https://accounts.google.com/o/oauth2/auth').trim();
    const envTokenUri = (envVariables.GOOGLE_TOKEN_URI || 'https://oauth2.googleapis.com/token').trim();

    const envRoot = (
      envVariables.GOOGLE_DRIVE_FOLDER_URL ||
      envVariables.GOOGLE_DRIVE_FOLDER_ID ||
      envVariables.DRIVE_FOLDER_URL ||
      ''
    ).trim();

    const envMode = (envVariables.GOOGLE_DRIVE_MODE || '').trim();
    const envCache = envVariables.GOOGLE_DRIVE_CACHE_MINUTES;

    const carpetasYaml = yamlCfg.carpetasPorCapitulo || {};
    const carpetasEnv = extraerCarpetasDeEnv(envVariables);
    const carpetasLocal = localCfg.carpetasPorCapitulo || {};
    const accessToken = obtenerTokenOAuthValido();

    return {
      activo: localCfg.activo ?? yamlCfg.activo ?? true,
      apiKey: (localCfg.apiKey || envKey || yamlCfg.apiKey || '').trim(),
      clientId: (localCfg.clientId || envClientId || yamlCfg.clientId || '').trim(),
      projectId: envProjectId,
      clientSecret: envClientSecret,
      authUri: envAuthUri,
      tokenUri: envTokenUri,
      accessToken,
      carpetaRaizId: extraerDriveId(localCfg.carpetaRaizId || envRoot || yamlCfg.carpetaRaizId || ''),
      modo: localCfg.modo || envMode || yamlCfg.modo || 'reemplazar',
      cacheMinutos: Number(envCache !== undefined && envCache !== '' ? envCache : (yamlCfg.cacheMinutos ?? 5)),
      carpetasPorCapitulo: Object.assign({}, carpetasYaml, carpetasEnv, carpetasLocal),
      origenEnv: Boolean(envKey || envClientId || envRoot || Object.keys(carpetasEnv).length)
    };
  }

  function tieneCarpetaConfigurada(cfg) {
    if (!cfg) return false;
    if (cfg.carpetaRaizId) return true;
    const map = cfg.carpetasPorCapitulo || {};
    return Object.values(map).some(v => Boolean(extraerDriveId(v)));
  }

  function tieneConfiguracionDrive(cfg) {
    if (!cfg || !cfg.activo) return false;
    const tieneCredencialActiva = Boolean(cfg.apiKey || cfg.accessToken);
    if (!tieneCredencialActiva) return false;
    return tieneCarpetaConfigurada(cfg);
  }

  /* ---------- Fusión de datos de Google Drive dentro de window.HISTORIA ---------- */
  function aplicarDatosDriveEnHistoria(paqueteDrive, modo) {
    const H = JSON.parse(JSON.stringify(window.HISTORIA || {}));
    let totalFotosDrive = 0;

    /* 1. Epílogo 3D */
    if (paqueteDrive.epilogo && paqueteDrive.epilogo.portada) {
      H.epilogo = H.epilogo || {};
      H.epilogo.maestra = Object.assign({}, H.epilogo.maestra || {}, {
        id: 'ep-maestra',
        src: paqueteDrive.epilogo.portada.src,
        mini: paqueteDrive.epilogo.portada.mini,
        pie: paqueteDrive.epilogo.portada.pie || (H.epilogo.maestra && H.epilogo.maestra.pie) || '14 de marzo · La imagen completa'
      });
      totalFotosDrive++;
    }

    /* 2. Capítulos existentes y nuevos capítulos detectados en Drive */
    H.capitulos = H.capitulos || [];
    const mapaCaps = new Map(H.capitulos.map(c => [c.id, c]));

    for (const [capId, datosCap] of Object.entries(paqueteDrive.capitulos || {})) {
      if (!datosCap) continue;
      let cap = mapaCaps.get(capId);

      if (!cap) {
        const num = datosCap.numero || (H.capitulos.length + 1);
        const rom = aRomano(num);
        const paleta = PALETAS_DINAMICAS[(num - 1) % PALETAS_DINAMICAS.length];
        const tituloNuevo = datosCap.tituloExtra || `Capítulo ${rom}`;
        cap = {
          id: capId,
          numero: num,
          romano: rom,
          archivo: `capitulo.html?id=${encodeURIComponent(capId)}`,
          corto: `${rom} · ${tituloNuevo.split(' ').slice(0, 2).join(' ')}`,
          periodo: datosCap.descripcionCarpeta || 'Nuevo capítulo desde Google Drive',
          hitoRelacion: `Capítulo ${rom} · Sincronizado dinámicamente desde Google Drive`,
          titulo: tituloNuevo,
          resumen: datosCap.descripcionCarpeta || 'Recuerdos agregados directamente desde nuestro álbum en Google Drive.',
          transicion: 'fundido',
          tema: paleta,
          portada: datosCap.portada || null,
          episodios: []
        };
        H.capitulos.push(cap);
        mapaCaps.set(capId, cap);
      }

      if (datosCap.portada && (modo === 'reemplazar' || !cap.portada)) {
        cap.portada = datosCap.portada;
      }

      cap.episodios = cap.episodios || [];

      if (modo === 'reemplazar') {
        const nuevosEps = [];
        if (datosCap.episodiosDrive && datosCap.episodiosDrive.length) {
          nuevosEps.push(...datosCap.episodiosDrive);
        }
        if (datosCap.fotosSueltas && datosCap.fotosSueltas.length) {
          const primeraFecha = (datosCap.fotosSueltas.find(f => f.fecha) || {}).fecha || '';
          nuevosEps.push({
            titulo: cap.episodios[0] ? cap.episodios[0].titulo : 'Momentos *juntos*',
            fecha: primeraFecha || (cap.episodios[0] && cap.episodios[0].fecha) || '',
            lugar: (cap.episodios[0] && cap.episodios[0].lugar) || cap.periodo || '',
            texto: (cap.episodios[0] && cap.episodios[0].texto) || cap.resumen || '',
            fotos: datosCap.fotosSueltas
          });
        }
        if (nuevosEps.length) {
          cap.episodios = nuevosEps;
        }
      } else {
        if (datosCap.episodiosDrive && datosCap.episodiosDrive.length) {
          datosCap.episodiosDrive.forEach((epD, idx) => {
            if (cap.episodios[idx]) {
              const idsExistentes = new Set((cap.episodios[idx].fotos || []).map(f => f.id));
              const nuevas = epD.fotos.filter(f => !idsExistentes.has(f.id));
              cap.episodios[idx].fotos = [...(cap.episodios[idx].fotos || []), ...nuevas];
            } else {
              cap.episodios.push(epD);
            }
          });
        }

        if (datosCap.fotosSueltas && datosCap.fotosSueltas.length) {
          if (!cap.episodios.length) {
            const primeraFecha = (datosCap.fotosSueltas.find(f => f.fecha) || {}).fecha || '';
            cap.episodios.push({
              titulo: 'Recuerdos del *capítulo*',
              fecha: primeraFecha,
              lugar: cap.periodo || '',
              texto: cap.resumen || '',
              fotos: datosCap.fotosSueltas
            });
          } else {
            const ultimoEp = cap.episodios[cap.episodios.length - 1];
            const idsExistentes = new Set((ultimoEp.fotos || []).map(f => f.id));
            const nuevas = datosCap.fotosSueltas.filter(f => !idsExistentes.has(f.id));
            ultimoEp.fotos = [...(ultimoEp.fotos || []), ...nuevas];
          }
        }
      }

      totalFotosDrive += (datosCap.fotosSueltas ? datosCap.fotosSueltas.length : 0) +
        (datosCap.episodiosDrive ? datosCap.episodiosDrive.reduce((acc, e) => acc + e.fotos.length, 0) : 0);
    }

    H.capitulos.sort((a, b) => (Number(a.numero) || 99) - (Number(b.numero) || 99));

    if (window.DatosAmor && window.DatosAmor.reinicializar) {
      window.DatosAmor.reinicializar(H);
    }

    return totalFotosDrive;
  }

  /* ---------- Sincronización Principal con Caché en sessionStorage ---------- */
  let estadoSync = {
    estado: 'inactivo', // 'inactivo' | 'sincronizando' | 'conectado' | 'error'
    mensaje: 'Usando catálogo local (Configura tu Google Drive API para sincronización en vivo)',
    fotosSincronizadas: 0
  };

  async function sincronizarDesdeDrive(forzarSinCache) {
    const cfg = obtenerConfiguracionActiva();
    if (!tieneConfiguracionDrive(cfg)) {
      if (cfg.clientId && !cfg.apiKey && !cfg.accessToken) {
        estadoSync = {
          estado: 'inactivo',
          mensaje: `OAuth 2.0 detectado en .env (${cfg.projectId || 'Google Cloud'}). Falta definir GOOGLE_DRIVE_FOLDER_URL y autorizar acceso, o agregar GOOGLE_DRIVE_API_KEY.`,
          fotosSincronizadas: 0
        };
      } else {
        estadoSync = {
          estado: 'inactivo',
          mensaje: 'Modo local activo · Agrega GOOGLE_DRIVE_FOLDER_URL en .env y usa tu API Key o el botón de OAuth 2.0.',
          fotosSincronizadas: 0
        };
      }
      actualizarInsigniaDriveUI();
      return null;
    }

    const cacheKey = `${STORAGE_CACHE_KEY}:${cfg.carpetaRaizId}:${JSON.stringify(cfg.carpetasPorCapitulo)}:${cfg.modo}`;
    if (!forzarSinCache && cfg.cacheMinutos > 0) {
      try {
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw);
          const edadMs = Date.now() - (cached.timestamp || 0);
          if (edadMs < cfg.cacheMinutos * 60000 && cached.paquete) {
            const count = aplicarDatosDriveEnHistoria(cached.paquete, cfg.modo);
            estadoSync = {
              estado: 'conectado',
              mensaje: `Conectado a Google Drive (caché) · ${count} fotos sincronizadas`,
              fotosSincronizadas: count
            };
            actualizarInsigniaDriveUI();
            return cached.paquete;
          }
        }
      } catch (_) {}
    }

    estadoSync = {
      estado: 'sincronizando',
      mensaje: 'Sincronizando fotografías con Google Drive API…',
      fotosSincronizadas: 0
    };
    actualizarInsigniaDriveUI();

    try {
      const paquete = { epilogo: null, capitulos: {} };

      /* 1. Si hay carpetaRaizId, descubrir subcarpetas automáticamente */
      if (cfg.carpetaRaizId) {
        const raizItems = await listarArchivosCarpeta(cfg.carpetaRaizId, cfg);
        const subcarpetas = raizItems.filter(esCarpeta);
        const imagenesEnRaiz = raizItems.filter(esImagen);

        for (const sub of subcarpetas) {
          const info = identificarSubcarpetaCapitulo(sub.name);
          if (!info) continue;
          if (info.tipo === 'epilogo') {
            paquete.epilogo = await leerCarpetaCapituloDrive(sub.id, cfg, 'El Origen');
          } else if (info.tipo === 'capitulo') {
            const datosCap = await leerCarpetaCapituloDrive(sub.id, cfg, info.tituloExtra || `Capítulo ${aRomano(info.numero)}`);
            datosCap.numero = info.numero;
            datosCap.tituloExtra = info.tituloExtra;
            datosCap.descripcionCarpeta = sub.description || '';
            paquete.capitulos[info.id] = datosCap;
          }
        }

        if (!subcarpetas.length && imagenesEnRaiz.length) {
          paquete.capitulos['cap-1'] = {
            portada: construirFotoDrive(imagenesEnRaiz[0], cfg, 0, 'Capítulo I'),
            fotosSueltas: imagenesEnRaiz.map((f, idx) => construirFotoDrive(f, cfg, idx, 'Capítulo I')),
            episodiosDrive: []
          };
        }
      }

      /* 2. Carpetas individuales configuradas en carpetasPorCapitulo */
      const mapaIndividual = cfg.carpetasPorCapitulo || {};
      for (const [clave, valorId] of Object.entries(mapaIndividual)) {
        const folderId = extraerDriveId(valorId);
        if (!folderId) continue;
        if (clave === 'epilogo') {
          paquete.epilogo = await leerCarpetaCapituloDrive(folderId, cfg, 'El Origen');
        } else {
          const mNum = clave.match(/(\d+)/);
          const num = mNum ? Number(mNum[1]) : 1;
          const datosCap = await leerCarpetaCapituloDrive(folderId, cfg, `Capítulo ${aRomano(num)}`);
          datosCap.numero = num;
          paquete.capitulos[clave] = datosCap;
        }
      }

      const total = aplicarDatosDriveEnHistoria(paquete, cfg.modo);

      try {
        sessionStorage.setItem(cacheKey, JSON.stringify({
          timestamp: Date.now(),
          paquete
        }));
      } catch (_) {}

      estadoSync = {
        estado: 'conectado',
        mensaje: `Conectado a Google Drive API · ${total} fotos sincronizadas`,
        fotosSincronizadas: total
      };
      actualizarInsigniaDriveUI();
      return paquete;
    } catch (err) {
      estadoSync = {
        estado: 'error',
        mensaje: `Error de Google Drive API: ${err.message || err}`,
        fotosSincronizadas: 0
      };
      actualizarInsigniaDriveUI();
      return null;
    }
  }

  /* ========================================================================
     Asistente Visual de Configuración y Estado de Google Drive (Modal ligero)
     ======================================================================== */
  let modalDriveEl = null;

  function inyectarEstilosDriveUI() {
    if (document.getElementById('drive-sync-styles')) return;
    const st = document.createElement('style');
    st.id = 'drive-sync-styles';
    st.textContent = `
      .drive-pill-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 5px 12px;
        border-radius: 99px;
        background: rgba(255,255,255,.05);
        border: 1px solid rgba(255,255,255,.12);
        color: #cbd5e1;
        font-size: 12px;
        font-family: inherit;
        cursor: pointer;
        transition: background .2s, border-color .2s, color .2s;
      }
      .drive-pill-btn:hover { background: rgba(255,255,255,.11); color: #fff; border-color: rgba(255,255,255,.25); }
      .drive-dot { width: 7px; height: 7px; border-radius: 50%; background: #64748b; }
      .drive-pill-btn[data-status="conectado"] .drive-dot { background: #34d399; box-shadow: 0 0 8px #34d399; }
      .drive-pill-btn[data-status="sincronizando"] .drive-dot { background: #60a5fa; box-shadow: 0 0 8px #60a5fa; }
      .drive-pill-btn[data-status="error"] .drive-dot { background: #f43f5e; box-shadow: 0 0 8px #f43f5e; }
      .drive-modal {
        max-width: 580px;
        width: calc(100% - 32px);
        border-radius: 24px;
        background: #0d0e17;
        color: #f8fafc;
        border: 1px solid rgba(255,255,255,.16);
        padding: 26px;
        box-shadow: 0 32px 80px rgba(0,0,0,.85);
      }
      .drive-modal::backdrop { background: rgba(0,0,0,.72); backdrop-filter: blur(8px); }
      .drive-modal h3 { margin: 0 0 6px; font-size: 20px; font-weight: 600; }
      .drive-modal p.sub { margin: 0 0 16px; font-size: 13px; color: #94a3b8; line-height: 1.5; }
      .drive-field { display: grid; gap: 5px; margin-bottom: 13px; }
      .drive-field label { font-size: 12px; font-weight: 600; color: #cbd5e1; }
      .drive-field input, .drive-field select {
        width: 100%;
        padding: 10px 12px;
        border-radius: 12px;
        border: 1px solid rgba(255,255,255,.14);
        background: rgba(255,255,255,.05);
        color: #fff;
        font-size: 13.5px;
        font-family: inherit;
      }
      .drive-field small { font-size: 11.5px; color: #64748b; }
      .drive-status-box {
        padding: 10px 14px;
        border-radius: 12px;
        background: rgba(255,255,255,.04);
        border: 1px solid rgba(255,255,255,.09);
        font-size: 12.5px;
        color: #e2e8f0;
        margin-bottom: 14px;
      }
      .drive-env-badge {
        padding: 9px 12px;
        border-radius: 10px;
        background: rgba(56, 189, 248, 0.08);
        border: 1px solid rgba(56, 189, 248, 0.22);
        font-size: 12px;
        color: #bae6fd;
        margin-bottom: 14px;
      }
      .drive-actions { display: flex; flex-wrap: wrap; gap: 8px; justify-content: flex-end; margin-top: 16px; }
      .drive-btn {
        padding: 9px 16px;
        border-radius: 99px;
        border: 1px solid rgba(255,255,255,.16);
        background: rgba(255,255,255,.07);
        color: #fff;
        font-size: 13px;
        font-weight: 500;
        cursor: pointer;
      }
      .drive-btn.oauth {
        background: rgba(56, 189, 248, 0.16);
        border-color: rgba(56, 189, 248, 0.4);
        color: #e0f2fe;
      }
      .drive-btn.primario {
        background: linear-gradient(100deg, #3b82f6, #ec4899);
        border-color: transparent;
        font-weight: 600;
      }
    `;
    document.head.appendChild(st);
  }

  function actualizarInsigniaDriveUI() {
    const btn = document.getElementById('btn-drive-status');
    if (btn) {
      btn.dataset.status = estadoSync.estado;
      const label = btn.querySelector('.drive-lbl');
      if (label) {
        if (estadoSync.estado === 'conectado') {
          label.textContent = `Google Drive (${estadoSync.fotosSincronizadas} fotos)`;
        } else if (estadoSync.estado === 'sincronizando') {
          label.textContent = 'Sincronizando Drive…';
        } else if (estadoSync.estado === 'error') {
          label.textContent = 'Drive: Revisar API';
        } else {
          label.textContent = 'Conectar Google Drive';
        }
      }
    }
    const stBox = document.getElementById('drive-modal-status');
    if (stBox) stBox.textContent = estadoSync.mensaje;
  }

  function abrirModalDrive() {
    inyectarEstilosDriveUI();
    if (!modalDriveEl) {
      modalDriveEl = document.createElement('dialog');
      modalDriveEl.className = 'drive-modal';
      modalDriveEl.setAttribute('aria-label', 'Configuración de Google Drive API');
      modalDriveEl.innerHTML = `
        <h3>☁ Conexión Dinámica con Google Drive API</h3>
        <p class="sub">
          Sube tus fotografías a una carpeta de Google Drive con subcarpetas <code>epilogo</code>, <code>capitulo-1</code>..<code>capitulo-4</code>.
          Puedes autenticarte con tu <strong>OAuth 2.0 Client ID</strong> cargado desde <code>.env</code> o con una <strong>API Key</strong> pública.
        </p>
        <div class="drive-env-badge" id="drive-env-info" hidden></div>
        <div class="drive-status-box" id="drive-modal-status"></div>
        <form id="drive-cfg-form" method="dialog">
          <div class="drive-field">
            <label for="inp-drive-root">Enlace o ID de la Carpeta Raíz en Google Drive (GOOGLE_DRIVE_FOLDER_URL)</label>
            <input type="text" id="inp-drive-root" placeholder="https://drive.google.com/drive/folders/1AbCdEf... o ID">
            <small>El sistema extrae automáticamente el ID aunque pegues el enlace completo.</small>
          </div>
          <div class="drive-field">
            <label for="inp-drive-client">OAuth 2.0 Client ID (GOOGLE_CLIENT_ID en .env)</label>
            <input type="text" id="inp-drive-client" placeholder="123456-abc.apps.googleusercontent.com" autocomplete="off">
          </div>
          <div class="drive-field">
            <label for="inp-drive-key">API Key Pública (Opcional · GOOGLE_DRIVE_API_KEY para lectura sin login)</label>
            <input type="password" id="inp-drive-key" placeholder="AIzaSy..." autocomplete="off">
          </div>
          <div class="drive-field">
            <label for="inp-drive-mode">Modo de visualización</label>
            <select id="inp-drive-mode">
              <option value="reemplazar">Reemplazar (Usar únicamente las fotos alojadas en Drive)</option>
              <option value="hibrido">Híbrido (Combinar estructura YAML + fotos de Drive)</option>
            </select>
          </div>
          <div class="drive-actions">
            <button type="button" class="drive-btn" id="btn-drive-clear">Restaurar</button>
            <button type="button" class="drive-btn" id="btn-drive-close">Cerrar</button>
            <button type="button" class="drive-btn oauth" id="btn-drive-oauth">Autorizar con Google OAuth</button>
            <button type="submit" class="drive-btn primario">Guardar y Sincronizar</button>
          </div>
        </form>
      `;
      document.body.appendChild(modalDriveEl);

      modalDriveEl.querySelector('#btn-drive-close').addEventListener('click', () => modalDriveEl.close());
      modalDriveEl.querySelector('#btn-drive-clear').addEventListener('click', () => {
        localStorage.removeItem(STORAGE_CFG_KEY);
        sessionStorage.clear();
        location.reload();
      });

      modalDriveEl.querySelector('#btn-drive-oauth').addEventListener('click', async () => {
        try {
          const clientId = modalDriveEl.querySelector('#inp-drive-client').value.trim();
          const carpetaRaizId = extraerDriveId(modalDriveEl.querySelector('#inp-drive-root').value.trim());
          const apiKey = modalDriveEl.querySelector('#inp-drive-key').value.trim();
          const modo = modalDriveEl.querySelector('#inp-drive-mode').value;
          localStorage.setItem(STORAGE_CFG_KEY, JSON.stringify({
            activo: true,
            clientId,
            apiKey,
            carpetaRaizId,
            modo
          }));
          await solicitarTokenOAuthInteractivo(clientId);
          await sincronizarDesdeDrive(true);
        } catch (err) {
          estadoSync = {
            estado: 'error',
            mensaje: `Error OAuth 2.0: ${err.message || err}`,
            fotosSincronizadas: 0
          };
          actualizarInsigniaDriveUI();
        }
      });

      modalDriveEl.querySelector('#drive-cfg-form').addEventListener('submit', async e => {
        e.preventDefault();
        const apiKey = modalDriveEl.querySelector('#inp-drive-key').value.trim();
        const clientId = modalDriveEl.querySelector('#inp-drive-client').value.trim();
        const carpetaRaizId = extraerDriveId(modalDriveEl.querySelector('#inp-drive-root').value.trim());
        const modo = modalDriveEl.querySelector('#inp-drive-mode').value;
        localStorage.setItem(STORAGE_CFG_KEY, JSON.stringify({
          activo: true,
          apiKey,
          clientId,
          carpetaRaizId,
          modo
        }));
        await sincronizarDesdeDrive(true);
      });
    }

    const cfg = obtenerConfiguracionActiva();
    modalDriveEl.querySelector('#inp-drive-key').value = cfg.apiKey || '';
    modalDriveEl.querySelector('#inp-drive-client').value = cfg.clientId || '';
    modalDriveEl.querySelector('#inp-drive-root').value = cfg.carpetaRaizId || '';
    modalDriveEl.querySelector('#inp-drive-mode').value = cfg.modo || 'reemplazar';

    const envInfo = modalDriveEl.querySelector('#drive-env-info');
    if (envInfo) {
      if (cfg.projectId || cfg.clientId) {
        envInfo.hidden = false;
        envInfo.innerHTML = `✓ Credenciales en <code>.env</code> detectadas · Proyecto: <strong>${cfg.projectId || 'Google Cloud'}</strong>`;
      } else {
        envInfo.hidden = true;
      }
    }

    actualizarInsigniaDriveUI();
    modalDriveEl.showModal();
  }

  function montarBotonPieDrive() {
    inyectarEstilosDriveUI();
    const pie = document.querySelector('.pie');
    if (!pie || document.getElementById('btn-drive-status')) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.id = 'btn-drive-status';
    btn.className = 'drive-pill-btn';
    btn.dataset.status = estadoSync.estado;
    btn.innerHTML = `<span class="drive-dot" aria-hidden="true"></span><span class="drive-lbl">Conectar Google Drive</span>`;
    btn.addEventListener('click', abrirModalDrive);
    pie.appendChild(btn);
    actualizarInsigniaDriveUI();
  }

  function aplicarIdentidadDesdeEnv() {
    if (!window.HISTORIA) return;
    let cambiado = false;
    const sub = (envVariables.BRAND_SUBTITLE || '').trim();
    const el = (envVariables.COUPLE_NAME_EL || '').trim();
    const ella = (envVariables.COUPLE_NAME_ELLA || '').trim();
    if (sub) {
      window.HISTORIA.subtituloMarca = sub;
      cambiado = true;
    }
    if (el || ella) {
      window.HISTORIA.pareja = window.HISTORIA.pareja || {};
      if (el) window.HISTORIA.pareja.el = el;
      if (ella) window.HISTORIA.pareja.ella = ella;
      cambiado = true;
    }
    if (cambiado && window.DatosAmor && window.DatosAmor.reinicializar) {
      window.DatosAmor.reinicializar(window.HISTORIA);
    }
  }

  /* Iniciar al cargar el DOM y esperar a que `.env` e `historia.yaml` estén listos */
  function iniciar() {
    montarBotonPieDrive();
    const promesaYaml = (window.DatosAmor && window.DatosAmor.ready)
      ? window.DatosAmor.ready()
      : Promise.resolve();
    Promise.all([promesaYaml, cargarVariablesEntorno()]).then(() => {
      aplicarIdentidadDesdeEnv();
      sincronizarDesdeDrive(false);
    });
    if (new URLSearchParams(location.search).get('drive') === 'config') {
      cargarVariablesEntorno().then(() => abrirModalDrive());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  } else {
    iniciar();
  }

  window.DriveAmor = {
    parseDotEnv,
    extraerDriveId,
    sincronizarDesdeDrive,
    solicitarTokenOAuthInteractivo,
    abrirModalDrive,
    obtenerConfiguracionActiva,
    obtenerEstado: () => estadoSync
  };
})();
