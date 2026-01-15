import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Helper to convert DB casing to CamelCase if needed, but for now we keep simple
// API Routes

// Auth: Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { name, password } = req.body;
  try {
    const check = await pool.query('SELECT id FROM wizards WHERE name = $1', [name]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Такой волшебник уже числится в Хогвартсе.' });
    }

    const result = await pool.query(
      'INSERT INTO wizards (name, password) VALUES ($1, $2) RETURNING *',
      [name, password]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { name, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM wizards WHERE name = $1 AND password = $2',
      [name, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверное имя или пароль' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth: Get User by Name (Public Profile)
app.get('/api/users/:name', async (req, res) => {
    try {
      const name = req.params.name.replace(/_/g, ' '); // Decode URL friendly name
      const result = await pool.query('SELECT id, name FROM wizards WHERE name ILIKE $1', [name]);
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Wizard not found' });
      }
      res.json(result.rows[0]);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: List Users
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM wizards ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Create User
app.post('/api/admin/users', async (req, res) => {
    const { name, password, role } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO wizards (name, password, role) VALUES ($1, $2, $3) RETURNING *',
            [name, password, role]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Update User
app.patch('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic query
    const keys = Object.keys(updates);
    if (keys.length === 0) return res.status(400).json({ error: 'No updates provided' });
    
    const setClause = keys.map((key, idx) => `${key} = $${idx + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    try {
        const result = await pool.query(
            `UPDATE wizards SET ${setClause} WHERE id = $1 RETURNING *`,
            values
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Delete User
app.delete('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM wizards WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logs: Get Logs
app.get('/api/logs', async (req, res) => {
  const { user_id, skill_name } = req.query;
  try {
    let query = 'SELECT * FROM practice_logs WHERE user_id = $1';
    const params = [user_id];
    
    if (skill_name) {
        query += ' AND skill_name = $2';
        params.push(skill_name);
    }
    
    query += ' ORDER BY created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logs: Create Log
app.post('/api/logs', async (req, res) => {
  const { user_id, skill_name, content, word_count, post_link } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO practice_logs (user_id, skill_name, content, word_count, post_link) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [user_id, skill_name, content, word_count, post_link]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logs: Delete Log
app.delete('/api/logs/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body; // In real app, get from session/token
  
  try {
    // Check ownership (simple version)
    // In production, use JWT or session middleware
    const result = await pool.query(
        'DELETE FROM practice_logs WHERE id = $1 AND user_id = $2 RETURNING id',
        [id, user_id]
    );
    
    if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized or log not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Serve Static Files (Frontend)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
