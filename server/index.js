const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 10000;

// Configuração do PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// ===============================================
// INICIALIZAÇÃO DO BANCO DE DADOS
// ===============================================
(async () => {
  const client = await pool.connect();
  try {
    console.log('Verificando e criando tabelas do banco de dados...');
    
    await client.query(`
      CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY, name TEXT NOT NULL, type TEXT NOT NULL,
        options TEXT, includeInHeader BOOLEAN
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS releases (
        id SERIAL PRIMARY KEY, osNumber TEXT NOT NULL, cardId TEXT NOT NULL,
        cardName TEXT NOT NULL, value TEXT NOT NULL, responsible TEXT NOT NULL,
        releaseDate TEXT NOT NULL, type TEXT NOT NULL, additionalNumber INTEGER
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS rules (
        id SERIAL PRIMARY KEY, child_card_id TEXT NOT NULL, child_options TEXT[] NOT NULL
      )
    `);
    await client.query(`
      CREATE TABLE IF NOT EXISTS rule_conditions (
        id SERIAL PRIMARY KEY, rule_id INTEGER NOT NULL, parent_card_id TEXT NOT NULL,
        parent_option_values TEXT[] NOT NULL,
        FOREIGN KEY (rule_id) REFERENCES rules(id) ON DELETE CASCADE
      )
    `);
    console.log('Tabelas do banco de dados verificadas/criadas com sucesso.');
  } catch (err) {
    console.error('Erro ao criar/verificar tabelas:', err.message);
  } finally {
    client.release();
  }
})();

app.use(cors());
app.use(express.json({ limit: '10mb' }));

app.get('/api', (req, res) => res.send('Servidor da API está funcionando!'));

// ===============================================
// ROTAS DE CARDS
// ===============================================
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

// ===============================================
// ROTAS DE LIBERAÇÕES (RELEASES)
// ===============================================
app.get('/api/releases', async (req, res) => {
  try {
    const result = await pool.query("SELECT * FROM releases ORDER BY id DESC");
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
        `INSERT INTO releases (osNumber, cardId, cardName, value, responsible, releaseDate, type, additionalNumber)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
        [release.osNumber, release.cardId, release.cardName, release.value, release.responsible, release.releaseDate, release.type, release.additionalNumber]
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

// --- ROTA DE DELEÇÃO ATUALIZADA ---
// Deleta uma liberação específica pelo seu ID único.
app.delete('/api/releases/:id', async (req, res) => {
  const { id } = req.params;
  const { admin_password } = req.headers;

  if (admin_password !== 'eve123_dev') {
    return res.status(403).json({ message: 'Acesso negado. Senha de admin incorreta.' });
  }

  const releaseId = parseInt(id, 10);
  if (isNaN(releaseId)) {
    return res.status(400).json({ message: 'ID inválido. O ID da liberação deve ser um número.' });
  }

  try {
    const result = await pool.query('DELETE FROM releases WHERE id = $1', [releaseId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ message: `Nenhuma liberação encontrada com o ID ${releaseId}.` });
    }
    
    res.status(200).json({ message: `Liberação com ID ${releaseId} foi deletada com sucesso.` });

  } catch (err) {
    console.error('Erro ao deletar liberação:', err.message);
    res.status(500).json({ message: 'Erro interno do servidor ao deletar a liberação.', error: err.message });
  }
});

// ===============================================
// ROTAS DE REGRAS (RULES)
// ===============================================
app.get('/api/rules', async (req, res) => {
  try {
    const rulesResult = await pool.query('SELECT * FROM rules');
    const conditionsResult = await pool.query('SELECT * FROM rule_conditions');
    
    const rules = rulesResult.rows.map(rule => {
      const conditions = conditionsResult.rows
        .filter(cond => cond.rule_id === rule.id)
        .map(cond => ({
          parent_card_id: cond.parent_card_id,
          parent_option_values: cond.parent_option_values,
        }));
      return { 
        id: rule.id,
        child_card_id: rule.child_card_id,
        child_options: rule.child_options,
        conditions: conditions 
      };
    });
    
    res.json(rules);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar regras.', details: err.message });
  }
});

app.post('/api/rules', async (req, res) => {
  const rules = req.body;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('DELETE FROM rule_conditions');
    await client.query('DELETE FROM rules');

    for (const rule of rules) {
      const ruleInsertResult = await client.query(
        'INSERT INTO rules (child_card_id, child_options) VALUES ($1, $2) RETURNING id',
        [rule.child_card_id, rule.child_options]
      );
      const newRuleId = ruleInsertResult.rows[0].id;

      if (rule.conditions && rule.conditions.length > 0) {
        for (const condition of rule.conditions) {
          await client.query(
            'INSERT INTO rule_conditions (rule_id, parent_card_id, parent_option_values) VALUES ($1, $2, $3)',
            [newRuleId, condition.parent_card_id, condition.parent_option_values]
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
  console.log(`Servidor back-end rodando em http://localhost:${PORT}`  );
});
