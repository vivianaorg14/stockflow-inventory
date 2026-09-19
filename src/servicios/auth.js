// src/servicios/auth.js
// Servicio de autenticación simple con JWT nativo (RFC 7519) y hashing de contraseñas.
// Utiliza el módulo 'crypto' nativo de Node.js para máxima portabilidad y cero dependencias pesadas.

const crypto = require('crypto');
const { Usuario, Bodega } = require('../models');
const { ErrorDeNegocio, NoEncontrado } = require('./errores');

const JWT_SECRET = process.env.JWT_SECRET || 'stockflow-jwt-secret-key-multibodega-2026';

function base64UrlEncode(str) {
  return Buffer.from(str)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

// Hashing de contraseñas con scrypt nativo
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return `${salt}:${derivedKey.toString('hex')}`;
}

function verifyPassword(password, storedHash) {
  if (!storedHash || !storedHash.includes(':')) return false;
  const [salt, key] = storedHash.split(':');
  const derivedKey = crypto.scryptSync(password, salt, 64);
  return crypto.timingSafeEqual(Buffer.from(key, 'hex'), derivedKey);
}

// Generación de JWT (Header.Payload.Signature con HMAC-SHA256)
function generarToken(payload, expiresInSeconds = 86400) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  const fullPayload = {
    ...payload,
    iat: now,
    exp: now + expiresInSeconds
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(fullPayload));
  const data = `${encodedHeader}.${encodedPayload}`;

  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${data}.${signature}`;
}

// Verificación de JWT
function verificarToken(token) {
  if (!token || typeof token !== 'string') {
    throw new ErrorDeNegocio('Token no proporcionado');
  }

  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new ErrorDeNegocio('Formato de token inválido');
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const data = `${encodedHeader}.${encodedPayload}`;

  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  const sigBuffer = Buffer.from(signature);
  const expBuffer = Buffer.from(expectedSignature);

  if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
    throw new ErrorDeNegocio('Firma de token inválida');
  }

  const payload = JSON.parse(base64UrlDecode(encodedPayload));
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) {
    throw new ErrorDeNegocio('El token ha expirado');
  }

  return payload;
}

// Autenticación de usuario con credenciales
async function autenticarUsuario(username, password) {
  if (!username || !password) {
    throw new ErrorDeNegocio('Usuario y contraseña son obligatorios');
  }

  const usuario = await Usuario.findOne({
    where: { username },
    include: [{ model: Bodega, as: 'bodega', attributes: ['id', 'nombre', 'ubicacion'] }]
  });

  if (!usuario || !verifyPassword(password, usuario.password_hash)) {
    const err = new ErrorDeNegocio('Credenciales inválidas');
    err.estado = 401;
    throw err;
  }

  const tokenPayload = {
    id: usuario.id,
    username: usuario.username,
    nombre: usuario.nombre,
    rol: usuario.rol,
    bodega_id: usuario.bodega_id
  };

  const token = generarToken(tokenPayload);

  return {
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      username: usuario.username,
      rol: usuario.rol,
      bodega_id: usuario.bodega_id,
      bodega: usuario.bodega ? { id: usuario.bodega.id, nombre: usuario.bodega.nombre } : null
    }
  };
}

async function obtenerUsuarioPorId(id) {
  const usuario = await Usuario.findByPk(id, {
    attributes: ['id', 'nombre', 'username', 'rol', 'bodega_id'],
    include: [{ model: Bodega, as: 'bodega', attributes: ['id', 'nombre', 'ubicacion'] }]
  });
  if (!usuario) throw new NoEncontrado(`Usuario con ID ${id} no encontrado`);
  return usuario;
}

module.exports = {
  hashPassword,
  verifyPassword,
  generarToken,
  verificarToken,
  autenticarUsuario,
  obtenerUsuarioPorId
};
