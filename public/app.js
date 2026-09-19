// public/app.js — UI de StockFlow. Sin framework: fetch a /api y renderizado directo.
// La UI no valida reglas de negocio: envía y muestra el error que devuelva la API.

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => Array.from(document.querySelectorAll(selector));

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
  const cuerpo = respuesta.status === 204 ? null : await respuesta.json();
  if (!respuesta.ok) throw new Error(cuerpo?.error || `HTTP ${respuesta.status}`);
  return cuerpo;
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
  actualizarUIUsuario();
  return sesionActual;
}

function actualizarUIUsuario() {
  const badge = $('#badge-sesion');
  if (!badge || !sesionActual.usuario) return;
  const esMayor = sesionActual.usuario.rol === 'supervisor_mayor';
  badge.textContent = esMayor ? '👑 Mayor' : `🏢 Menor (${sesionActual.usuario.bodega?.nombre || 'Bodega ' + sesionActual.usuario.bodega_id})`;
  badge.className = `badge-sesion ${esMayor ? 'mayor' : 'menor'}`;

  // Ocultar creación de pedidos si es supervisor menor
  const formPedido = $('#form-pedido');
  if (formPedido) {
    formPedido.style.display = esMayor ? 'flex' : 'none';
    const tituloNuevo = formPedido.previousElementSibling;
    if (tituloNuevo && tituloNuevo.tagName === 'H2') tituloNuevo.style.display = esMayor ? 'block' : 'none';
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

// ---------- catálogo compartido ----------

async function cargarCatalogo() {
  const [productos, bodegas] = await Promise.all([api('/productos'), api('/bodegas')]);
  catalogo = { productos, bodegas };
  const htmlProductos = opciones(productos, p => `${p.sku} — ${p.nombre}${p.estado === 'DESCONTINUADO' ? ' (descontinuado)' : ''}`);
  const htmlBodegas = opciones(bodegas, b => b.nombre);
  $$('.select-producto').forEach(s => { s.innerHTML = htmlProductos; });
  $$('.select-bodega').forEach(s => { s.innerHTML = htmlBodegas; });
  $('#filtro-bodega').innerHTML = opciones(bodegas, b => b.nombre, 'Todas');
}

// ---------- pestañas ----------

const renderizadores = {
  existencias: renderizarExistencias,
  movimientos: renderizarMovimientos,
  pedidos: renderizarPedidos,
  auditoria: renderizarAuditoria,
  catalogo: renderizarCatalogo
};

function pestanaActiva() {
  return $('nav button.activa').dataset.pestana;
}

async function refrescarPestanaActiva() {
  await cargarCatalogo();
  await renderizadores[pestanaActiva()]();
}

function activarPestana(nombre) {
  $$('nav button').forEach(b => b.classList.toggle('activa', b.dataset.pestana === nombre));
  $$('.pestana').forEach(s => s.classList.toggle('oculto', s.id !== nombre));
  refrescarPestanaActiva().catch(e => avisar(e.message));
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
}

$('#form-movimiento [name=tipo]').addEventListener('change', ajustarCamposMovimiento);
$('#form-movimiento [name=sentido]').addEventListener('change', ajustarCamposMovimiento);

$('#form-movimiento').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const datos = datosDeFormulario(evento.target);
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
  fila.innerHTML = `<select class="select-producto item-producto">${opciones(catalogo.productos, p => `${p.sku} — ${p.nombre}`)}</select>
    <input type="number" class="item-cantidad" min="1" step="1" placeholder="cantidad" required>
    <button type="button" class="secundario quitar-item">quitar</button>`;
  fila.querySelector('.quitar-item').addEventListener('click', () => fila.remove());
  $('#items-pedido').appendChild(fila);
}

$('#agregar-item').addEventListener('click', agregarFilaItem);

$('#form-pedido').addEventListener('submit', (evento) => {
  evento.preventDefault();
  const items = $$('#items-pedido .fila-despacho').map(fila => ({
    producto_id: Number(fila.querySelector('.item-producto').value),
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
  const bodegasOpciones = (sesionActual.usuario && sesionActual.usuario.rol === 'supervisor_menor')
    ? catalogo.bodegas.filter(b => Number(b.id) === Number(sesionActual.usuario.bodega_id))
    : catalogo.bodegas;

  const formulario = abierto && pendiente > 0 ? `
    <div class="fila-despacho" data-item="${item.id}">
      <select class="despacho-bodega">${opciones(bodegasOpciones, b => b.nombre)}</select>
      <input type="number" class="despacho-cantidad" min="1" max="${pendiente}" step="1" placeholder="cantidad">
      <button type="button" class="secundario agregar-despacho">+ bodega</button>
    </div>` : '';
  return `<li>${escapar(item.producto?.sku)} — ${escapar(item.producto?.nombre)}: solicitado ${item.cantidad_solicitada}, despachado ${item.cantidad_despachada}, pendiente ${pendiente}${formulario}<div class="despachos-pendientes" data-item="${item.id}"></div></li>`;
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
    ejecutar(async () => {
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
    });
    return;
  }

  if (evento.target.classList.contains('despachar')) {
    const despachos = $$(`.pedido[data-pedido="${pedidoId}"] .despachos-pendientes div`).map(linea => ({
      item_pedido_id: Number(linea.parentElement.dataset.item),
      bodega_id: Number(linea.dataset.bodega),
      cantidad: Number(linea.dataset.cantidad)
    }));
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

$('#form-bodega').addEventListener('submit', (evento) => {
  evento.preventDefault();
  ejecutar(async () => { await api('/bodegas', { method: 'POST', body: datosDeFormulario(evento.target) }); evento.target.reset(); }, 'Bodega creada');
});

// ---------- arranque ----------

$$('nav button').forEach(b => b.addEventListener('click', () => activarPestana(b.dataset.pestana)));

const selectUsuario = $('#select-usuario-activo');
if (selectUsuario) {
  selectUsuario.addEventListener('change', async (e) => {
    const [username, password] = e.target.value.split(':');
    await ejecutar(async () => {
      await iniciarSesion(username, password);
      avisar(`Sesión activa: ${sesionActual.usuario.nombre} (${sesionActual.usuario.rol})`, false);
    });
  });

  // Autenticar inicialmente con el usuario seleccionado
  const [uInicial, pInicial] = selectUsuario.value.split(':');
  iniciarSesion(uInicial, pInicial).catch(() => {});
}

activarPestana('existencias');
