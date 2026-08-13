import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

export async function searchGamesFromIGDB(query = '') {
  try {
    const oauthRes = await axios.post(
      `https://id.twitch.tv/oauth2/token?client_id=${process.env.TWITCH_CLIENT_ID}&client_secret=${process.env.TWITCH_CLIENT_SECRET}&grant_type=client_credentials`
    );
    const token = oauthRes.data.access_token;

    let queryBody = `fields name, summary, cover.url, screenshots.url; limit 20;`;
    if (query) {
      queryBody = `search "${query}"; fields name, summary, cover.url, screenshots.url; limit 20;`;
    } else {
      queryBody = `fields name, summary, cover.url, screenshots.url; sort total_rating desc; limit 20;`;
    }

    const igdbRes = await axios.post(
      `${process.env.IGDB_API_URL}/games`,
      queryBody,
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID || '',
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'text/plain',
        },
      }
    );

    const games = igdbRes.data.map((game) => {
      let coverUrl = game.cover?.url ? `https:${game.cover.url}`.replace('t_thumb', 't_cover_big') : '';
      let backgroundUrl = '';

      if (game.screenshots && game.screenshots.length > 0) {
        backgroundUrl = `https:${game.screenshots[0].url}`.replace('t_thumb', 't_screenshot_huge');
      }

      return {
        id: String(game.id),
        title: game.name,
        summary: game.summary || '',
        cover: coverUrl,
        background: backgroundUrl,
        items: []
      };
    });

    return games;
  } catch (error) {
    console.error('Erro ao buscar jogos no IGDB:', error.message);
    return [];
  }
}
