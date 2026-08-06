import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { searchGamesFromIGDB } from './igdb';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const JWT_SECRET = process.env.JWT_SECRET || 'mkzeira_launcher_jwt_secret_2026';

app.get('/', (req, res) => {
  return res.json({ message: '🚀 Server mkzeira launcher ON!' });
});

app.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const userQuery = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = userQuery.rows[0];

    if (!user || user.password_hash !== password) {
      return res.status(401).json({ message: 'Credenciais inválidas' });
    }

    const accessToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '1h' });
    const refreshToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: '7d' });

    await pool.query('UPDATE users SET refresh_token = $1 WHERE id = $2', [refreshToken, user.id]);

    return res.json({
      accessToken,
      refreshToken,
      expiresIn: 3600,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno no servidor' });
  }
});

app.post('/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return res.status(401).json({ error: 'Token não fornecido' });

  try {
    const payload = jwt.verify(refreshToken, JWT_SECRET) as any;
    const newAccessToken = jwt.sign({ userId: payload.userId }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ accessToken: newAccessToken, expiresIn: 3600 });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

app.post('/auth/logout', (req, res) => {
  return res.json({ message: 'Desconectado com sucesso' });
});

app.get('/users/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as any;
    const userQuery = await pool.query('SELECT id, username, email FROM users WHERE id = $1', [payload.userId]);
    const user = userQuery.rows[0];
    return res.json({ ...user, subscription: null });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido' });
  }
});

app.post('/download-sources/changes', (req, res) => {
  return res.json([]);
});

app.get('/catalogue/hot', async (req, res) => {
  const games = await searchGamesFromIGDB();
  return res.json(games);
});

app.get('/catalogue/featured', async (req, res) => {
  const games = await searchGamesFromIGDB();
  return res.json(games);
});

app.post('/catalogue/search', async (req, res) => {
  const { query } = req.body;
  const games = await searchGamesFromIGDB(query || '');
  return res.json(games);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
});
