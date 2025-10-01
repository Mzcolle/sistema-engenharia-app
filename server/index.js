const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false } // obrigatório no Render
});

// Criação das tabelas se não existirem
(async () => {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        options TEXT,
        includeInHeader BOOLEAN
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS releases (
        id SERIAL PRIMARY KEY,
        osNumber TEXT NOT NULL,
        cardId TEXT NOT NULL,
        cardName TEXT NOT NULL,
        value TEXT NOT NULL,
        responsible TEXT NOT NULL,
        releaseDate TEXT NOT NULL,
        type TEXT NOT NULL,
        additionalNumber INTEGER
      )
    `);

    console.log('Tabelas do banco de dados verificadas/criadas com sucesso.');
  } catch (err) {
    console.error('Erro ao criar/verificar tabelas:', err.message);
  }
})();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rota para testar se o servidor está no ar
app.get('/api', (req, res) => {
  res.send('Servidor da API está funcionando!');
});

// Rotas para os cartões
app.get('/api/cards', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM cards");
    const cards = result.rows.map(card => ({
      ...card,
      options: card.options ? JSON.parse(card.options) : [],
      includeInHeader: !!card.includeInHeader
    }));
    res.json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/cards', async (req, res) => {
  const cards = req.body;
  try {
    // Deleta todos os cartões existentes
    await pool.query("DELETE FROM cards");

    // Insere novos cartões
    for (const card of cards) {
      await pool.query(
        "INSERT INTO cards (id, name, type, options, includeInHeader) VALUES ($1, $2, $3, $4, $5)",
        [card.id, card.name, card.type, JSON.stringify(card.options || []), card.includeInHeader]
      );
    }

    res.status(201).json(cards);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rotas para as liberações
app.get('/api/releases', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM releases ORDER BY releaseDate DESC");
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/releases', async (req, res) => {
  const releases = req.body;
  const savedReleases = [];

  try {
    for (const release of releases) {
      await pool.query(
        `INSERT INTO releases 
        (osNumber, cardId, cardName, value, responsible, releaseDate, type, additionalNumber)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          release.osNumber,
          release.cardId,
          release.cardName,
          release.value,
          release.responsible,
          release.releaseDate,
          release.type,
          release.additionalNumber
        ]
      );
      savedReleases.push(release);
    }
    res.status(201).json(savedReleases);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Rota de deleção
app.delete('/api/releases/:osNumber', async (req, res) => {
  const { osNumber } = req.params;
  const { admin_password } = req.headers;

  if (admin_password !== 'eve123_dev') {
    return res.status(403).json({ message: 'Acesso negado. Senha de admin incorreta.' });
  }

  try {
    const result = await pool.query('DELETE FROM releases WHERE osNumber = $1', [osNumber]);
    if (result.rowCount === 0) {
      return res.status(404).json({ message: `Nenhuma liberação encontrada para a OS ${osNumber}.` });
    }
    res.status(200).json({ message: `${result.rowCount} liberações da OS ${osNumber} foram deletadas com sucesso.` });
  } catch (err) {
    res.status(500).json({ message: 'Erro ao deletar liberações.', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Servidor back-end rodando em http://localhost:${PORT}`);
});
