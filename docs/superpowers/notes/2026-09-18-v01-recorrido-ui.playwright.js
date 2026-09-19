// Recorrido manual V-01 de la UI automatizado con Playwright (Edge headless).
// Requiere playwright-core; la ruta de abajo apunta a la caché npx de la máquina donde se ejecutó
// el 2026-09-18. Para reutilizar: npm i -D playwright-core y cambiar el require a 'playwright-core'.
// Ejecutar con el servidor en http://localhost:3000 tras npm run seed. Resultado 2026-09-18: 12/12 OK.
const { chromium } = require('C:/Users/gogam/AppData/Local/npm-cache/_npx/705bc6b22212b352/node_modules/playwright-core');
const out = [];
const ok = (n, c, d) => out.push(`${c ? 'OK ' : 'FAIL '} ${n}${d ? ' — ' + d : ''}`);
const espera = (ms) => new Promise(r => setTimeout(r, ms));

async function elegir(page, selector, texto) {
  await page.$eval(selector, (s, t) => {
    const op = [...s.options].find(o => o.text.includes(t));
    s.value = op.value; s.dispatchEvent(new Event('change', { bubbles: true }));
  }, texto);
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  const errores = [];
  page.on('pageerror', e => errores.push(e.message));
  page.on('console', m => { if (m.type() === 'error') errores.push(m.text()); });
  page.on('dialog', d => d.accept('20'));
  await page.goto('http://localhost:3000/');
  await page.waitForSelector('#tabla-existencias tr');

  // 1 existencias
  let filas = await page.$$('#tabla-existencias tr');
  let resaltadas = await page.$$('#tabla-existencias tr.bajo-minimo');
  ok('1a existencias: 10 filas, 4 resaltadas', filas.length === 10 && resaltadas.length === 4, `${filas.length}/${resaltadas.length}`);
  await elegir(page, '#filtro-bodega', 'Bodega Central');
  await espera(300);
  filas = await page.$$('#tabla-existencias tr');
  ok('1b filtro Central: 3 filas', filas.length === 3, String(filas.length));
  await page.$eval('#filtro-bodega', s => { s.value = ''; s.dispatchEvent(new Event('change', { bubbles: true })); });
  await espera(300);
  await page.click('#tabla-existencias tr:has-text("TEC-005") button[data-accion="minimo"]');
  await espera(600);
  ok('1c editar mínimo TEC-005=20 → resaltada', !!(await page.$('#tabla-existencias tr.bajo-minimo:has-text("TEC-005")')));

  // 2 movimientos
  await page.click('nav button[data-pestana="movimientos"]');
  await page.waitForSelector('#tabla-movimientos tr');
  await elegir(page, '#form-movimiento [name=tipo]', 'Entrada');
  await elegir(page, '#form-movimiento [name=producto_id]', 'TEC-005');
  await elegir(page, '#form-movimiento [name=bodega_destino_id]', 'Bodega Norte');
  await page.fill('#form-movimiento [name=cantidad]', '1');
  await page.click('#form-movimiento button[type=submit]');
  await espera(600);
  let aviso = await page.textContent('#aviso');
  ok('2a entrada a descontinuado → banner error', /DESCONTINUADO/.test(aviso), aviso);
  const antes = (await page.$$('#tabla-movimientos tr')).length;
  await elegir(page, '#form-movimiento [name=tipo]', 'Traslado');
  await elegir(page, '#form-movimiento [name=producto_id]', 'PAP-001');
  await elegir(page, '#form-movimiento [name=bodega_origen_id]', 'Bodega Sur');
  await elegir(page, '#form-movimiento [name=bodega_destino_id]', 'Bodega Norte');
  await page.fill('#form-movimiento [name=cantidad]', '30');
  await page.click('#form-movimiento button[type=submit]');
  await espera(700);
  const despues = (await page.$$('#tabla-movimientos tr')).length;
  ok('2b traslado 30 Sur→Norte aparece en historial', despues === antes + 1, `${antes}→${despues}`);

  // 3 pedidos
  await page.click('nav button[data-pestana="pedidos"]');
  await page.waitForSelector('.pedido[data-pedido="1"]');
  const filasItem = () => page.$$('.pedido[data-pedido="1"] .fila-despacho');
  let fila = (await filasItem())[0];
  for (const [bodega, cant] of [['Bodega Norte', '50'], ['Bodega Sur', '50']]) {
    await fila.$eval('.despacho-bodega', (s, t) => { s.value = [...s.options].find(o => o.text === t).value; }, bodega);
    await (await fila.$('.despacho-cantidad')).fill(cant);
    await (await fila.$('.agregar-despacho')).click();
  }
  await page.click('.pedido[data-pedido="1"] button.despachar');
  await espera(700);
  let estado = await page.textContent('.pedido[data-pedido="1"] .estado');
  ok('3a despacho 50+50 → PARCIALMENTE_DESPACHADO', estado === 'PARCIALMENTE_DESPACHADO', estado);
  fila = (await filasItem())[0];
  await fila.$eval('.despacho-bodega', (s) => { s.value = [...s.options].find(o => o.text === 'Bodega Norte').value; });
  await (await fila.$('.despacho-cantidad')).fill('20');
  await (await fila.$('.agregar-despacho')).click();
  await page.click('.pedido[data-pedido="1"] button.despachar');
  await espera(700);
  estado = await page.textContent('.pedido[data-pedido="1"] .estado');
  ok('3b despacho 20 → COMPLETADO', estado === 'COMPLETADO', estado);
  await page.fill('#form-pedido [name=descripcion]', 'prueba cancelar');
  await page.fill('#items-pedido .item-cantidad', '3');
  await page.click('#form-pedido button[type=submit]');
  await espera(700);
  ok('3c crear pedido nuevo', !!(await page.$('.pedido[data-pedido="2"]')));
  await page.click('.pedido[data-pedido="2"] button.cancelar');
  await espera(700);
  estado = await page.textContent('.pedido[data-pedido="2"] .estado');
  ok('3d cancelar → CANCELADO', estado === 'CANCELADO', estado);

  // 4 auditoría
  await page.click('nav button[data-pestana="auditoria"]');
  await page.waitForSelector('#tabla-auditoria tr');
  const resumen = await page.textContent('#resumen-auditoria');
  const cruces = await page.$$('#tabla-auditoria tr.bajo-minimo');
  ok('4 auditoría cuadra, 0 descuadres', /cuadran/.test(resumen) && cruces.length === 0, resumen);

  // 5 catálogo
  await page.click('nav button[data-pestana="catalogo"]');
  await page.waitForSelector('#tabla-productos tr');
  await page.fill('#form-producto [name=sku]', 'NEW-1');
  await page.fill('#form-producto [name=nombre]', 'Producto nuevo');
  await page.click('#form-producto button[type=submit]');
  await espera(600);
  await page.fill('#form-bodega [name=nombre]', 'Bodega Este');
  await page.click('#form-bodega button[type=submit]');
  await espera(600);
  ok('5a crear producto y bodega', !!(await page.$('#tabla-productos tr:has-text("NEW-1")')) && !!(await page.$('#tabla-bodegas tr:has-text("Bodega Este")')));
  await page.click('#tabla-productos tr:has-text("NEW-1") button[data-descontinuar]');
  await espera(600);
  ok('5b descontinuar producto nuevo', /DESCONTINUADO/.test(await page.textContent('#tabla-productos tr:has-text("NEW-1")')));
  ok('0 sin errores JS en consola', errores.length === 0, errores.join(' | '));
  await page.click('nav button[data-pestana="existencias"]');
  await espera(500);
  await page.screenshot({ path: 'C:/Users/gogam/AppData/Local/Temp/claude/C--Users-gogam/7bfa7a18-f05e-406f-93f0-6ce135ef9827/scratchpad/v01-existencias.png', fullPage: true });
  await browser.close();
  console.log(out.join('\n'));
})().catch(e => { console.log(out.join('\n')); console.error('FALLO:', e.message); process.exit(1); });
