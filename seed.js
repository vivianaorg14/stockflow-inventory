// seed.js — Datos de demo de StockFlow. Ejecutar con: npm run seed
// ⚠️ BORRA y recrea todas las tablas.
// Las existencias se crean SOLO a través de movimientos, para que la auditoría
// de R3 cuadre desde el primer momento (D-02).

const { sincronizar, Producto, Bodega, Usuario } = require('./src/models');
const { registrarMovimiento, fijarMinimo } = require('./src/servicios/inventario');
const { crearPedido } = require('./src/servicios/pedidos');
const { hashPassword } = require('./src/servicios/auth');

// [sku, bodega, entrada inicial, mínimo]. Cuatro pares quedan bajo mínimo a propósito.
const EXISTENCIAS_INICIALES = [
  ['PAP-001', 'Bodega Norte', 50, 100],   // bajo mínimo
  ['PAP-001', 'Bodega Sur', 320, 50],
  ['PAP-001', 'Bodega Central', 0, 100],  // se abastece por traslado
  ['TON-002', 'Bodega Norte', 30, 10],
  ['TON-002', 'Bodega Central', 15, 15],  // queda en 5 tras la salida → bajo mínimo
  ['CAB-003', 'Bodega Sur', 80, 20],
  ['CAB-003', 'Bodega Central', 45, 50],  // bajo mínimo
  ['MOU-004', 'Bodega Norte', 60, 30],
  ['MOU-004', 'Bodega Sur', 25, 30],      // bajo mínimo
  ['TEC-005', 'Bodega Norte', 8, 5]
];

// `registrar` es opcional (default silencioso): los tests siguen llamando cargarDatosDemo() sin
// argumentos; `require.main === module` (ejecución por CLI) le pasa console.log (M-06).
async function cargarDatosDemo(registrar = () => {}) {
  await sincronizar(true);

  const bodegas = {};
  for (const [nombre, ubicacion] of [
    ['Bodega Norte', 'Calle 80 # 15-20'],
    ['Bodega Sur', 'Autopista Sur Km 12'],
    ['Bodega Central', 'Av. Caracas # 45-10']
  ]) bodegas[nombre] = await Bodega.create({ nombre, ubicacion });
  registrar('✅ 3 bodegas creadas');

  const productos = {};
  for (const [sku, nombre, descripcion] of [
    ['PAP-001', 'Papel Resma A4', 'Resma de 500 hojas'],
    ['TON-002', 'Tóner HP LaserJet', 'Compatible con serie 1020'],
    ['CAB-003', 'Cable HDMI 2m', 'Cable HDMI 4K'],
    ['MOU-004', 'Mouse Inalámbrico', 'Mouse USB inalámbrico'],
    ['TEC-005', 'Teclado PS2', 'Teclado conector PS2 — descontinuado']
  ]) productos[sku] = await Producto.create({ sku, nombre, descripcion, estado: 'ACTIVO' });

  for (const [sku, bodega, cantidad, minimo] of EXISTENCIAS_INICIALES) {
    await fijarMinimo(productos[sku].id, bodegas[bodega].id, minimo);
    if (cantidad > 0) {
      await registrarMovimiento({
        tipo: 'ENTRADA', producto_id: productos[sku].id, bodega_destino_id: bodegas[bodega].id,
        cantidad, notas: 'Inventario inicial'
      });
    }
  }
  registrar('✅ 5 productos creados (1 descontinuado)');
  registrar('✅ 10 existencias vía movimientos');

  // El teclado recibió su stock siendo ACTIVO; ahora se descontinúa (R4 aplica desde aquí).
  await productos['TEC-005'].update({ estado: 'DESCONTINUADO' });

  await registrarMovimiento({
    tipo: 'TRASLADO', producto_id: productos['PAP-001'].id,
    bodega_origen_id: bodegas['Bodega Sur'].id, bodega_destino_id: bodegas['Bodega Central'].id,
    cantidad: 120, notas: 'Traslado para abastecer Bodega Central'
  });
  await registrarMovimiento({
    tipo: 'SALIDA', producto_id: productos['TON-002'].id, bodega_origen_id: bodegas['Bodega Central'].id,
    cantidad: 10, notas: 'Entrega a área de sistemas'
  });
  registrar('✅ traslado y salida de ejemplo');

  await crearPedido({
    descripcion: 'Pedido de prueba — suministros oficina',
    items: [
      { producto_id: productos['PAP-001'].id, cantidad_solicitada: 100 },
      { producto_id: productos['MOU-004'].id, cantidad_solicitada: 20 }
    ]
  });
  registrar('✅ 1 pedido de prueba');

  await Usuario.bulkCreate([
    {
      nombre: 'Carlos Mayor',
      username: 'carlos.mayor',
      password_hash: hashPassword('mayor123'),
      rol: 'supervisor_mayor',
      bodega_id: null
    },
    {
      nombre: 'Ana Norte',
      username: 'ana.norte',
      password_hash: hashPassword('norte123'),
      rol: 'supervisor_menor',
      bodega_id: bodegas['Bodega Norte'].id
    },
    {
      nombre: 'Sergio Sur',
      username: 'sergio.sur',
      password_hash: hashPassword('sur123'),
      rol: 'supervisor_menor',
      bodega_id: bodegas['Bodega Sur'].id
    },
    {
      nombre: 'Camilo Central',
      username: 'camilo.central',
      password_hash: hashPassword('central123'),
      rol: 'supervisor_menor',
      bodega_id: bodegas['Bodega Central'].id
    }
  ]);
  registrar('✅ 4 usuarios creados (1 mayor + 3 menores)');
}

module.exports = { cargarDatosDemo };

if (require.main === module) {
  cargarDatosDemo(console.log)
    .then(() => { console.log('🎉 Datos de demo cargados. Ejecuta "npm start".'); process.exit(0); })
    .catch(err => { console.error('❌ Error en seed:', err); process.exit(1); });
}
