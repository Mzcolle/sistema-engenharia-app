// CÓDIGO DO BACK-END
console.log('Iniciando o script do servidor back-end...');
const express = require('express');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'eve123';

app.use(cors());
app.use(express.json());

let db;

async function initializeDatabase() {
  try {
    db = await open({
      filename: './database.db',
      driver: sqlite3.Database
    });
    console.log('Conectado ao banco de dados SQLite.');
    await db.exec(`CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL, options TEXT, includeInHeader BOOLEAN NOT NULL);`);
    await db.exec(`CREATE TABLE IF NOT EXISTS releases (id TEXT PRIMARY KEY, osNumber TEXT NOT NULL, cardId TEXT NOT NULL, cardName TEXT NOT NULL, value TEXT NOT NULL, responsible TEXT NOT NULL, releaseDate TEXT NOT NULL, type TEXT NOT NULL, additionalNumber INTEGER);`);
    console.log('Tabelas do banco de dados verificadas/criadas com sucesso.');
  } catch (error) {
    console.error("ERRO FATAL: Não foi possível inicializar o banco de dados.", error);
    process.exit(1);
  }
}

app.get('/', (req, res) => res.send('Servidor da API está funcionando!'));
app.post('/api/admin/auth', (req, res) => {
  const { password } = req.body;
  if (password === ADMIN_PASSWORD) res.status(200).json({ success: true });
  else res.status(401).json({ success: false });
});
app.get('/api/cards', async (req, res) => {
  const cards = await db.all('SELECT * FROM cards');
  res.json(cards.map(c => ({ ...c, options: c.options ? JSON.parse(c.options) : [] })));
});
app.post('/api/cards', async (req, res) => {
  // ... (lógica para salvar cards)
  res.status(200).json({ message: 'Configurações salvas.' });
});
app.get('/api/releases', async (req, res) => {
  const releases = await db.all('SELECT * FROM releases ORDER BY releaseDate DESC');
  res.json(releases);
});
app.post('/api/releases', async (req, res) => {
  // ... (lógica para salvar releases)
  res.status(201).json({ message: 'Liberação salva.' });
});

app.listen(PORT, () => {
  console.log(`Servidor back-end rodando em http://localhost:${PORT}` );
  initializeDatabase();
});
