import express from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import axios from 'axios';
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

interface JogoDados {
  nome: string;
  resumo: string;
  capa: string;
  background: string;
  logo: string;
}

app.get('/', (req, res) => {
  return res.json({ message: '🚀 Server mkzeira launcher ON!' });
});

app.get('/api/buscar-jogo', async (req, res): Promise<any> => {
  const nome = req.query.nome as string;

  if (!nome) {
    return res.status(400).json({ error: 'O nome do jogo é obrigatório.' });
  }

  const dadosFinais: JogoDados = {
    nome: nome,
    resumo: '',
    capa: '',
    background: '',
    logo: ''
  };

  try {
    try {
      const oauthRes = await axios.post(
        `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
      );
      const token = oauthRes.data.access_token;

      const igdbRes = await axios.post(
        `${process.env.IGDB_API_URL}/games`,
        `search "${nome}"; fields name, summary; limit 1;`,
        {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID || '',
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'text/plain',
          },
        }
      );

      if (igdbRes.data && igdbRes.data.length > 0) {
        dadosFinais.resumo = igdbRes.data[0].summary || '';
      }
    } catch (igdbError: any) {
      console.error('Erro IGDB:', igdbError.message);
    }

    try {
      const sgdbSearch = await axios.get(
        `${process.env.STEAMGRIDDB_API_URL}/search/autocomplete?term=${encodeURIComponent(nome)}`,
        { headers: { 'Authorization': `Bearer ${process.env.STEAMGRIDDB_API_KEY}` } }
      );

      if (sgdbSearch.data.success && sgdbSearch.data.data.length > 0) {
        const jogoId = sgdbSearch.data.data[0].id;

        const [gridsRes, heroesRes, logosRes] = await Promise.all([
          axios.get(`${process.env.STEAMGRIDDB_API_URL}/grids/game/${jogoId}?dimensions=600x900`, { headers: { 'Authorization': `Bearer ${process.env.STEAMGRIDDB_API_KEY}` } }).catch(() => null),
          axios.get(`${process.env.STEAMGRIDDB_API_URL}/heroes/game/${jogoId}`, { headers: { 'Authorization': `Bearer ${process.env.STEAMGRIDDB_API_KEY}` } }).catch(() => null),
          axios.get(`${process.env.STEAMGRIDDB_API_URL}/logos/game/${jogoId}`, { headers: { 'Authorization': `Bearer ${process.env.STEAMGRIDDB_API_KEY}` } }).catch(() => null)
        ]);

        if (gridsRes?.data?.success && gridsRes.data.data.length > 0) {
          dadosFinais.capa = gridsRes.data.data[0].url;
        }
        if (heroesRes?.data?.success && heroesRes.data.data.length > 0) {
          dadosFinais.background = heroesRes.data.data[0].url;
        }
        if (logosRes?.data?.success && logosRes.data.data.length > 0) {
          dadosFinais.logo = logosRes.data.data[0].url;
        }
      }
    } catch (sgdbError: any) {
      console.error('Erro SteamGridDB:', sgdbError.message);
    }

    return res.json(dadosFinais);

  } catch (error) {
    return res.status(500).json({ error: 'Erro interno ao processar dados de mídia do jogo.' });
  }
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

app.get('/api/catálogo/hot', async (req, res) => {
  const games = await searchGamesFromIGDB();
  return res.json(games);
});

// --- ROTA MODIFICADA PARA DAR ERRO DE PROPÓSITO ---
app.get('/api/catálogo/destaques', async (req, res) => {
  // Se o Hydra conectar aqui, ele receberá este erro 500
  return res.status(500).json({ error: 'TESTE DE COMUNICAÇÃO ATIVO. SE O HYDRA MOSTRAR ISSO, ELE CONECTOU.' });
});
// ---------------------------------------------------

app.post('/api/catálogo/pesquisa', async (req, res) => {
  const { query } = req.body;
  const games = await searchGamesFromIGDB(query || '');
  return res.json(games);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor mkzeira launcher rodando na porta ${PORT}`);
});
