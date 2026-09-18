// seed.js — Carga datos iniciales de prueba en StockFlow
// Ejecutar con: npm run seed
// ⚠️ Este script BORRA y RECREA todas las tablas cada vez que se ejecuta.

const { sincronizar, Producto, Bodega, ExistenciaPorBodega, Movimiento, Pedido, ItemPedido } = require('./src/models');

async function seed() {
  console.log('🌱 Iniciando carga de datos de prueba...\n');

  // force: true borra y recrea las tablas (solo para desarrollo)
  await sincronizar(true);
  console.log('✅ Tablas creadas\n');

  // --- Bodegas ---
  const [bNorte, bSur, bCentral] = await Bodega.bulkCreate([
    { nombre: 'Bodega Norte', ubicacion: 'Calle 80 # 15-20' },
    { nombre: 'Bodega Sur', ubicacion: 'Autopista Sur Km 12' },
    { nombre: 'Bodega Central', ubicacion: 'Av. Caracas # 45-10' }
  ]);
  console.log('✅ 3 Bodegas creadas');

  // --- Productos (1 descontinuado) ---
  const [pResma, pToner, pCable, pMouse, pTeclado] = await Producto.bulkCreate([
    { sku: 'PAP-001', nombre: 'Papel Resma A4', descripcion: 'Resma de 500 hojas', estado: 'ACTIVO' },
    { sku: 'TON-002', nombre: 'Tóner HP LaserJet', descripcion: 'Compatible con serie 1020', estado: 'ACTIVO' },
    { sku: 'CAB-003', nombre: 'Cable HDMI 2m', descripcion: 'Cable HDMI 4K', estado: 'ACTIVO' },
    { sku: 'MOU-004', nombre: 'Mouse Inalámbrico', descripcion: 'Mouse USB inalámbrico', estado: 'ACTIVO' },
    { sku: 'TEC-005', nombre: 'Teclado PS2', descripcion: 'Teclado conector PS2 — descontinuado', estado: 'DESCONTINUADO' }
  ]);
  console.log('✅ 5 Productos creados (1 descontinuado)\n');

  // --- Existencias iniciales por bodega ---
  // Formato: { producto, bodega, cantidad_actual, minimo }
  const existencias = [
    // Papel
    { producto_id: pResma.id, bodega_id: bNorte.id, cantidad_actual: 50, minimo: 100 },  // ← bajo mínimo
    { producto_id: pResma.id, bodega_id: bSur.id, cantidad_actual: 200, minimo: 50 },
    { producto_id: pResma.id, bodega_id: bCentral.id, cantidad_actual: 120, minimo: 100 },

    // Tóner
    { producto_id: pToner.id, bodega_id: bNorte.id, cantidad_actual: 30, minimo: 10 },
    { producto_id: pToner.id, bodega_id: bCentral.id, cantidad_actual: 5, minimo: 15 },   // ← bajo mínimo

    // Cable HDMI
    { producto_id: pCable.id, bodega_id: bSur.id, cantidad_actual: 80, minimo: 20 },
    { producto_id: pCable.id, bodega_id: bCentral.id, cantidad_actual: 45, minimo: 50 }, // ← bajo mínimo

    // Mouse
    { producto_id: pMouse.id, bodega_id: bNorte.id, cantidad_actual: 60, minimo: 30 },
    { producto_id: pMouse.id, bodega_id: bSur.id, cantidad_actual: 25, minimo: 30 },     // ← bajo mínimo

    // Teclado PS2 (descontinuado — tiene existencias pero no puede recibir entradas)
    { producto_id: pTeclado.id, bodega_id: bNorte.id, cantidad_actual: 8, minimo: 5 }
  ];

  await ExistenciaPorBodega.bulkCreate(existencias);
  console.log('✅ Existencias iniciales cargadas (4 casos bajo mínimo)\n');

  // --- Movimientos históricos de ejemplo ---
  await Movimiento.bulkCreate([
    {
      tipo: 'ENTRADA',
      producto_id: pResma.id,
      bodega_destino_id: bSur.id,
      cantidad: 200,
      notas: 'Compra inicial de inventario'
    },
    {
      tipo: 'TRASLADO',
      producto_id: pResma.id,
      bodega_origen_id: bSur.id,
      bodega_destino_id: bCentral.id,
      cantidad: 120,
      notas: 'Traslado para abastecer Bodega Central'
    },
    {
      tipo: 'SALIDA',
      producto_id: pToner.id,
      bodega_origen_id: bCentral.id,
      cantidad: 10,
      notas: 'Entrega a área de sistemas'
    }
  ]);
  console.log('✅ 3 Movimientos históricos registrados\n');

  // --- Pedido de prueba ---
  const pedido = await Pedido.create({
    descripcion: 'Pedido de prueba — suministros oficina',
    estado: 'PENDIENTE'
  });

  await ItemPedido.bulkCreate([
    { pedido_id: pedido.id, producto_id: pResma.id, cantidad_solicitada: 100, cantidad_despachada: 0 },
    { pedido_id: pedido.id, producto_id: pMouse.id, cantidad_solicitada: 20, cantidad_despachada: 0 }
  ]);
  console.log('✅ 1 Pedido de prueba creado (estado PENDIENTE)\n');

  console.log('🎉 Datos de prueba cargados exitosamente.');
  console.log('   Ejecuta "npm start" para iniciar el servidor.');
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Error en seed:', err);
  process.exit(1);
});
