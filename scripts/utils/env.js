'use strict';
const fs = require('fs');
const path = require('path');

function parseEnv(src) {
  const lines = src.split(/\r?\n/);
  const map = new Map();
  for (const line of lines) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const k = line.slice(0, idx).trim();
    const v = line.slice(idx + 1).trim();
    map.set(k, v);
  }
  return map;
}

function serializeEnv(map) {
  const lines = [];
  for (const [k, v] of map.entries()) {
    lines.push(`${k}=${v}`);
  }
  return lines.join('\n') + '\n';
}

function updateEnv(key, value) {
  const envPath = path.resolve(process.cwd(), '.env');
  let map = new Map();

  try {
    if (fs.existsSync(envPath)) {
      const src = fs.readFileSync(envPath, 'utf8');
      map = parseEnv(src);
    }
  } catch (e) {
    // ignore and start fresh
  }

  map.set(key, value);

  try {
    fs.writeFileSync(envPath, serializeEnv(map), { encoding: 'utf8' });
    console.log(`updateEnv: set ${key}=${value} in .env`);
  } catch (e) {
    console.error('updateEnv: failed to write .env', e);
  }
}

function getEnv(key) {
  const envPath = path.resolve(process.cwd(), '.env');
  try {
    if (!fs.existsSync(envPath)) return undefined;
    const src = fs.readFileSync(envPath, 'utf8');
    const map = parseEnv(src);
    return map.get(key);
  } catch (e) {
    return undefined;
  }
}

function getAllEnv() {
  const envPath = path.resolve(process.cwd(), '.env');
  try {
    if (!fs.existsSync(envPath)) return new Map();
    const src = fs.readFileSync(envPath, 'utf8');
    return parseEnv(src);
  } catch (e) {
    return new Map();
  }
}

module.exports = { updateEnv, getEnv, getAllEnv };
