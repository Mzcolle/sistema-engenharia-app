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

    // NOVAS TABELAS PARA AS REGRAS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS card_rules (
        id SERIAL PRIMARY KEY,
        parent_card_id TEXT NOT NULL,
        parent_option_value TEXT NOT NULL,
        child_card_id TEXT NOT NULL
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS rule_options (
        id SERIAL PRIMARY KEY,
        rule_id INTEGER NOT NULL,
        option_value TEXT NOT NULL,
        FOREIGN KEY (rule_id) REFERENCES card_rules(id) ON DELETE CASCADE
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query("DELETE FROM cards");
    for (const card of cards) {
      await client.query(
        "INSERT INTO cards (id, name, type, options, includeInHeader) VALUES ($1, $2, $3, $4, $5)",
        [card.id, card.name, card.type, JSON.stringify(card.options || []), card.includeInHeader]
      );
    }
    await client.query('COMMIT');
    res.status(201).json(cards);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
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
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const release of releases) {
      const result = await client.query(
        `INSERT INTO releases 
        (osNumber, cardId, cardName, value, responsible, releaseDate, type, additionalNumber)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
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
      savedReleases.push(result.rows[0]);
    }
    await client.query('COMMIT');
    res.status(201).json(savedReleases);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
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

// ===============================================
// NOVAS ROTAS PARA AS REGRAS CONDICIONAIS
// ===============================================

// GET /api/rules - Busca todas as regras e suas opções
app.get('/api/rules', async (req, res) => {
  try {
    const rulesResult = await pool.query('SELECT * FROM card_rules');
    const optionsResult = await pool.query('SELECT * FROM rule_options');
    
    const rules = rulesResult.rows.map(rule => {
      const options = optionsResult.rows
        .filter(option => option.rule_id === rule.id)
        .map(option => option.option_value);
      return { ...rule, options };
    });
    
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar regras.', details: err.message });
  }
});

// POST /api/rules - Salva todas as regras (método de substituição total)
app.post('/api/rules', async (req, res) => {
  const rules = req.body; // Espera um array de regras do front-end
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Limpa as tabelas antigas em ordem (opções primeiro por causa da foreign key)
    await client.query('DELETE FROM rule_options');
    await client.query('DELETE FROM card_rules');

    // Insere as novas regras e suas opções
    for (const rule of rules) {
      const ruleInsertResult = await client.query(
        'INSERT INTO card_rules (parent_card_id, parent_option_value, child_card_id) VALUES ($1, $2, $3) RETURNING id',
        [rule.parent_card_id, rule.parent_option_value, rule.child_card_id]
      );
      const newRuleId = ruleInsertResult.rows[0].id;

      if (rule.options && rule.options.length > 0) {
        for (const option of rule.options) {
          await client.query(
            'INSERT INTO rule_options (rule_id, option_value) VALUES ($1, $2)',
            [newRuleId, option]
          );
        }
      }
    }

    await client.query('COMMIT');
    res.status(201).json({ message: 'Regras salvas com sucesso!' });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: 'Erro ao salvar regras.', details: err.message });
  } finally {
    client.release();
  }
});


app.listen(PORT, () => {
  console.log(`Servidor back-end rodando em http://localhost:${PORT}` );
});
