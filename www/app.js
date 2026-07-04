(() => {
  const cfg = window.INGEPLUS_CONFIG || {};
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const STORE = {
    session: 'ingeplus.session',
    docs: 'ingeplus.calicatas.docs',
    log: 'ingeplus.log'
  };

  const state = {
    session: loadJSON(STORE.session, null),
    docs: loadJSON(STORE.docs, []),
    currentDocId: null,
    gps: { lat: null, lon: null, alt: null, time: null, watchId: null }
  };

  function loadJSON(key, fallback) {
    try { return JSON.parse(localStorage.getItem(key) || 'null') ?? fallback; }
    catch { return fallback; }
  }
  function saveJSON(key, value) { localStorage.setItem(key, JSON.stringify(value)); }
  function log(msg) {
    const line = `[${new Date().toISOString()}] ${msg}`;
    const old = localStorage.getItem(STORE.log) || '';
    localStorage.setItem(STORE.log, `${old}${line}\n`.slice(-50000));
    console.log(line);
  }
  function toast(msg) {
    const t = $('toast');
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._timer);
    t._timer = setTimeout(() => t.classList.remove('show'), 2300);
  }
  function setMsg(el, msg, ok = false) {
    el.textContent = msg || '';
    el.classList.toggle('ok', !!ok);
  }
  function todayISO() { return new Date().toISOString().slice(0, 10); }
  function timeHHMM() { return new Date().toTimeString().slice(0, 5); }
  function uid() { return `CAL-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`; }
  function escapeHtml(s = '') {
    return String(s).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  }
  function emailValid(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e).trim()); }
  function passwordPolicy(p) {
    if (!p || p.length < 8) return 'La contraseña debe tener mínimo 8 caracteres.';
    if (!/[A-ZÁÉÍÓÚÑ]/.test(p)) return 'La contraseña debe incluir una mayúscula.';
    if (!/[a-záéíóúñ]/.test(p)) return 'La contraseña debe incluir una minúscula.';
    if (!/\d/.test(p)) return 'La contraseña debe incluir un número.';
    return '';
  }

  async function supabaseFetch(path, options = {}) {
    const url = `${cfg.SUPABASE_URL}${path}`;
    const headers = {
      'apikey': cfg.SUPABASE_ANON_KEY,
      'Accept': 'application/json',
      ...(options.body ? {'Content-Type': 'application/json'} : {}),
      ...(options.headers || {})
    };
    const res = await fetch(url, { ...options, headers });
    let data = null;
    const text = await res.text();
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
    if (!res.ok) {
      const msg = data?.msg || data?.message || data?.error_description || data?.error || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  function setSession(session, mode = 'online') {
    state.session = session ? { ...session, mode, savedAt: new Date().toISOString() } : null;
    if (state.session) saveJSON(STORE.session, state.session); else localStorage.removeItem(STORE.session);
    updateSessionUI();
  }

  async function login() {
    const email = $('login-email').value.trim().toLowerCase();
    const password = $('login-password').value;
    const msg = $('login-msg');
    setMsg(msg, '');
    if (!email || !password) return setMsg(msg, 'Ingresa usuario/email y contraseña.');
    if (!emailValid(email)) return setMsg(msg, 'Correo inválido.');
    $('btn-login').disabled = true;
    $('btn-login').textContent = 'Procesando...';
    try {
      const data = await supabaseFetch('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      const user = data.user || {};
      const meta = user.user_metadata || {};
      setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
        userId: user.id,
        email: user.email || email,
        nombre: meta.nombre || meta.name || meta.full_name || 'Usuario',
        apellido: meta.apellido || '',
        phone: meta.phone || ''
      }, 'online');
      log(`Login OK: ${email}`);
      showMain('home');
      toast('Sesión iniciada con servidor');
    } catch (err) {
      log(`Login error: ${err.message}`);
      setMsg(msg, `Error en login: ${err.message}`);
    } finally {
      $('btn-login').disabled = false;
      $('btn-login').textContent = 'Iniciar sesión';
    }
  }

  async function register() {
    const nombre = $('reg-nombre').value.trim();
    const apellido = $('reg-apellido').value.trim();
    const email = $('reg-email').value.trim().toLowerCase();
    const phone = $('reg-phone').value.trim();
    const password = $('reg-password').value;
    const password2 = $('reg-password2').value;
    const msg = $('register-msg');
    setMsg(msg, '');
    if (!nombre || !apellido || !email || !phone || !password) return setMsg(msg, 'Completa todos los campos.');
    if (!emailValid(email)) return setMsg(msg, 'Correo inválido.');
    if (password !== password2) return setMsg(msg, 'Las contraseñas no coinciden.');
    const policy = passwordPolicy(password);
    if (policy) return setMsg(msg, policy);
    $('btn-register').disabled = true;
    $('btn-register').textContent = 'Procesando...';
    try {
      await supabaseFetch('/auth/v1/signup', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cfg.SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          email,
          password,
          data: { nombre, apellido, phone, full_name: `${nombre} ${apellido}`.trim(), name: `${nombre} ${apellido}`.trim() }
        })
      });
      setMsg(msg, 'Registro enviado. Revisa si Supabase pide confirmar correo.', true);
      log(`Signup OK: ${email}`);
      setTimeout(() => showLoginView(), 1200);
    } catch (err) {
      log(`Signup error: ${err.message}`);
      setMsg(msg, `Error al registrarse: ${err.message}`);
    } finally {
      $('btn-register').disabled = false;
      $('btn-register').textContent = 'Registrarme';
    }
  }

  function localMode() {
    const localUser = { email: 'modo.local@ingeplus', nombre: 'Invitado', apellido: '', phone: '', userId: 'local' };
    setSession(localUser, 'local');
    log('Modo local activado');
    showMain('home');
    toast('Modo local activado');
  }

  function logout() {
    setSession(null);
    log('Sesión cerrada');
    $('auth-screen').classList.add('active');
    $('main-screen').classList.remove('active');
    showLoginView();
  }

  function showLoginView() {
    $('login-view').classList.add('active');
    $('register-view').classList.remove('active');
  }
  function showRegisterView() {
    $('register-view').classList.add('active');
    $('login-view').classList.remove('active');
  }
  function showMain(page = 'home') {
    $('auth-screen').classList.remove('active');
    $('main-screen').classList.add('active');
    navigate(page);
    updateSessionUI();
  }
  function navigate(page) {
    qsa('.page').forEach(p => p.classList.remove('active'));
    $(`page-${page}`).classList.add('active');
    qsa('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page === page));
    const titles = {
      home: ['Hola, ' + displayName(), '¿Qué ficha quieres completar?'],
      form: ['Ficha de calicata', 'Registro editable y exportable'],
      docs: ['Documentos', 'Gestión local de fichas'],
      map: ['GPS / Internet', 'Diagnóstico seguro para iOS'],
      profile: ['Perfil', state.session ? 'Sesión activa' : 'Sesión no iniciada']
    };
    $('header-title').textContent = titles[page]?.[0] || 'InGe+';
    $('header-subtitle').textContent = titles[page]?.[1] || '';
    if (page === 'docs') renderDocs();
    if (page === 'profile') updateSessionUI();
    closeDrawer();
  }
  function displayName() {
    const s = state.session;
    if (!s) return 'Invitado';
    return (`${s.nombre || ''} ${s.apellido || ''}`.trim()) || s.email || 'Usuario';
  }
  function updateSessionUI() {
    const s = state.session;
    $('drawer-session').textContent = s ? (s.mode === 'online' ? `Sesión servidor: ${s.email}` : 'Modo local / sin servidor') : 'Sesión no iniciada';
    $('profile-name').textContent = displayName();
    $('profile-initial').textContent = displayName().charAt(0).toUpperCase() || 'U';
    $('profile-session').textContent = s ? (s.mode === 'online' ? 'Sesión activa con servidor' : 'Modo local') : 'Sesión no iniciada';
    $('profile-email').textContent = s?.email || '--';
    $('profile-phone').textContent = s?.phone || '--';
    $('btn-profile-login').style.display = s ? 'none' : '';
    $('btn-profile-logout').style.display = s ? '' : 'none';
    if ($('main-screen').classList.contains('active')) {
      $('header-title').textContent = `Hola, ${displayName()}`;
    }
  }

  function openDrawer() { $('drawer').classList.add('open'); $('drawer').setAttribute('aria-hidden', 'false'); }
  function closeDrawer() { $('drawer').classList.remove('open'); $('drawer').setAttribute('aria-hidden', 'true'); }

  function blankCorte(idx = 1) {
    return { de: '', a: '', tipo: '', descripcion: '', sucs: 'SP', muestra: '', granulometria: '', plasticidad: '', humedad: '' };
  }
  function addCorte(data = blankCorte(), focus = false) {
    const list = $('cortes-list');
    const index = list.children.length + 1;
    const card = document.createElement('div');
    card.className = 'corte-card';
    card.innerHTML = `
      <div class="corte-head"><strong>Corte ${index}</strong><button type="button" class="danger btn-del-corte">Eliminar</button></div>
      <div class="mini-grid">
        <label>DE (m)<input name="de" inputmode="decimal" value="${escapeHtml(data.de)}"></label>
        <label>A (m)<input name="a" inputmode="decimal" value="${escapeHtml(data.a)}"></label>
        <label>TIPO<input name="tipo" value="${escapeHtml(data.tipo)}" placeholder="M-1 / Alterado"></label>
        <label>SUCS<select name="sucs">${['CL','GC','GM','GP','GW','MH','ML','OL','SC','SM','SP','SW'].map(s=>`<option ${s===data.sucs?'selected':''}>${s}</option>`).join('')}</select></label>
      </div>
      <label>Descripción del corte<textarea name="descripcion" rows="2" placeholder="Color, humedad, compacidad, textura...">${escapeHtml(data.descripcion)}</textarea></label>
      <div class="mini-grid">
        <label>Muestra / Ensayo<input name="muestra" value="${escapeHtml(data.muestra)}" placeholder="M-1 / DPL / SPT"></label>
        <label>Granulometría (%)<input name="granulometria" value="${escapeHtml(data.granulometria)}" placeholder="Grava/Arena/Finos"></label>
        <label>Plasticidad<input name="plasticidad" value="${escapeHtml(data.plasticidad)}" placeholder="WL / LP / IP"></label>
        <label>Humedad<input name="humedad" value="${escapeHtml(data.humedad)}" placeholder="% o descripción"></label>
      </div>`;
    qs('.btn-del-corte', card).addEventListener('click', () => { card.remove(); renumberCortes(); });
    list.appendChild(card);
    if (focus) qs('input', card).focus();
  }
  function renumberCortes() {
    qsa('.corte-card').forEach((c, i) => qs('.corte-head strong', c).textContent = `Corte ${i + 1}`);
  }
  function formData() {
    const fields = ['proyecto','calicata','supervisor','maquina','lado','zona','este','norte','altitud','fechaInicio','fechaFin','hora','descripcion','observaciones'];
    const map = {
      proyecto:'f-proyecto', calicata:'f-calicata', supervisor:'f-supervisor', maquina:'f-maquina', lado:'f-lado', zona:'f-zona', este:'f-este', norte:'f-norte', altitud:'f-altitud', fechaInicio:'f-fecha-inicio', fechaFin:'f-fecha-fin', hora:'f-hora', descripcion:'f-descripcion', observaciones:'f-obs'
    };
    const data = {};
    fields.forEach(f => data[f] = $(map[f]).value);
    data.cortes = qsa('.corte-card').map(card => {
      const obj = {};
      qsa('[name]', card).forEach(el => obj[el.name] = el.value);
      return obj;
    });
    return data;
  }
  function loadForm(data = {}) {
    const map = {
      proyecto:'f-proyecto', calicata:'f-calicata', supervisor:'f-supervisor', maquina:'f-maquina', lado:'f-lado', zona:'f-zona', este:'f-este', norte:'f-norte', altitud:'f-altitud', fechaInicio:'f-fecha-inicio', fechaFin:'f-fecha-fin', hora:'f-hora', descripcion:'f-descripcion', observaciones:'f-obs'
    };
    Object.entries(map).forEach(([k,id]) => { if (data[k] !== undefined) $(id).value = data[k]; });
    $('cortes-list').innerHTML = '';
    (data.cortes && data.cortes.length ? data.cortes : [blankCorte()]).forEach(c => addCorte(c));
  }
  function newCalicata(type = 'calicata') {
    state.currentDocId = null;
    const titles = { calicata:'FICHA DE CALICATA', talud:'FICHA DE TALUD', perfiles:'PERFILES ESTRATIGRÁFICOS', eg:'ESTACIONES GEOMECÁNICAS' };
    $('form-title').textContent = titles[type] || 'FICHA DE CALICATA';
    loadForm({
      proyecto: 'Proyecto Lechamayo',
      calicata: type === 'calicata' ? nextCalicataCode() : `${type.toUpperCase()}-001`,
      fechaInicio: todayISO(), fechaFin: todayISO(), hora: timeHHMM(), zona:'18S', cortes: [blankCorte()]
    });
    navigate('form');
  }
  function nextCalicataCode() {
    const n = state.docs.length + 1;
    return `CAL-${String(n).padStart(3,'0')}`;
  }
  function saveForm() {
    const data = formData();
    if (!data.proyecto || !data.calicata) { toast('Completa proyecto y calicata'); return null; }
    const now = new Date().toISOString();
    const doc = {
      id: state.currentDocId || uid(),
      title: data.calicata,
      project: data.proyecto,
      type: $('form-title').textContent,
      data,
      updatedAt: now,
      createdAt: state.docs.find(d => d.id === state.currentDocId)?.createdAt || now,
      user: state.session?.email || 'local'
    };
    const idx = state.docs.findIndex(d => d.id === doc.id);
    if (idx >= 0) state.docs[idx] = doc; else state.docs.unshift(doc);
    state.currentDocId = doc.id;
    saveJSON(STORE.docs, state.docs);
    log(`Ficha guardada: ${doc.title}`);
    toast('Ficha guardada');
    return doc;
  }
  function openDoc(id) {
    const doc = state.docs.find(d => d.id === id);
    if (!doc) return;
    state.currentDocId = id;
    $('form-title').textContent = doc.type || 'FICHA DE CALICATA';
    loadForm(doc.data || {});
    navigate('form');
  }
  function deleteDoc(id) {
    const doc = state.docs.find(d => d.id === id);
    if (!doc) return;
    if (!confirm(`¿Eliminar ${doc.title}?`)) return;
    state.docs = state.docs.filter(d => d.id !== id);
    saveJSON(STORE.docs, state.docs);
    renderDocs();
    toast('Ficha eliminada');
  }
  function renderDocs() {
    const box = $('docs-list');
    if (!state.docs.length) {
      box.innerHTML = `<div class="form-card"><h3>No hay documentos guardados</h3><p class="muted">Crea una ficha desde Inicio o pulsa Nueva calicata.</p></div>`;
      return;
    }
    box.innerHTML = state.docs.map(doc => `
      <article class="doc-card">
        <img src="assets/images/ICONO_CALICATA.png" alt="Calicata">
        <div><h3>${escapeHtml(doc.title)}</h3><p>${escapeHtml(doc.project)} · ${new Date(doc.updatedAt).toLocaleString()}</p></div>
        <div class="doc-actions">
          <button class="secondary" data-action="open" data-id="${doc.id}">Abrir</button>
          <button class="success" data-action="export" data-id="${doc.id}">Excel</button>
          <button class="danger" data-action="delete" data-id="${doc.id}">Eliminar</button>
        </div>
      </article>`).join('');
    qsa('[data-action]', box).forEach(b => b.addEventListener('click', () => {
      const id = b.dataset.id;
      if (b.dataset.action === 'open') openDoc(id);
      if (b.dataset.action === 'delete') deleteDoc(id);
      if (b.dataset.action === 'export') exportExcel(state.docs.find(d => d.id === id));
    }));
  }

  function excelHtml(doc) {
    const d = doc?.data || formData();
    const cortesRows = (d.cortes || []).map((c,i) => `
      <tr><td>${i+1}</td><td>${escapeHtml(c.de)}</td><td>${escapeHtml(c.a)}</td><td>${escapeHtml(c.tipo)}</td><td>${escapeHtml(c.descripcion)}</td><td>${escapeHtml(c.sucs)}</td><td>${escapeHtml(c.muestra)}</td><td>${escapeHtml(c.granulometria)}</td><td>${escapeHtml(c.plasticidad)}</td><td>${escapeHtml(c.humedad)}</td></tr>`).join('');
    return `<!doctype html><html><head><meta charset="utf-8"><style>
      table{border-collapse:collapse;font-family:Arial;font-size:11pt}td,th{border:1px solid #6a6a6a;padding:5px;vertical-align:top}th{background:#9DC2E6;font-weight:bold}.title{background:#005B97;color:white;font-size:16pt;text-align:center}.sub{background:#D9EAF7;font-weight:bold}
    </style></head><body><table>
      <tr><th colspan="10" class="title">${escapeHtml(doc?.type || $('form-title').textContent || 'FICHA DE CALICATA')}</th></tr>
      <tr><td class="sub">Proyecto</td><td colspan="4">${escapeHtml(d.proyecto)}</td><td class="sub">Calicata</td><td colspan="4">${escapeHtml(d.calicata)}</td></tr>
      <tr><td class="sub">Supervisor</td><td colspan="4">${escapeHtml(d.supervisor)}</td><td class="sub">Máquina</td><td colspan="4">${escapeHtml(d.maquina)}</td></tr>
      <tr><td class="sub">Fecha Inicio</td><td>${escapeHtml(d.fechaInicio)}</td><td class="sub">Fecha Fin</td><td>${escapeHtml(d.fechaFin)}</td><td class="sub">Hora</td><td>${escapeHtml(d.hora)}</td><td class="sub">Lado</td><td colspan="3">${escapeHtml(d.lado)}</td></tr>
      <tr><td class="sub">Zona</td><td>${escapeHtml(d.zona)}</td><td class="sub">Este</td><td>${escapeHtml(d.este)}</td><td class="sub">Norte</td><td>${escapeHtml(d.norte)}</td><td class="sub">Altitud</td><td colspan="3">${escapeHtml(d.altitud)}</td></tr>
      <tr><td class="sub">Descripción</td><td colspan="9">${escapeHtml(d.descripcion)}</td></tr>
      <tr><th>#</th><th>DE</th><th>A</th><th>TIPO</th><th>DESCRIPCIÓN DEL TERRENO</th><th>SUCS</th><th>MUESTRA/ENSAYO</th><th>GRANULOMETRÍA</th><th>PLASTICIDAD</th><th>HUMEDAD</th></tr>
      ${cortesRows || '<tr><td colspan="10">Sin cortes registrados</td></tr>'}
      <tr><td class="sub">Observaciones</td><td colspan="9">${escapeHtml(d.observaciones)}</td></tr>
    </table></body></html>`;
  }
  async function exportExcel(doc = null) {
    if (!doc) doc = saveForm();
    if (!doc) return;
    const filename = `${(doc.title || 'calicata').replace(/[^a-z0-9_-]+/gi,'_')}.xls`;
    const blob = new Blob([excelHtml(doc)], { type: 'application/vnd.ms-excel;charset=utf-8' });
    const file = new File([blob], filename, { type: blob.type });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: filename, text: 'Ficha exportada desde InGe+' });
        toast('Excel compartido');
        return;
      }
    } catch (e) { console.warn(e); }
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Excel generado');
  }

  function utmZone(lon) { return Math.floor((lon + 180.0) / 6.0) + 1; }
  function utmBand(lat) {
    const bands = 'CDEFGHJKLMNPQRSTUVWX';
    let idx = Math.floor((lat + 80.0) / 8.0);
    idx = Math.max(0, Math.min(19, idx));
    return bands.charAt(idx);
  }
  function latLonToUTM(latDeg, lonDeg) {
    const a = 6378137.0, f = 1.0 / 298.257223563, k0 = 0.9996;
    const e2 = f * (2.0 - f), ep2 = e2 / (1.0 - e2);
    const lat = latDeg * Math.PI / 180.0, lon = lonDeg * Math.PI / 180.0;
    const zone = utmZone(lonDeg), lon0 = (-183.0 + zone * 6.0) * Math.PI / 180.0;
    const sinLat = Math.sin(lat), cosLat = Math.cos(lat), tanLat = Math.tan(lat);
    const N = a / Math.sqrt(1.0 - e2 * sinLat * sinLat);
    const T = tanLat * tanLat, C = ep2 * cosLat * cosLat, A = cosLat * (lon - lon0);
    const e4 = e2 * e2, e6 = e4 * e2;
    const M = a * ((1.0 - e2/4.0 - 3.0*e4/64.0 - 5.0*e6/256.0) * lat
      - (3.0*e2/8.0 + 3.0*e4/32.0 + 45.0*e6/1024.0) * Math.sin(2.0*lat)
      + (15.0*e4/256.0 + 45.0*e6/1024.0) * Math.sin(4.0*lat)
      - (35.0*e6/3072.0) * Math.sin(6.0*lat));
    let easting = k0 * N * (A + (1.0 - T + C) * Math.pow(A,3)/6.0 + (5.0 - 18.0*T + T*T + 72.0*C - 58.0*ep2) * Math.pow(A,5)/120.0) + 500000.0;
    let northing = k0 * (M + N * tanLat * (A*A/2.0 + (5.0 - T + 9.0*C + 4.0*C*C) * Math.pow(A,4)/24.0 + (61.0 - 58.0*T + T*T + 600.0*C - 330.0*ep2) * Math.pow(A,6)/720.0));
    if (latDeg < 0) northing += 10000000.0;
    return { zone, band: utmBand(latDeg), e: easting, n: northing };
  }
  function updateGpsUI(pos) {
    const lat = pos.coords.latitude, lon = pos.coords.longitude, alt = pos.coords.altitude;
    const t = new Date();
    state.gps = { ...state.gps, lat, lon, alt, time: t };
    $('gps-lat').textContent = lat.toFixed(7);
    $('gps-lon').textContent = lon.toFixed(7);
    $('gps-alt').textContent = Number.isFinite(alt) ? `${alt.toFixed(2)} m` : '--';
    $('gps-time').textContent = t.toTimeString().slice(0, 8);
    const u = latLonToUTM(lat, lon);
    $('gps-utm').textContent = `Zona ${u.zone}${u.band} · E ${u.e.toFixed(2)} · N ${u.n.toFixed(2)}`;
    $('gps-status').textContent = 'GPS activo · coordenada recibida';
    updateMapUI(lat, lon);
  }
  async function toggleGps(on) {
    try {
      const nativeGeo = window.Capacitor?.Plugins?.Geolocation;
      const isNative = window.Capacitor?.isNativePlatform?.();

      if (on) {
        $('gps-status').textContent = 'Solicitando permiso de ubicación...';

        if (isNative && nativeGeo) {
          let perm = await nativeGeo.checkPermissions().catch(() => null);

          if (!perm || (perm.location !== 'granted' && perm.coarseLocation !== 'granted')) {
            perm = await nativeGeo.requestPermissions({ permissions: ['location'] });
          }

          if (perm.location !== 'granted' && perm.coarseLocation !== 'granted') {
            $('gps-status').textContent = 'Permiso de ubicación denegado.';
            $('gps-toggle').checked = false;
            return;
          }

          $('gps-status').textContent = 'Obteniendo coordenadas GPS...';

          const pos = await nativeGeo.getCurrentPosition({
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
          });

          updateGpsUI(pos);
            let gpsMap = null;
  let gpsMarker = null;

  function initGpsMap(lat, lon) {
    const mapEl = document.getElementById('gps-map');
    if (!mapEl || typeof L === 'undefined') return;

    gpsMap = L.map('gps-map', {
      zoomControl: true,
      attributionControl: true
    }).setView([lat, lon], 17);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap'
    }).addTo(gpsMap);

    gpsMarker = L.marker([lat, lon]).addTo(gpsMap);
    gpsMarker.bindPopup('Ubicación actual').openPopup();

    setTimeout(() => {
      gpsMap.invalidateSize();
    }, 500);
  }

  function updateMapUI(lat, lon) {
    const mapEl = document.getElementById('gps-map');
    if (!mapEl || typeof L === 'undefined') return;

    if (!gpsMap) {
      initGpsMap(lat, lon);
      return;
    }

    gpsMap.setView([lat, lon], 17);

    if (gpsMarker) {
      gpsMarker.setLatLng([lat, lon]);
    } else {
      gpsMarker = L.marker([lat, lon]).addTo(gpsMap);
    }

    setTimeout(() => {
      gpsMap.invalidateSize();
    }, 300);
  }

          state.gps.watchId = await nativeGeo.watchPosition(
            {
              enableHighAccuracy: true,
              timeout: 15000,
              maximumAge: 2000
            },
            function(position, err) {
              if (err) {
                gpsError(err);
                return;
              }
              if (position) updateGpsUI(position);
            }
          );

          state.gps.native = true;
          return;
        }

        if (!navigator.geolocation) {
          $('gps-status').textContent = 'Geolocalización no disponible.';
          $('gps-toggle').checked = false;
          return;
        }

        navigator.geolocation.getCurrentPosition(updateGpsUI, gpsError, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 0
        });

        state.gps.watchId = navigator.geolocation.watchPosition(updateGpsUI, gpsError, {
          enableHighAccuracy: true,
          timeout: 15000,
          maximumAge: 2000
        });

        state.gps.native = false;
      } else {
        if (state.gps.native && nativeGeo && state.gps.watchId != null) {
          await nativeGeo.clearWatch({ id: state.gps.watchId });
        } else if (state.gps.watchId != null && navigator.geolocation) {
          navigator.geolocation.clearWatch(state.gps.watchId);
        }

        state.gps.watchId = null;
        state.gps.native = false;
        $('gps-status').textContent = 'GPS desactivado';
      }
    } catch (err) {
      gpsError(err);
      $('gps-toggle').checked = false;
    }
  }

  function gpsError(err) {
    const msg = err?.message || err?.errorMessage || 'no se pudo obtener ubicación';
    $('gps-status').textContent = `GPS: ${msg}`;
    log(`GPS error: ${msg}`);
  }
  function openMaps() {
    if (!Number.isFinite(state.gps.lat) || !Number.isFinite(state.gps.lon)) return toast('Primero activa el GPS');
    const url = `https://maps.apple.com/?ll=${state.gps.lat},${state.gps.lon}`;
    window.open(url, '_blank');
  }
  async function checkInternet() {
    $('internet-status').textContent = 'Internet: verificando...';
    try { await fetch('https://www.gstatic.com/generate_204', { mode:'no-cors', cache:'no-store' }); $('internet-status').textContent = 'Internet: OK'; }
    catch (e) { $('internet-status').textContent = `Internet: error de red/SSL`; }
  }
  async function checkServer() {
    $('server-status').textContent = 'Servidor: verificando...';
    try {
      await supabaseFetch('/auth/v1/settings', { method:'GET' });
      $('server-status').textContent = 'Servidor Supabase: OK';
    } catch (e) { $('server-status').textContent = `Servidor: ${e.message}`; }
  }
  function exportLog() {
    const blob = new Blob([localStorage.getItem(STORE.log) || 'Sin log'], { type: 'text/plain' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'ingeplus_log.txt'; document.body.appendChild(a); a.click(); a.remove();
    toast('Log generado');
  }

  function bind() {
    $('btn-login').addEventListener('click', login);
    $('btn-local').addEventListener('click', localMode);
    $('btn-show-register').addEventListener('click', showRegisterView);
    $('btn-back-login').addEventListener('click', showLoginView);
    $('btn-register').addEventListener('click', register);
    $('btn-menu').addEventListener('click', openDrawer);
    $('btn-close-drawer').addEventListener('click', closeDrawer);
    $('drawer').addEventListener('click', e => { if (e.target.id === 'drawer') closeDrawer(); });
    $('btn-logout').addEventListener('click', logout);
    $('btn-profile-logout').addEventListener('click', logout);
    $('btn-profile-login').addEventListener('click', () => { $('main-screen').classList.remove('active'); $('auth-screen').classList.add('active'); });
    $('btn-about').addEventListener('click', () => alert(`${cfg.APP_NAME}\n${cfg.APP_VERSION}\n\nMigrado desde Qt Creator/QML a app híbrida iOS con Capacitor.`));
    $('btn-export-log').addEventListener('click', exportLog);
    qsa('.nav-btn').forEach(b => b.addEventListener('click', () => navigate(b.dataset.page)));
    qsa('.feature-card[data-open]').forEach(b => b.addEventListener('click', () => newCalicata(b.dataset.open)));
    $('btn-back-home').addEventListener('click', () => navigate('home'));
    $('btn-add-corte').addEventListener('click', () => addCorte(blankCorte(), true));
    $('btn-save-form').addEventListener('click', saveForm);
    $('btn-export-excel').addEventListener('click', () => exportExcel());
    $('btn-new-doc').addEventListener('click', () => newCalicata('calicata'));
    $('gps-toggle').addEventListener('change', e => toggleGps(e.target.checked));
    $('btn-use-gps-form').addEventListener('click', useGpsInForm);
    $('btn-open-maps').addEventListener('click', openMaps);
    $('btn-check-internet').addEventListener('click', checkInternet);
    $('btn-check-server').addEventListener('click', checkServer);
    $('login-password').addEventListener('keydown', e => { if (e.key === 'Enter') login(); });
    $('reg-password2').addEventListener('keydown', e => { if (e.key === 'Enter') register(); });
  }
  function init() {
    bind();
    $('f-fecha-inicio').value = todayISO();
    $('f-fecha-fin').value = todayISO();
    $('f-hora').value = timeHHMM();
    addCorte(blankCorte());
    updateSessionUI();
    if (state.session) showMain('home');
    log('App inicializada');
  }
  document.addEventListener('DOMContentLoaded', init);
})();
