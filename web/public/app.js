'use strict';

// The demo never calls write endpoints. Live mode exclusively uses the existing Express API.
const demoSeed = [
  { id: 101, title: 'Canastas de frutas frescas', description: 'Fruta de temporada lista para compartir con una comunidad.', quantity: 35, unit: 'kg', location: 'Monterrey, N.L.', donorId: 1, status: 'available', claimedBy: null, createdAt: '2026-09-26T10:00:00Z' },
  { id: 102, title: 'Pan artesanal del día', description: 'Piezas recién horneadas, perfectas para un comedor comunitario.', quantity: 60, unit: 'piezas', location: 'San Pedro Garza García', donorId: 2, status: 'available', claimedBy: null, createdAt: '2026-09-26T08:00:00Z' },
  { id: 103, title: 'Útiles para volver a clases', description: 'Cuadernos, lápices y material escolar en buen estado.', quantity: 25, unit: 'kits', location: 'Guadalupe, N.L.', donorId: 3, status: 'available', claimedBy: null, createdAt: '2026-09-25T12:00:00Z' },
  { id: 104, title: 'Verduras de temporada', description: 'Productos variados disponibles para una organización local.', quantity: 40, unit: 'kg', location: 'Monterrey, N.L.', donorId: 1, status: 'claimed', claimedBy: 8, createdAt: '2026-09-24T12:00:00Z' },
  { id: 105, title: 'Ropa de invierno', description: 'Chamarras y suéteres limpios, listos para una segunda vida.', quantity: 18, unit: 'prendas', location: 'Apodaca, N.L.', donorId: 4, status: 'delivered', claimedBy: 9, createdAt: '2026-09-23T12:00:00Z' },
  { id: 106, title: 'Productos de despensa', description: 'Alimentos no perecederos para apoyo comunitario.', quantity: 30, unit: 'paquetes', location: 'Santa Catarina, N.L.', donorId: 2, status: 'available', claimedBy: null, createdAt: '2026-09-22T12:00:00Z' }
];
const state = { mode: 'demo', apiOnline: false, token: null, user: null, demoRole: 'donor', donations: demoSeed.map(d => ({ ...d })), query: '', filter: 'all', busy: false };
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];
const escapeHTML = (value) => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
const label = { available: 'Disponible', claimed: 'Apartada', delivered: 'Entregada', expired: 'Expirada' };
const demoSummary = { total: 128, available: 27, claimed: 15, delivered: 86, expired: 0, uniqueDonors: 24, uniqueBeneficiaries: 19, deliveryRate: '67.2%' };
const category = (title) => {
  const t = (title || '').toLowerCase();
  if (/pan|galleta|harina/.test(t)) return { name: 'Panadería', emoji: '🥖', bg: '#fff0e4', ring: '#f8ddc7', mark: '#f6d8bb' };
  if (/fruta|verdura|alimento|despensa|comida/.test(t)) return { name: 'Alimentos', emoji: '🥬', bg: '#edf8e6', ring: '#d7ebd0', mark: '#c0e6b1' };
  if (/libro|útil|escolar|cuaderno/.test(t)) return { name: 'Educación', emoji: '📚', bg: '#ecf0fd', ring: '#d9e0fb', mark: '#c2d0f0' };
  if (/ropa|chamarra|suéter|prenda/.test(t)) return { name: 'Ropa', emoji: '🧥', bg: '#fff0f4', ring: '#f6dce5', mark: '#f0c6d8' };
  return { name: 'Recursos', emoji: '📦', bg: '#eaf8f3', ring: '#d3eae0', mark: '#bae2d4' };
};
function toast(message, error = false) {
  const el = $('#toast'); el.textContent = message; el.classList.toggle('error', error); el.classList.add('show');
  clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove('show'), 3900);
}
function modal(markup) {
  $('#modal-body').innerHTML = markup; $('#modal-layer').hidden = false;
  document.body.style.overflow = 'hidden';
  const target = $('#modal-body input, #modal-body button'); if (target) target.focus();
}
function closeModal() { $('#modal-layer').hidden = true; document.body.style.overflow = ''; $('#modal-body').innerHTML = ''; }
function modalHeader(kicker, title, description) { return '<div class="modal-kicker">' + kicker + '</div><h2 id="modal-title">' + title + '</h2><p>' + description + '</p>'; }
function statusOf(donations) {
  const summary = { total: donations.length, available: 0, claimed: 0, delivered: 0, expired: 0, uniqueDonors: new Set(donations.map(d => d.donorId)).size, uniqueBeneficiaries: new Set(donations.filter(d => d.claimedBy != null).map(d => d.claimedBy)).size };
  donations.forEach(d => { if (summary[d.status] !== undefined) summary[d.status]++; });
  summary.deliveryRate = summary.total ? (summary.delivered / summary.total * 100).toFixed(1) + '%' : '0.0%';
  return summary;
}
function renderSummary(summary) {
  $('#stat-total').textContent = summary.total;
  $('#stat-delivered').textContent = summary.delivered;
  $('#stat-organizations').textContent = summary.uniqueDonors;
  $('#impact-total').textContent = summary.total;
  $('#impact-rate').textContent = summary.deliveryRate;
  $('#impact-progress').style.width = Math.min(100, Math.max(0, parseFloat(summary.deliveryRate) || 0)) + '%';
  $('#impact-pending').textContent = summary.available + summary.claimed;
  $('#impact-donors').textContent = summary.uniqueDonors;
  $('#impact-beneficiaries').textContent = summary.uniqueBeneficiaries;
}
function renderChrome() {
  const live = state.mode === 'live';
  $('#connection-status').innerHTML = '<span class="connection-dot"></span> ' + (live ? 'API conectada' : state.apiOnline ? 'API disponible' : 'Vista demo');
  $('#connection-status').classList.toggle('is-live', live);
  $('#data-label').textContent = live ? '● Datos del servidor' : '● Datos ilustrativos';
  $('#demo-strip').innerHTML = live
    ? '<span class="demo-pill">✓ CONECTADO A API</span><p>Hola, ' + escapeHTML(state.user?.name) + '. Estás viendo los datos reales de tu servidor. Rol: ' + (state.user?.role === 'beneficiary' ? 'organización' : state.user?.role === 'admin' ? 'administrador' : 'donante') + '.</p><button type="button" class="demo-connect" data-action="logout">Cerrar sesión ↗</button>'
    : '<span class="demo-pill">✳ VISTA DE DEMOSTRACIÓN</span><p>Datos de ejemplo y acciones simuladas; nada se guarda en tu servidor. Rol demo: ' + (state.demoRole === 'donor' ? 'donante' : 'organización') + '.</p><button type="button" class="demo-connect" data-action="connect">Conectar con mi API ↗</button>';
  $('#account-btn').innerHTML = (live ? escapeHTML(state.user?.name || 'Mi cuenta') : 'Mi cuenta') + ' <span aria-hidden="true">↗</span>';
  $('#impact-disclaimer').textContent = live ? (state.user?.role === 'admin' ? 'Informe del backend' : 'Cálculo a partir del listado real') : 'Cifras ilustrativas de esta demostración';
}
function renderCards() {
  const filtered = state.donations.filter(d => (state.filter === 'all' || d.status === state.filter) && [d.title,d.description,d.location].join(' ').toLowerCase().includes(state.query.toLowerCase()));
  $('#results-label').textContent = filtered.length + (filtered.length === 1 ? ' donación encontrada' : ' donaciones encontradas');
  $('#empty-state').hidden = filtered.length !== 0;
  $('#donations-grid').innerHTML = filtered.map(d => {
    const c = category(d.title); const status = d.status || 'available';
    return '<article class="donation-card"><div class="donation-visual" style="--tone-bg:' + c.bg + ';--tone-ring:' + c.ring + ';--tone-mark:' + c.mark + '"><span class="card-state ' + escapeHTML(status) + '">' + (label[status] || 'Registrada') + '</span><span class="donation-emoji" aria-hidden="true">' + c.emoji + '</span><span class="visual-mark">✳</span></div><div class="donation-content"><span class="donation-category">' + c.name + '</span><h3>' + escapeHTML(d.title) + '</h3><p class="donation-desc">' + escapeHTML(d.description || 'Una nueva oportunidad de compartir.') + '</p><div class="donation-info"><span><b>⌾</b> ' + escapeHTML(d.location || 'Ubicación por confirmar') + '</span><span><b>▣</b> ' + escapeHTML(d.quantity) + ' ' + escapeHTML(d.unit || 'unidades') + '</span></div><div class="donation-bottom"><small>' + (state.mode === 'demo' ? 'Ejemplo ilustrativo' : 'Publicación #' + escapeHTML(d.id)) + '</small><button class="text-button" data-action="detail" data-id="' + escapeHTML(d.id) + '">Ver detalles ↗</button></div></div></article>';
  }).join('');
  $$('.chip').forEach(chip => { const selected = chip.dataset.filter === state.filter; chip.classList.toggle('active', selected); chip.setAttribute('aria-pressed', String(selected)); });
}
function demoMetrics() {
  // Editorial demo baseline plus only the interactions made during this preview.
  const summary = { ...demoSummary };
  const original = new Map(demoSeed.map(d => [d.id, d]));
  for (const donation of state.donations) {
    const previous = original.get(donation.id);
    if (!previous) { summary.total++; summary[donation.status]++; }
    else if (previous.status !== donation.status) { summary[previous.status]--; summary[donation.status]++; }
  }
  summary.deliveryRate = (summary.delivered / summary.total * 100).toFixed(1) + '%';
  return summary;
}
function render() { renderChrome(); renderSummary(state.mode === 'demo' ? demoMetrics() : statusOf(state.donations)); renderCards(); }
async function api(path, options = {}) {
  const headers = { accept: 'application/json' };
  if (options.body) headers['content-type'] = 'application/json';
  if (state.token) headers.authorization = 'Bearer ' + state.token;
  let response;
  try { response = await fetch(path, { ...options, headers: { ...headers, ...(options.headers || {}) }, cache: 'no-store' }); }
  catch (_) { throw new Error('No hay conexión con el servidor. Comprueba que esté encendido.'); }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401 && state.mode === 'live' && (data.error === 'Token expired' || data.error === 'Invalid token')) {
      logout(false); throw new Error('Tu sesión expiró. Vuelve a iniciar sesión.');
    }
    const errors = { 'Invalid credentials': 'El correo o la contraseña no son correctos.', 'Email already registered': 'Este correo ya está registrado.', 'Insufficient permissions': 'Tu rol no tiene permiso para esta acción.', 'Donation is not available': 'Esta donación ya no está disponible.', 'Donation is not claimed yet': 'La donación todavía no está apartada.', 'BACKEND_NOT_CONFIGURED': 'Configura BACKEND_ORIGIN en Wrangler.', 'BACKEND_UNAVAILABLE': 'El servidor Express no está disponible.' };
    throw new Error(errors[data.error] || errors[data.code] || data.error || 'Error del servidor (' + response.status + ').');
  }
  return data;
}
async function health() {
  try { const response = await fetch('/health', { cache: 'no-store' }); const data = await response.json(); state.apiOnline = response.ok && data.status === 'ok'; }
  catch (_) { state.apiOnline = false; }
  renderChrome();
}
async function refreshLive() {
  if (state.mode !== 'live') return;
  try {
    const donations = await api('/api/donations'); state.donations = Array.isArray(donations) ? donations : [];
    render();
    if (state.user?.role === 'admin') {
      const impact = await api('/api/reports/impact'); if (impact.summary) renderSummary(impact.summary);
    } else if (state.user?.role === 'donor') {
      // The backend's donorId query compares string and number; use the documented donor report instead.
      await api('/api/reports/donor/' + encodeURIComponent(state.user.id));
    }
  } catch (error) { toast(error.message, true); render(); }
}
function authModal(register = false) {
  const fields = (register ? '<label class="field">Tu nombre<input name="name" type="text" required maxlength="90" autocomplete="name" placeholder="¿Cómo te llamas?" /></label>' : '')
    + '<label class="field">Correo electrónico<input name="email" type="email" required autocomplete="email" placeholder="hola@ejemplo.com" /></label>'
    + '<label class="field">Contraseña<input name="password" type="password" minlength="6" required autocomplete="' + (register ? 'new-password' : 'current-password') + '" placeholder="Mínimo 6 caracteres" /></label>'
    + (register ? '<label class="field">Quiero participar como<select name="role"><option value="donor">Donante (publicar donaciones)</option><option value="beneficiary">Organización (apartar donaciones)</option></select></label>' : '');
  modal(modalHeader('✳ BIENVENIDO A DONA MÁS', register ? 'Hagamos algo bueno juntos.' : 'Qué gusto verte de nuevo.', register ? 'Crea una cuenta en tu servidor para empezar a conectar.' : 'Inicia sesión para usar las operaciones reales de Dona Más.')
    + '<form id="auth-form" data-kind="' + (register ? 'register' : 'login') + '">' + fields + '<button class="btn btn-primary" type="submit">' + (register ? 'Crear cuenta' : 'Iniciar sesión') + ' ↗</button></form>'
    + '<div class="modal-switch">' + (register ? '¿Ya tienes cuenta? <button type="button" data-action="login">Inicia sesión</button>' : '¿Aún no tienes cuenta? <button type="button" data-action="register">Regístrate</button>') + '</div>'
    + '<div class="modal-note" style="margin-top:15px">El servidor almacena las cuentas en memoria y puede perderlas al reiniciarse. Esta interfaz no guarda tu contraseña ni el token de renovación.</div>');
}
function accountModal() {
  if (state.mode !== 'live') { authModal(false); return; }
  modal(modalHeader('✳ TU ESPACIO', 'Hola, ' + escapeHTML(state.user.name) + '.', 'Sesión conectada a tu backend Express.')
    + '<div class="details-list"><div><strong>Correo</strong><span>' + escapeHTML(state.user.email) + '</span></div><div><strong>Rol</strong><span>' + escapeHTML(state.user.role) + '</span></div><div><strong>ID</strong><span>#' + escapeHTML(state.user.id) + '</span></div></div><div class="modal-actions"><button type="button" class="btn btn-primary" data-action="create">Publicar una donación ↗</button><button type="button" class="btn btn-outline" data-action="logout">Cerrar sesión</button></div>');
}
function connectModal() {
  if (state.mode === 'live') { accountModal(); return; }
  modal(modalHeader('✳ ELIGE CÓMO EXPLORAR', 'Hagamos la diferencia.', 'Puedes explorar la simulación o entrar a tu API real con tu cuenta.')
    + '<div class="modal-note">Servidor: <strong>' + (state.apiOnline ? 'Disponible ✓' : 'No conectado o sin configurar') + '</strong>. Las acciones demo no escriben datos reales.</div>'
    + '<div class="modal-actions"><button type="button" class="btn btn-primary" data-action="login">Conectar con mi API ↗</button><button type="button" class="btn btn-outline" data-action="register">Crear cuenta</button></div><div class="modal-switch">Explorar como: <button type="button" data-action="demo-donor">Donante</button> · <button type="button" data-action="demo-beneficiary">Organización</button></div>');
}
function createModal() {
  const role = state.mode === 'demo' ? state.demoRole : state.user?.role;
  if (state.mode === 'live' && !state.user) { authModal(); return; }
  if (role === 'beneficiary') { toast('Las organizaciones pueden apartar donaciones; para publicar, entra como donante.', true); return; }
  modal(modalHeader('✳ COMPARTE ALGO BUENO', 'Publicar una donación.', 'Cuéntanos lo que puedes compartir. ' + (state.mode === 'demo' ? 'Esta publicación solo existirá en la demo.' : 'Se registrará en tu servidor.'))
    + '<form id="create-form"><label class="field">¿Qué quieres donar?<input name="title" maxlength="100" required placeholder="Ej. Canastas de fruta fresca" /></label><label class="field">Descripción<textarea name="description" maxlength="400" rows="3" placeholder="Detalles que puedan ayudar..."></textarea></label><div class="form-grid"><label class="field">Cantidad<input name="quantity" type="number" min="1" step="1" required placeholder="10" /></label><label class="field">Unidad<input name="unit" maxlength="25" placeholder="kg, cajas, piezas..." /></label></div><label class="field">Ubicación<input name="location" maxlength="120" placeholder="Ej. Monterrey, N.L." /></label><label class="field">Disponible hasta (opcional)<input name="expiresAt" type="date" /></label><button type="submit" class="btn btn-primary">Publicar donación ↗</button></form>');
}
function detailModal(id) {
  const d = state.donations.find(item => String(item.id) === String(id)); if (!d) { toast('Esta donación ya no aparece en la lista.', true); return; }
  const role = state.mode === 'demo' ? state.demoRole : state.user?.role;
  const mine = state.mode === 'demo' ? d.donorId === 1 : d.donorId === state.user?.id;
  const claimable = d.status === 'available' && (role === 'beneficiary' || role === 'admin');
  const deliverable = d.status === 'claimed' && (role === 'admin' || (role === 'donor' && mine));
  const action = claimable ? '<button class="btn btn-primary" data-action="claim" data-id="' + escapeHTML(d.id) + '">Apartar donación ↗</button>' : deliverable ? '<button class="btn btn-primary" data-action="deliver" data-id="' + escapeHTML(d.id) + '">Confirmar entrega ✓</button>' : '';
  modal(modalHeader('✳ DETALLES DE LA DONACIÓN', escapeHTML(d.title), escapeHTML(d.description || 'Una nueva oportunidad de compartir.'))
    + '<div class="details-list"><div><strong>Estado</strong><span>' + (label[d.status] || 'Registrada') + '</span></div><div><strong>Cantidad</strong><span>' + escapeHTML(d.quantity) + ' ' + escapeHTML(d.unit) + '</span></div><div><strong>Ubicación</strong><span>' + escapeHTML(d.location || 'Por confirmar') + '</span></div><div><strong>Donante</strong><span>#' + escapeHTML(d.donorId) + '</span></div>' + (d.expiresAt ? '<div><strong>Disponible hasta</strong><span>' + escapeHTML(new Date(d.expiresAt).toLocaleDateString('es-MX')) + '</span></div>' : '') + '</div>'
    + '<div class="modal-note">' + (state.mode === 'demo' ? 'Simulación: los cambios no llegarán al servidor.' : 'Operación real: se respetarán los permisos y validaciones del backend.') + '</div><div class="modal-actions">' + action + (state.mode === 'demo' ? '<button class="btn btn-outline" data-action="demo-role">Cambiar rol demo</button>' : '') + (state.mode === 'demo' ? '<button class="btn btn-outline" data-action="login">Conectar API</button>' : '') + '</div>');
}
function logout(showToast = true) { state.mode = 'demo'; state.token = null; state.user = null; state.donations = demoSeed.map(d => ({ ...d })); render(); closeModal(); if (showToast) toast('Sesión cerrada. Volviste a la demostración.'); }
async function performDonation(action, id) {
  if (state.busy) return;
  const d = state.donations.find(item => String(item.id) === String(id)); if (!d) return;
  if (state.mode === 'demo') {
    if (action === 'claim' && d.status === 'available' && state.demoRole === 'beneficiary') { d.status = 'claimed'; d.claimedBy = 20; }
    else if (action === 'deliver' && d.status === 'claimed' && state.demoRole === 'donor' && d.donorId === 1) { d.status = 'delivered'; }
    else { toast('Cambia al rol correspondiente para esta acción.', true); return; }
    render(); closeModal(); toast('¡Listo! Cambio realizado solo en la demostración.'); return;
  }
  try { state.busy = true; await api('/api/donations/' + encodeURIComponent(id) + '/' + action, { method: 'POST' }); closeModal(); toast(action === 'claim' ? 'Donación apartada en tu servidor.' : 'Entrega confirmada en tu servidor.'); await refreshLive(); }
  catch (error) { toast(error.message, true); }
  finally { state.busy = false; }
}
async function handleSubmit(form) {
  if (state.busy) return;
  const values = Object.fromEntries(new FormData(form).entries());
  try {
    state.busy = true; const submit = form.querySelector('[type="submit"]'); submit.disabled = true;
    if (form.id === 'auth-form') {
      if (form.dataset.kind === 'register') await api('/api/auth/register', { method: 'POST', body: JSON.stringify({ name: values.name, email: values.email, password: values.password, role: values.role }) });
      const result = await api('/api/auth/login', { method: 'POST', body: JSON.stringify({ email: values.email, password: values.password }) });
      if (!result.accessToken || !result.user) throw new Error('Respuesta de sesión incompleta.');
      state.mode = 'live'; state.token = result.accessToken; state.user = result.user; state.donations = []; closeModal(); render(); toast('¡Bienvenido! Conectado a tu API.'); await refreshLive();
    } else if (form.id === 'create-form') {
      const donation = { title: values.title.trim(), description: values.description.trim(), quantity: Number(values.quantity), unit: values.unit.trim() || 'unidades', location: values.location.trim(), expiresAt: values.expiresAt ? new Date(values.expiresAt + 'T23:59:59').toISOString() : undefined };
      if (!Number.isFinite(donation.quantity) || donation.quantity <= 0) throw new Error('Introduce una cantidad válida.');
      if (state.mode === 'demo') { state.donations.unshift({ ...donation, id: Date.now(), donorId: 1, status: 'available', claimedBy: null, createdAt: new Date().toISOString() }); render(); closeModal(); toast('¡Publicado en la simulación!'); }
      else { await api('/api/donations', { method: 'POST', body: JSON.stringify(donation) }); closeModal(); toast('¡Donación registrada en tu servidor!'); await refreshLive(); }
    }
  } catch (error) { toast(error.message, true); }
  finally { state.busy = false; const submit = form.querySelector('[type="submit"]'); if (submit?.isConnected) submit.disabled = false; }
}
document.addEventListener('click', async (event) => {
  const button = event.target.closest('[data-action]'); if (!button) return;
  const action = button.dataset.action; const id = button.dataset.id;
  if (action === 'close-modal') closeModal();
  else if (action === 'auth') accountModal();
  else if (action === 'connect' || action === 'demo-role') connectModal();
  else if (action === 'register') authModal(true);
  else if (action === 'login') authModal(false);
  else if (action === 'logout') logout();
  else if (action === 'create') { if (state.mode === 'demo' && state.demoRole === 'beneficiary') { connectModal(); toast('Cambia a donante para publicar en la simulación.'); } else createModal(); }
  else if (action === 'detail') detailModal(id);
  else if (action === 'claim' || action === 'deliver') await performDonation(action, id);
  else if (action === 'demo-donor' || action === 'demo-beneficiary') { state.demoRole = action === 'demo-donor' ? 'donor' : 'beneficiary'; closeModal(); render(); toast('Modo de demostración: ' + (state.demoRole === 'donor' ? 'donante.' : 'organización.')); }
  else if (action === 'reset-filters') { state.query = ''; state.filter = 'all'; $('#search-input').value = ''; renderCards(); }
});
document.addEventListener('submit', event => { if (event.target.matches('#auth-form, #create-form')) { event.preventDefault(); handleSubmit(event.target); } });
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#modal-layer').hidden) closeModal(); });
$('#search-input').addEventListener('input', event => { state.query = event.target.value.trim(); renderCards(); });
$$('.chip').forEach(chip => chip.addEventListener('click', () => { state.filter = chip.dataset.filter; renderCards(); }));
$('#year').textContent = new Date().getFullYear(); render(); health();
