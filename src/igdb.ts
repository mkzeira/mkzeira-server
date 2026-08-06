import axios from 'axios';

const CLIENT_ID = process.env.IGDB_CLIENT_ID || '';
const CLIENT_SECRET = process.env.IGDB_CLIENT_SECRET || '';

let cachedToken: string | null = null;

async function getIGDBToken() {
  if (cachedToken) return cachedToken;
  try {
    const response = await axios.post(`https://id.twitch.tv/oauth2/token?client_id=${CLIENT_ID}&client_secret=${CLIENT_SECRET}&grant_type=client_credentials`);
    cachedToken = response.data.access_token;
    return cachedToken;
  } catch (err) {
    console.error('Erro ao autenticar no IGDB:', err);
    return null;
  }
}

export async function searchGamesFromIGDB(searchTerm: string = '') {
  const token = await getIGDBToken();
  if (!token) return [];

  try {
    const query = searchTerm
      ? `search "${searchTerm}"; fields name, cover.url, summary, genres.name, rating; limit 20;`
      : `fields name, cover.url, summary, genres.name, rating; sort rating desc; limit 20;`;

    const response = await axios.post('https://api.igdb.com/v4/games', query, {
      headers: {
        'Client-ID': CLIENT_ID,
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json'
      }
    });

    return response.data.map((game: any) => ({
      objectID: game.id.toString(),
      title: game.name,
      coverUrl: game.cover?.url ? `https:${game.cover.url.replace('t_thumb', 't_cover_big')}` : "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.png",
      shop: "steam",
      rating: Math.round(game.rating || 80),
      downloads: [
        {
          uri: "magnet:?xt=urn:btih:exemplo",
          name: "Repack Padrão",
          fileSize: "40 GB"
        }
      ],
      genres: game.genres ? game.genres.map((g: any) => g.name) : ["Ação"],
      tags: [],
      screenshots: [],
      fileSize: "40 GB"
    }));
  } catch (err) {
    console.error('Erro ao buscar jogos do IGDB:', err);
    return [];
  }
}
