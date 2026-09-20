// api/index.js — Entrypoint para despliegue Serverless en Vercel
const path = require('path');

// En Vercel, el sistema de archivos del proyecto es de solo lectura.
// Asignamos la ruta de SQLite a /tmp para permitir operaciones de lectura y escritura.
if (process.env.VERCEL) {
  const dbDestino = path.join('/tmp', 'stockflow.sqlite');
  process.env.DB_STORAGE = dbDestino;
}

const app = require('../src/app');
const { Usuario } = require('../src/models');
const { cargarDatosDemo } = require('../seed');

let baseInicializada = false;
let promesaInicializacion = null;

// Inicializa las tablas y datos demo si la base en /tmp está vacía o es la primera ejecución
async function asegurarBaseDeDatos() {
  if (baseInicializada) return;
  if (!promesaInicializacion) {
    promesaInicializacion = (async () => {
      try {
        const totalUsuarios = await Usuario.count().catch(() => 0);
        if (totalUsuarios === 0) {
          await cargarDatosDemo();
        }
        baseInicializada = true;
      } catch (err) {
        console.error('Error inicializando base de datos en Vercel:', err);
      }
    })();
  }
  return promesaInicializacion;
}

module.exports = async (req, res) => {
  await asegurarBaseDeDatos();
  return app(req, res);
};
