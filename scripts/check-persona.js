const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env');
  const content = fs.readFileSync(envPath, 'utf8');
  const lines = content.split(/\r?\n/);
  const map = {};
  for (const l of lines) {
    const i = l.indexOf('=');
    if (i > 0) {
      const k = l.slice(0, i).trim();
      const v = l.slice(i + 1).trim();
      map[k] = v.replace(/^"|"$/g, '');
    }
  }
  return map;
}

async function run() {
  const env = loadEnv();
  const uri = env.MONGO_URI;
  if (!uri) {
    console.error('MONGO_URI no definido en backend/.env');
    process.exit(1);
  }
  const numero = process.argv[2];
  if (!numero) {
    console.error('Uso: node scripts/check-persona.js <numeroId>');
    process.exit(1);
  }
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  const doc = await db.collection('gen_m_persona').findOne({ numeroId: numero }, { projection: { id: 1, numeroId: 1, nombre1: 1, apellido1: 1, fechaNac: 1, idTipoId: 1 } });
  console.log(JSON.stringify(doc || null));
  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});