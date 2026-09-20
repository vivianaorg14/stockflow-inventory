// public/app.js — UI de StockFlow. Sin framework: fetch a /api y renderizado directo.
// La UI no valida reglas de negocio: envía y muestra el error que devuelva la API.

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

const CLAVE_STORAGE = 'stockflow_token';

let catalogo = { productos: [], bodegas: [] };

let sesionActual = {
  token: null,
  usuario: null
};

// ---------- infraestructura ----------

async function api(ruta, opciones = {}) {
  const headers = { 'Content-Type': 'application/json', ...(opciones.headers || {}) };
  if (sesionActual.token) {
    headers['Authorization'] = `Bearer ${sesionActual.token}`;
  }
  const respuesta = await fetch(`/api${ruta}`, {
    headers,
    ...opciones,
    body: opciones.body ? JSON.stringify(opciones.body) : undefined
  });
  if (respuesta.status === 401 && sesionActual.token) {
    cerrarSesion();
    throw new Error('Sesión expirada o inválida. Inicie sesión nuevamente.');
  }
  const cuerpo = respuesta.status === 204 ? null : await respuesta.json();
  if (!respuesta.ok) throw new Error(cuerpo?.error || `HTTP ${respuesta.status}`);
  return cuerpo;
}

function mostrarLogin(mensajeError = null) {
  const pantallaLogin = $('#pantalla-login');
  const main = $('main');
  const nav = $('header nav');
  const panelSesion = $('#panel-sesion');
  const errorBox = $('#error-login');

  if (pantallaLogin) pantallaLogin.classList.remove('oculto');
  if (main) main.classList.add('oculto');
  if (nav) nav.classList.add('oculto');
  if (panelSesion) panelSesion.classList.add('oculto');

  if (errorBox) {
    if (mensajeError) {
      errorBox.textContent = mensajeError;
      errorBox.classList.remove('oculto');
    } else {
      errorBox.classList.add('oculto');
    }
  }
}

function mostrarAplicacion() {
  const pantallaLogin = $('#pantalla-login');
  const main = $('main');
  const nav = $('header nav');
  const panelSesion = $('#panel-sesion');

  if (pantallaLogin) pantallaLogin.classList.add('oculto');
  if (main) main.classList.remove('oculto');
  if (nav) nav.classList.remove('oculto');
  if (panelSesion) panelSesion.classList.remove('oculto');
}

async function iniciarSesion(username, password) {
  const data = await api('/auth/login', {
    method: 'POST',
    body: { username, password }
  });
  sesionActual = {
    token: data.token,
    usuario: data.usuario
  };
  sessionStorage.setItem(CLAVE_STORAGE, data.token);
  mostrarAplicacion();
  actualizarUIUsuario();
  return sesionActual;
}

function cerrarSesion() {
  sesionActual = { token: null, usuario: null };
  sessionStorage.removeItem(CLAVE_STORAGE);
  mostrarLogin();
}

function actualizarUIUsuario() {
  const badge = $('#badge-sesion');
  const nombreSpan = $('#nombre-usuario');
  if (!sesionActual.usuario) return;

  if (nombreSpan) {
    nombreSpan.textContent = sesionActual.usuario.nombre || sesionActual.usuario.username;
  }

  const esMayor = sesionActual.usuario.rol === 'supervisor_mayor';
  if (badge) {
    badge.textContent = esMayor ? '👑 Mayor' : `🏢 Menor (${sesionActual.usuario.bodega?.nombre || 'Bodega ' + sesionActual.usuario.bodega_id})`;
    badge.className = `badge-sesion ${esMayor ? 'mayor' : 'menor'}`;
  }

  // Dashboard analítico: exclusivo para supervisor_mayor
  const btnDashboard = $('#btn-pestana-dashboard');
  if (btnDashboard) {
    btnDashboard.style.display = esMayor ? '' : 'none';
  }

  // Ocultar creación de pedidos si es supervisor menor
  const formPedido = $('#form-pedido');
  if (formPedido) {
    formPedido.style.display = esMayor ? 'flex' : 'none';
    const tituloNuevo = formPedido.previousElementSibling;
    if (tituloNuevo && tituloNuevo.tagName === 'H2') tituloNuevo.style.display = esMayor ? 'block' : 'none';
  }

  // Ocultar pestaña Auditoría para supervisor_menor (exclusivo mayor)
  const btnAuditoria = $('nav button[data-pestana="auditoria"]');
  if (btnAuditoria) {
    btnAuditoria.style.display = esMayor ? '' : 'none';
  }

  // Ocultar selector de bodega en existencias para supervisor_menor
  const contenedorFiltro = $('#filtro-bodega');
  if (contenedorFiltro) {
    const labelFiltro = contenedorFiltro.closest('label');
    if (labelFiltro) labelFiltro.style.display = esMayor ? '' : 'none';
  }

  // Movimientos: supervisor_mayor NO puede registrar movimientos (solo menor)
  const bloqueMovimiento = $('#bloque-crear-movimiento');
  if (bloqueMovimiento) {
    bloqueMovimiento.style.display = esMayor ? 'none' : 'block';
  }

  // Catálogo: supervisor_mayor NO puede crear productos (solo menor)
  const bloqueProducto = $('#bloque-crear-producto');
  if (bloqueProducto) {
    bloqueProducto.style.display = esMayor ? 'none' : 'block';
  }
}

function avisar(mensaje, esError = true) {
  const aviso = $('#aviso');
  aviso.textContent = mensaje;
  aviso.classList.toggle('ok', !esError);
  aviso.classList.remove('oculto');
  clearTimeout(avisar.temporizador);
  avisar.temporizador = setTimeout(() => aviso.classList.add('oculto'), 5000);
}

// Ejecuta una acción de la API y refresca la pestaña activa; muestra el error si falla.
async function ejecutar(accion, mensajeOk) {
  try {
    await accion();
    if (mensajeOk) avisar(mensajeOk, false);
    await refrescarPestanaActiva();
  } catch (error) {
    avisar(error.message);
  }
}

function datosDeFormulario(formulario) {
  const datos = {};
  for (const [clave, valor] of new FormData(formulario)) {
    if (valor !== '') datos[clave] = valor;
  }
  // FormData ignora elementos disabled por especificación HTML estándar.
  // Los capturamos explícitamente para campos bloqueados como bodega fija:
  for (const el of formulario.querySelectorAll('input[disabled], select[disabled], textarea[disabled]')) {
    if (el.name && el.value !== '' && datos[el.name] === undefined) {
      datos[el.name] = el.value;
    }
  }
  for (const campo of ['producto_id', 'bodega_origen_id', 'bodega_destino_id', 'cantidad']) {
    if (datos[campo] !== undefined) datos[campo] = Number(datos[campo]);
  }
  return datos;
}

function opciones(lista, etiqueta, vacio = '') {
  const primera = vacio ? `<option value="">${vacio}</option>` : '';
  return primera + lista.map(e => `<option value="${e.id}">${escapar(etiqueta(e))}</option>`).join('');
}

function escapar(texto) {
  return String(texto ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let existenciasCache = [];
let graficosInstancias = {};

function destruirGraficos() {
  for (const key of Object.keys(graficosInstancias)) {
    if (graficosInstancias[key]) {
      graficosInstancias[key].destroy();
      delete graficosInstancias[key];
    }
  }
}

// ---------- catálogo compartido ----------

async function cargarCatalogo() {
  const [productos, bodegas, existencias] = await Promise.all([
    api('/productos'),
    api('/bodegas'),
    api('/inventario/existencias').catch(() => [])
  ]);
  catalogo = { productos, bodegas };
  existenciasCache = existencias;
  const htmlProductos = opciones(productos, p => `${p.sku} — ${p.nombre}${p.estado === 'DESCONTINUADO' ? ' (descontinuado)' : ''}`);
  const htmlBodegas = opciones(bodegas, b => b.nombre);
  $$('.select-producto').forEach(s => { s.innerHTML = htmlProductos; });
  $$('.select-bodega').forEach(s => { s.innerHTML = htmlBodegas; });
  $('#filtro-bodega').innerHTML = opciones(bodegas, b => b.nombre, 'Todas');
}

// ---------- pestañas ----------

const renderizadores = {
  dashboard: renderizarDashboard,
  existencias: renderizarExistencias,
  movimientos: renderizarMovimientos,
  pedidos: renderizarPedidos,
  auditoria: renderizarAuditoria,
  catalogo: renderizarCatalogo
};

function pestanaActiva() {
  return $('nav button.activa')?.dataset.pestana || 'existencias';
}

async function refrescarPestanaActiva() {
  await cargarCatalogo();
  await renderizadores[pestanaActiva()]();
}

function activarPestana(nombre) {
  const esMayor = sesionActual.usuario && sesionActual.usuario.rol === 'supervisor_mayor';
  if (nombre === 'dashboard' && !esMayor) {
    avisar('Acceso denegado: el Dashboard es exclusivo del Supervisor Mayor');
    nombre = 'existencias';
  }
  if (nombre === 'auditoria' && !esMayor) {
    avisar('Acceso denegado: la auditoría es exclusiva del Supervisor Mayor');
    nombre = 'existencias';
  }
  $$('nav button').forEach(b => b.classList.toggle('activa', b.dataset.pestana === nombre));
  $$('.pestana').forEach(s => s.classList.toggle('oculto', s.id !== nombre));
  refrescarPestanaActiva().catch(e => avisar(e.message));
}

// ---------- dashboard analítico (exclusivo supervisor_mayor) ----------

async function renderizarDashboard() {
  const esMayor = sesionActual.usuario && sesionActual.usuario.rol === 'supervisor_mayor';
  if (!esMayor) {
    avisar('Acceso denegado: El dashboard es exclusivo del Supervisor Mayor');
    activarPestana('existencias');
    return;
  }

  const [existencias, movimientos] = await Promise.all([
    api('/inventario/existencias'),
    api('/movimientos')
  ]);

  destruirGraficos();

  const bodegas = catalogo.bodegas;
  const nombresBodegas = bodegas.map(b => b.nombre);
  const idsBodegas = bodegas.map(b => b.id);

  // 1. Existencias actuales por bodega
  const stockPorBodega = idsBodegas.map(id => {
    return existencias
      .filter(e => Number(e.bodega_id) === Number(id))
      .reduce((sum, e) => sum + Number(e.cantidad_actual), 0);
  });

  const ctxStock = $('#grafico-existencias');
  if (ctxStock && window.Chart) {
    graficosInstancias['stock'] = new window.Chart(ctxStock, {
      type: 'bar',
      data: {
        labels: nombresBodegas,
        datasets: [{
          label: 'Unidades en stock',
          data: stockPorBodega,
          backgroundColor: ['#1f4e79', '#2563eb', '#38bdf8'],
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true } }
      }
    });
  }

  // 2. Movimientos recientes por bodega (Entradas vs Salidas)
  const entradasPorBodega = idsBodegas.map(id => {
    return movimientos
      .filter(m => (m.tipo === 'ENTRADA' && Number(m.bodega_destino_id) === Number(id)) ||
                   (m.tipo === 'AJUSTE' && m.sentido === 'ENTRADA' && Number(m.bodega_destino_id) === Number(id)))
      .reduce((sum, m) => sum + Number(m.cantidad), 0);
  });

  const salidasPorBodega = idsBodegas.map(id => {
    return movimientos
      .filter(m => (m.tipo === 'SALIDA' && Number(m.bodega_origen_id) === Number(id)) ||
                   (m.tipo === 'AJUSTE' && m.sentido === 'SALIDA' && Number(m.bodega_origen_id) === Number(id)))
      .reduce((sum, m) => sum + Number(m.cantidad), 0);
  });

  const ctxMovs = $('#grafico-movimientos');
  if (ctxMovs && window.Chart) {
    graficosInstancias['movs'] = new window.Chart(ctxMovs, {
      type: 'bar',
      data: {
        labels: nombresBodegas,
        datasets: [
          {
            label: 'Entradas acumuladas',
            data: entradasPorBodega,
            backgroundColor: '#10b981',
            borderRadius: 4
          },
          {
            label: 'Salidas acumuladas',
            data: salidasPorBodega,
            backgroundColor: '#ef4444',
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: { y: { beginAtZero: true } }
      }
    });
  }
}

// ---------- existencias ----------

async function renderizarExistencias() {
  const filtro = $('#filtro-bodega').value;
  const filas = await api('/inventario/existencias');
  $('#tabla-existencias').innerHTML = filas
    .filter(f => !filtro || String(f.bodega_id) === filtro)
    .map(f => `
      <tr class="${f.bajo_minimo ? 'bajo-minimo' : ''}">
        <td>${escapar(f.producto)}</td><td>${escapar(f.sku)}</td><td>${escapar(f.estado_producto)}</td>
        <td>${escapar(f.bodega)}</td><td>${f.cantidad_actual}</td><td>${f.minimo}</td>
        <td><button class="secundario" data-accion="minimo" data-producto="${f.producto_id}" data-bodega="${f.bodega_id}" data-actual="${f.minimo}">Editar mínimo</button></td>
      </tr>`).join('') || '<tr><td colspan="7">Sin existencias registradas</td></tr>';
}

$('#tabla-existencias').addEventListener('click', (evento) => {
  const boton = evento.target.closest('button[data-accion="minimo"]');
  if (!boton) return;
  const nuevo = prompt('Nuevo mínimo:', boton.dataset.actual);
  if (nuevo === null) return;
  ejecutar(() => api(`/inventario/existencias/${boton.dataset.producto}/${boton.dataset.bodega}/minimo`, { method: 'PUT', body: { minimo: Number(nuevo) } }), 'Mínimo actualizado');
});

$('#filtro-bodega').addEventListener('change', () => renderizarExistencias().catch(e => avisar(e.message)));

// ---------- movimientos ----------

function ajustarCamposMovimiento() {
  const tipo = $('#form-movimiento [name=tipo]').value;
  const sentido = $('#form-movimiento [name=sentido]').value;
  const usaOrigen = tipo === 'SALIDA' || tipo === 'TRASLADO' || (tipo === 'AJUSTE' && sentido === 'SALIDA');
  const usaDestino = tipo === 'ENTRADA' || tipo === 'TRASLADO' || (tipo === 'AJUSTE' && sentido === 'ENTRADA');
  $('#campo-sentido').classList.toggle('oculto', tipo !== 'AJUSTE');
  $('#campo-origen').classList.toggle('oculto', !usaOrigen);
  $('#campo-destino').classList.toggle('oculto', !usaDestino);
  $('#form-movimiento [name=notas]').required = tipo === 'AJUSTE';

  const esMenor = sesionActual.usuario && sesionActual.usuario.rol === 'supervisor_menor';
  const miBodegaId = esMenor ? sesionActual.usuario.bodega_id : null;
  const miBodega = esMenor ? catalogo.bodegas.find(b => Number(b.id) === Number(miBodegaId)) : null;
  const htmlFijo = miBodega ? `<option value="${miBodega.id}">${escapar(miBodega.nombre)}</option>` : '';
  const htmlTodas = opciones(catalogo.bodegas, b => b.nombre);

  const selectOrigen = $('#form-movimiento [name=bodega_origen_id]');
  const selectDestino = $('#form-movimiento [name=bodega_destino_id]');

  if (esMenor) {
    if (tipo === 'ENTRADA') {
      // Destino fijo a su propia bodega
      if (selectDestino) { selectDestino.innerHTML = htmlFijo; selectDestino.disabled = true; }
    } else if (tipo === 'SALIDA') {
      // Origen fijo a su propia bodega
      if (selectOrigen) { selectOrigen.innerHTML = htmlFijo; selectOrigen.disabled = true; }
    } else if (tipo === 'AJUSTE') {
      // Un ajuste físico siempre ocurre sobre su propia bodega asignada
      if (sentido === 'ENTRADA') {
        if (selectDestino) { selectDestino.innerHTML = htmlFijo; selectDestino.disabled = true; }
      } else {
        if (selectOrigen) { selectOrigen.innerHTML = htmlFijo; selectOrigen.disabled = true; }
      }
    } else if (tipo === 'TRASLADO') {
      // Origen fijo (el stock sale de su bodega), destino seleccionable (a qué otra bodega enviar)
      if (selectOrigen) { selectOrigen.innerHTML = htmlFijo; selectOrigen.disabled = true; }
      const otrasBodegas = catalogo.bodegas.filter(b => Number(b.id) !== Number(miBodegaId));
      if (selectDestino) { selectDestino.innerHTML = opciones(otrasBodegas, b => b.nombre); selectDestino.disabled = false; }
    }
  } else {
    // supervisor_mayor u otros: todas las bodegas disponibles
    if (selectOrigen) { selectOrigen.innerHTML = htmlTodas; selectOrigen.disabled = false; }
    if (selectDestino) { selectDestino.innerHTML = htmlTodas; selectDestino.disabled = false; }
  }
}

$('#form-movimiento [name=tipo]').addEventListener('change', ajustarCamposMovimiento);
$('#form-movimiento [name=sentido]').addEventListener('change', ajustarCamposMovimiento);

$('#form-movimiento').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const datos = datosDeFormulario(evento.target);

  // Si el usuario es supervisor_menor, garantizar que su bodega asignada viaje siempre
  if (sesionActual.usuario && sesionActual.usuario.rol === 'supervisor_menor') {
    const miBodega = Number(sesionActual.usuario.bodega_id);
    if (datos.tipo === 'ENTRADA') datos.bodega_destino_id = miBodega;
    if (datos.tipo === 'SALIDA') datos.bodega_origen_id = miBodega;
    if (datos.tipo === 'TRASLADO') datos.bodega_origen_id = miBodega;
    if (datos.tipo === 'AJUSTE') {
      if (datos.sentido === 'ENTRADA') datos.bodega_destino_id = miBodega;
      else datos.bodega_origen_id = miBodega;
    }
  }

  if ($('#campo-origen').classList.contains('oculto')) delete datos.bodega_origen_id;
  if ($('#campo-destino').classList.contains('oculto')) delete datos.bodega_destino_id;
  if (datos.tipo !== 'AJUSTE') delete datos.sentido;
  ejecutar(async () => { await api('/movimientos', { method: 'POST', body: datos }); evento.target.reset(); ajustarCamposMovimiento(); }, 'Movimiento registrado');
});

async function renderizarMovimientos() {
  ajustarCamposMovimiento();
  const movimientos = await api('/movimientos');
  $('#tabla-movimientos').innerHTML = movimientos.map(m => `
    <tr>
      <td>${new Date(m.createdAt).toLocaleString()}</td>
      <td>${escapar(m.tipo)}${m.sentido ? ` (${m.sentido === 'ENTRADA' ? '+' : '−'})` : ''}</td>
      <td>${escapar(m.producto?.sku)} — ${escapar(m.producto?.nombre)}</td>
      <td>${escapar(m.bodegaOrigen?.nombre ?? '—')}</td>
      <td>${escapar(m.bodegaDestino?.nombre ?? '—')}</td>
      <td>${m.cantidad}</td>
      <td>${escapar(m.notas ?? '')}</td>
    </tr>`).join('') || '<tr><td colspan="7">Sin movimientos</td></tr>';
}

// ---------- pedidos ----------

function agregarFilaItem() {
  const fila = document.createElement('div');
  fila.className = 'fila-despacho';
  fila.innerHTML = `
    <select class="select-producto item-producto" required>${opciones(catalogo.productos, p => `${p.sku} — ${p.nombre}`)}</select>
    <select class="select-bodega item-bodega-origen" title="Bodega origen para despacho">${opciones(catalogo.bodegas, b => b.nombre)}</select>
    <span class="stock-disp-tag" title="Stock actual disponible en la bodega seleccionada (solo lectura)">Disp: <strong class="valor-disp">—</strong></span>
    <input type="number" class="item-cantidad" min="1" step="1" placeholder="cantidad" required>
    <button type="button" class="secundario quitar-item">quitar</button>
  `;
  fila.querySelector('.quitar-item').addEventListener('click', () => fila.remove());

  const selProducto = fila.querySelector('.item-producto');
  const selBodega = fila.querySelector('.item-bodega-origen');
  const valorDisp = fila.querySelector('.valor-disp');
  const tagDisp = fila.querySelector('.stock-disp-tag');

  const actualizarStockVisual = () => {
    const prodId = Number(selProducto.value);
    const bodId = Number(selBodega.value);
    const ex = existenciasCache.find(e => Number(e.producto_id) === prodId && Number(e.bodega_id) === bodId);
    const actual = ex ? ex.cantidad_actual : 0;
    valorDisp.textContent = `${actual} unid.`;
    tagDisp.classList.toggle('agotado', actual <= 0);
  };

  selProducto.addEventListener('change', actualizarStockVisual);
  selBodega.addEventListener('change', actualizarStockVisual);
  actualizarStockVisual();

  $('#items-pedido').appendChild(fila);
}

$('#agregar-item').addEventListener('click', agregarFilaItem);

$('#form-pedido').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const items = $$('#items-pedido .fila-despacho').map(fila => ({
    producto_id: Number(fila.querySelector('.item-producto').value),
    bodega_id: Number(fila.querySelector('.item-bodega-origen')?.value) || undefined,
    cantidad_solicitada: Number(fila.querySelector('.item-cantidad').value)
  }));
  const descripcion = evento.target.descripcion.value || undefined;
  ejecutar(async () => {
    await api('/pedidos', { method: 'POST', body: { descripcion, items } });
    evento.target.reset();
    $('#items-pedido').innerHTML = '';
    agregarFilaItem();
  }, 'Pedido creado');
});

function htmlItemPedido(pedido, item) {
  const pendiente = item.cantidad_solicitada - item.cantidad_despachada;
  const abierto = pedido.estado === 'PENDIENTE' || pedido.estado === 'PARCIALMENTE_DESPACHADO';
  const esMayor = sesionActual.usuario && sesionActual.usuario.rol === 'supervisor_mayor';
  const miBodegaId = sesionActual.usuario?.bodega_id;

  const bodegaAsignada = item.bodega;
  const bodegaAsignadaId = item.bodega_id || bodegaAsignada?.id;
  const etiquetaBodega = bodegaAsignada
    ? `<span class="badge-bodega-item" style="background:#e0f2fe;color:#0369a1;padding:2px 7px;border-radius:4px;font-size:12px;font-weight:600;margin-left:6px;">📍 ${escapar(bodegaAsignada.nombre)}</span>`
    : '';

  // ¿Puede despachar este ítem el usuario autenticado?
  // - Mayor: puede despachar cualquier ítem desde cualquier bodega
  // - Menor: solo puede despachar si el ítem está asignado a su propia bodega (o sin bodega asignada fija)
  const puedeDespachar = esMayor || (!bodegaAsignadaId || Number(bodegaAsignadaId) === Number(miBodegaId));

  let opcionesHtml = '';
  if (esMayor) {
    opcionesHtml = catalogo.bodegas.map(b => `
      <option value="${b.id}" ${Number(b.id) === Number(bodegaAsignadaId) ? 'selected' : ''}>${escapar(b.nombre)}</option>
    `).join('');
  } else {
    const miBodegaObj = catalogo.bodegas.find(b => Number(b.id) === Number(miBodegaId));
    opcionesHtml = miBodegaObj ? `<option value="${miBodegaObj.id}" selected>${escapar(miBodegaObj.nombre)}</option>` : '';
  }

  // El botón "+ bodega" solo es visible para supervisor_mayor (reparto multibodega)
  const botonAgregarBodega = esMayor
    ? '<button type="button" class="secundario agregar-despacho">+ bodega</button>'
    : '';

  let formulario = '';
  if (abierto && pendiente > 0) {
    if (puedeDespachar) {
      formulario = `
        <div class="fila-despacho" data-item="${item.id}">
          <select class="despacho-bodega">${opcionesHtml}</select>
          <input type="number" class="despacho-cantidad" min="1" max="${pendiente}" step="1" placeholder="cantidad">
          ${botonAgregarBodega}
        </div>`;
    } else {
      formulario = `<span class="info-asignacion" style="color:#64748b;font-size:12px;margin-left:8px;font-style:italic;">(Asignado para despacho en ${escapar(bodegaAsignada?.nombre || 'otra bodega')})</span>`;
    }
  }

  return `<li>
    ${escapar(item.producto?.sku)} — ${escapar(item.producto?.nombre)}: solicitado ${item.cantidad_solicitada}, despachado ${item.cantidad_despachada}, pendiente ${pendiente}
    ${etiquetaBodega}
    ${formulario}
    <div class="despachos-pendientes" data-item="${item.id}"></div>
  </li>`;
}

async function renderizarPedidos() {
  if ($('#items-pedido').children.length === 0) agregarFilaItem();
  const pedidos = await api('/pedidos');
  const esMayor = sesionActual.usuario && sesionActual.usuario.rol === 'supervisor_mayor';

  $('#lista-pedidos').innerHTML = pedidos.map(p => {
    const abierto = p.estado === 'PENDIENTE' || p.estado === 'PARCIALMENTE_DESPACHADO';
    return `
    <div class="pedido" data-pedido="${p.id}">
      <h3>#${p.id} ${escapar(p.descripcion ?? '')} <span class="estado ${escapar(p.estado)}">${escapar(p.estado)}</span></h3>
      <ul>${p.items.map(i => htmlItemPedido(p, i)).join('')}</ul>
      <div class="contenedor-balanceo"></div>
      ${abierto ? `
        <button class="despachar">Despachar lo indicado</button>
        ${esMayor ? '<button class="secundario sugerir-balanceo">💡 Sugerir balanceo</button> <button class="peligro cancelar">Cancelar pedido</button>' : ''}
      ` : ''}
    </div>`;
  }).join('') || '<p>Sin pedidos</p>';
}

$('#lista-pedidos').addEventListener('click', (evento) => {
  const tarjeta = evento.target.closest('.pedido');
  if (!tarjeta) return;
  const pedidoId = tarjeta.dataset.pedido;

  if (evento.target.classList.contains('agregar-despacho')) {
    // Apila la bodega+cantidad elegidas como una línea del despacho (R2: varias bodegas por ítem).
    const fila = evento.target.closest('.fila-despacho');
    const bodega = fila.querySelector('.despacho-bodega');
    const cantidad = Number(fila.querySelector('.despacho-cantidad').value);
    const contenedor = tarjeta.querySelector(`.despachos-pendientes[data-item="${fila.dataset.item}"]`);
    const linea = document.createElement('div');
    linea.dataset.bodega = bodega.value;
    linea.dataset.cantidad = cantidad;
    linea.textContent = `→ ${bodega.selectedOptions[0].textContent}: ${cantidad}`;
    contenedor.appendChild(linea);
    fila.querySelector('.despacho-cantidad').value = '';
    return;
  }

  if (evento.target.classList.contains('sugerir-balanceo')) {
    (async () => {
      try {
        const sugerencia = await api(`/pedidos/${pedidoId}/sugerir-reparto`, { method: 'POST' });
        const contenedor = tarjeta.querySelector('.contenedor-balanceo');
        let html = `<div class="caja-balanceo">
          <h4>💡 Propuesta de balanceo de inventario (solo lectura):</h4>
          <p><em>${escapar(sugerencia.criterio)}</em></p>
          <ul>
            ${sugerencia.propuesta_despacho.map(p => `
              <li><strong>${escapar(p.bodega)}</strong>: despachar <strong>${p.cantidad}</strong> unidades de ${escapar(p.producto || 'ítem #' + p.item_pedido_id)} (stock resultante: ${p.stock_resultante}, mín: ${p.minimo}) ${p.queda_bajo_minimo ? '⚠️' : '✅'}</li>
            `).join('')}
          </ul>`;
        if (sugerencia.advertencias && sugerencia.advertencias.length > 0) {
          html += `<div class="advertencia">⚠️ Advertencias:</div><ul>${sugerencia.advertencias.map(a => `<li>${escapar(a)}</li>`).join('')}</ul>`;
        }
        html += `</div>`;
        contenedor.innerHTML = html;
      } catch (error) {
        avisar(error.message);
      }
    })();
    return;
  }

  if (evento.target.classList.contains('despachar')) {
    const despachos = $$(`.pedido[data-pedido="${pedidoId}"] .despachos-pendientes div`).map(linea => ({
      item_pedido_id: Number(linea.parentElement.dataset.item),
      bodega_id: Number(linea.dataset.bodega),
      cantidad: Number(linea.dataset.cantidad)
    }));

    // Capturar también cantidades escritas directamente en los inputs de cada ítem
    // (esencial para supervisor_menor que no cuenta con botón "+ bodega")
    $$(`.pedido[data-pedido="${pedidoId}"] .fila-despacho`).forEach(fila => {
      const cantidadInput = fila.querySelector('.despacho-cantidad');
      const cantidad = Number(cantidadInput?.value);
      if (cantidad > 0) {
        const bodegaSelect = fila.querySelector('.despacho-bodega');
        const bodegaId = Number(bodegaSelect?.value || sesionActual.usuario?.bodega_id);
        const itemId = Number(fila.dataset.item);
        if (itemId && bodegaId) {
          despachos.push({
            item_pedido_id: itemId,
            bodega_id: bodegaId,
            cantidad
          });
        }
      }
    });

    if (despachos.length === 0) {
      avisar('Debes ingresar al menos una cantidad a despachar');
      return;
    }

    ejecutar(() => api(`/pedidos/${pedidoId}/despachar`, { method: 'POST', body: { despachos } }), 'Despacho registrado');
    return;
  }

  if (evento.target.classList.contains('cancelar')) {
    ejecutar(() => api(`/pedidos/${pedidoId}/cancelar`, { method: 'POST' }), 'Pedido cancelado');
  }
});

// ---------- auditoría ----------

async function renderizarAuditoria() {
  if (sesionActual.usuario && sesionActual.usuario.rol === 'supervisor_menor') {
    $('#resumen-auditoria').textContent = '⚠️ Acceso restringido: Los reportes de auditoría están reservados para el Supervisor Mayor.';
    $('#tabla-auditoria').innerHTML = '<tr><td colspan="6" style="text-align: center; color: #888;">No tienes permisos para consultar la auditoría global.</td></tr>';
    return;
  }

  const auditoria = await api('/inventario/auditoria');
  $('#resumen-auditoria').textContent = auditoria.descuadradas === 0
    ? `Las ${auditoria.total} existencias cuadran con su historia de movimientos.`
    : `${auditoria.descuadradas} de ${auditoria.total} existencias NO cuadran.`;
  $('#tabla-auditoria').innerHTML = auditoria.filas.map(f => `
    <tr class="${f.cuadra ? '' : 'bajo-minimo'}">
      <td>${escapar(f.producto)}</td><td>${escapar(f.sku)}</td><td>${escapar(f.bodega)}</td>
      <td>${f.saldo_materializado}</td><td>${f.saldo_historia}</td><td>${f.cuadra ? '✔' : '✘'}</td>
    </tr>`).join('');
}

// ---------- catálogo ----------

async function renderizarCatalogo() {
  $('#tabla-productos').innerHTML = catalogo.productos.map(p => `
    <tr>
      <td>${escapar(p.sku)}</td><td>${escapar(p.nombre)}</td><td>${escapar(p.estado)}</td>
      <td>${p.estado === 'ACTIVO' ? `<button class="peligro" data-descontinuar="${p.id}">Descontinuar</button>` : ''}</td>
    </tr>`).join('');
  $('#tabla-bodegas').innerHTML = catalogo.bodegas.map(b => `<tr><td>${escapar(b.nombre)}</td><td>${escapar(b.ubicacion ?? '')}</td></tr>`).join('');
}

$('#tabla-productos').addEventListener('click', (evento) => {
  const id = evento.target.dataset.descontinuar;
  if (id) ejecutar(() => api(`/productos/${id}/descontinuar`, { method: 'PATCH' }), 'Producto descontinuado');
});

$('#form-producto').addEventListener('submit', (evento) => {
  evento.preventDefault();
  ejecutar(async () => { await api('/productos', { method: 'POST', body: datosDeFormulario(evento.target) }); evento.target.reset(); }, 'Producto creado');
});

// ---------- arranque ----------

$$('nav button').forEach(b => b.addEventListener('click', () => activarPestana(b.dataset.pestana)));

// Botón cerrar sesión
const btnLogout = $('#btn-logout');
if (btnLogout) {
  btnLogout.addEventListener('click', () => {
    cerrarSesion();
    avisar('Sesión cerrada correctamente', false);
  });
}

// Formulario de inicio de sesión
const formLogin = $('#form-login');
if (formLogin) {
  formLogin.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btnSubmit = $('#btn-iniciar-sesion');
    const username = $('#input-username').value.trim();
    const password = $('#input-password').value;

    if (!username || !password) {
      mostrarLogin('Por favor ingrese usuario y contraseña');
      return;
    }

    try {
      if (btnSubmit) btnSubmit.disabled = true;
      await iniciarSesion(username, password);
      formLogin.reset();
      const tabInicial = sesionActual.usuario.rol === 'supervisor_mayor' ? 'dashboard' : 'existencias';
      activarPestana(tabInicial);
      avisar(`Bienvenido, ${sesionActual.usuario.nombre}`, false);
    } catch (err) {
      mostrarLogin(err.message || 'Error al iniciar sesión');
    } finally {
      if (btnSubmit) btnSubmit.disabled = false;
    }
  });
}

// Verificación de sesión persistida al cargar
async function verificarSesionInicial() {
  const tokenGuardado = sessionStorage.getItem(CLAVE_STORAGE);
  if (!tokenGuardado) {
    mostrarLogin();
    return;
  }

  try {
    sesionActual.token = tokenGuardado;
    const perfil = await api('/auth/perfil');
    sesionActual.usuario = perfil.usuario;
    mostrarAplicacion();
    actualizarUIUsuario();
    const tabInicial = sesionActual.usuario.rol === 'supervisor_mayor' ? 'dashboard' : 'existencias';
    activarPestana(tabInicial);
  } catch {
    cerrarSesion();
  }
}

verificarSesionInicial();
