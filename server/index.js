const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path =require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Caminho para o banco de dados
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erro ao abrir o banco de dados:', err.message);
  } else {
    console.log('Conectado ao banco de dados SQLite.');
    // Cria as tabelas se elas não existirem
    db.serialize(() => {
      db.run(`CREATE TABLE IF NOT EXISTS cards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        options TEXT,
        includeInHeader BOOLEAN
      )`);
      db.run(`CREATE TABLE IF NOT EXISTS releases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        osNumber TEXT NOT NULL,
        cardId TEXT NOT NULL,
        cardName TEXT NOT NULL,
        value TEXT NOT NULL,
        responsible TEXT NOT NULL,
        releaseDate TEXT NOT NULL,
        type TEXT NOT NULL,
        additionalNumber INTEGER
      )`);
      console.log('Tabelas do banco de dados verificadas/criadas com sucesso.');
    });
  }
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Rota para testar se o servidor está no ar
app.get('/api', (req, res) => {
  res.send('Servidor da API está funcionando!');
});

// Rotas para os cartões
app.get('/api/cards', (req, res) => {
  db.all("SELECT * FROM cards", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    // Converte a string de opções de volta para um array
    const cards = rows.map(card => ({
      ...card,
      options: card.options ? JSON.parse(card.options) : [],
      includeInHeader: !!card.includeInHeader
    }));
    res.json(cards);
  });
});

app.post('/api/cards', (req, res) => {
  const cards = req.body;
  db.serialize(() => {
    // Deleta todos os cartões existentes para substituir pela nova configuração
    db.run("DELETE FROM cards", (err) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      
      const stmt = db.prepare("INSERT INTO cards (id, name, type, options, includeInHeader) VALUES (?, ?, ?, ?, ?)");
      cards.forEach(card => {
        stmt.run(
          card.id,
          card.name,
          card.type,
          JSON.stringify(card.options || []), // Salva opções como string JSON
          card.includeInHeader
        );
      });
      
      stmt.finalize((err) => {
        if (err) {
          res.status(500).json({ error: err.message });
          return;
        }
        res.status(201).json(cards);
      });
    });
  });
});

// Rotas para as liberações
app.get('/api/releases', (req, res) => {
  db.all("SELECT * FROM releases ORDER BY releaseDate DESC", [], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.post('/api/releases', (req, res) => {
  const releases = req.body;
  const stmt = db.prepare("INSERT INTO releases (osNumber, cardId, cardName, value, responsible, releaseDate, type, additionalNumber) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
  
  const savedReleases = [];
  releases.forEach(release => {
    stmt.run(
      release.osNumber,
      release.cardId,
      release.cardName,
      release.value,
      release.responsible,
      release.releaseDate,
      release.type,
      release.additionalNumber
    );
    savedReleases.push(release);
  });

  stmt.finalize((err) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.status(201).json(savedReleases);
  });
});

// Rota de deleção
app.delete('/api/releases/:osNumber', (req, res) => {
    const { osNumber } = req.params;
    const { admin_password } = req.headers;

    if (admin_password !== 'eve123_dev') {
        return res.status(403).json({ message: 'Acesso negado. Senha de admin incorreta.' });
    }

    db.run('DELETE FROM releases WHERE osNumber = ?', [osNumber], function(err) {
        if (err) {
            return res.status(500).json({ message: 'Erro ao deletar liberações.', error: err.message });
        }
        if (this.changes === 0) {
            return res.status(404).json({ message: `Nenhuma liberação encontrada para a OS ${osNumber}.` });
        }
        res.status(200).json({ message: `${this.changes} liberações da OS ${osNumber} foram deletadas com sucesso.` });
    });
});


app.listen(PORT, () => {
  console.log(`Servidor back-end rodando em http://localhost:${PORT}` );
});
