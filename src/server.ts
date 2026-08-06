// --- CATÁLOGO BLINDADO PARA O HYDRA ---

app.get('/catalogue/hot', async (req, res) => {
  try {
    return res.json([
      {
        objectID: "1",
        title: "Cyberpunk 2077 (Exemplo)",
        coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.png",
        shop: "steam",
        rating: 90,
        downloads: [
          {
            uri: "magnet:?xt=urn:btih:exemplo",
            name: "Exemplo Repack",
            fileSize: "70 GB"
          }
        ],
        genres: ["RPG", "Ação"],
        tags: ["Cyberpunk", "Mundo Aberto"],
        screenshots: [],
        fileSize: "70 GB"
      }
    ]);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar catálogo hot' });
  }
});

app.get('/catalogue/featured', async (req, res) => {
  try {
    return res.json([
      {
        objectID: "1",
        title: "Cyberpunk 2077 (Exemplo)",
        coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.png",
        shop: "steam",
        rating: 90,
        downloads: [
          {
            uri: "magnet:?xt=urn:btih:exemplo",
            name: "Exemplo Repack",
            fileSize: "70 GB"
          }
        ],
        genres: ["RPG", "Ação"],
        tags: ["Cyberpunk", "Mundo Aberto"],
        screenshots: [],
        fileSize: "70 GB"
      }
    ]);
  } catch (err) {
    return res.status(500).json({ error: 'Erro ao buscar destaques' });
  }
});

app.post('/catalogue/search', async (req, res) => {
  try {
    return res.json([
      {
        objectID: "1",
        title: "Cyberpunk 2077 (Exemplo)",
        coverUrl: "https://images.igdb.com/igdb/image/upload/t_cover_big/co2mvt.png",
        shop: "steam",
        rating: 90,
        downloads: [
          {
            uri: "magnet:?xt=urn:btih:exemplo",
            name: "Exemplo Repack",
            fileSize: "70 GB"
          }
        ],
        genres: ["RPG", "Ação"],
        tags: ["Cyberpunk", "Mundo Aberto"],
        screenshots: [],
        fileSize: "70 GB"
      }
    ]);
  } catch (err) {
    return res.status(500).json({ error: 'Erro na busca do catálogo' });
  }
});
