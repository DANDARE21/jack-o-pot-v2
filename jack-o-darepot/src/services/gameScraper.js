// gameScraper.js - Multi-Tier Game Database Scraper (Steam -> IGDB -> Open Video Game DB)

const WIKI_USER_AGENT = 'JackOPotVault/2.0 (retro gaming app; contact: support@jackopot.app)';

export async function searchGameDatabase(query, options = {}) {
  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return { success: false, results: [] };
  }

  const cleanQuery = query.trim();

  // 1. Try native Electron bridge first (highest fidelity, no CORS, direct Steam & IGDB APIs)
  if (typeof window !== 'undefined' && window.electronAPI?.searchGameDatabase) {
    try {
      const res = await window.electronAPI.searchGameDatabase(cleanQuery, options);
      if (res && res.success && Array.isArray(res.results) && res.results.length > 0) {
        return res;
      }
      // If native returned success but empty, or specific error, check if results exist
      if (res && Array.isArray(res.results)) {
        return res;
      }
    } catch (err) {
      console.warn('Native Electron searchGameDatabase failed, trying web fallback:', err);
    }
  }

  // 2. Browser fallback: Steam Store Search
  if (options.forceProvider !== 'open' && options.forceProvider !== 'igdb') {
    try {
      const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(cleanQuery)}&l=english&cc=US`;
      let response;
      try {
        response = await fetch(searchUrl);
      } catch {
        // If direct fetch is CORS blocked in browser, use proxy
        response = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(searchUrl)}`);
      }

      if (response && response.ok) {
        const data = await response.json();
        const items = (data.items || []).slice(0, 5);

        if (items.length > 0) {
          const detailedResults = await Promise.all(
            items.map(async (item) => {
              const appId = item.id;
              const verticalArtwork = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/library_600x900_2x.jpg`;
              let horizontalArtwork = item.tiny_image || '';
              let screenshots = [];
              let description = '';

              try {
                const detailUrl = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=english`;
                let detailRes;
                try {
                  detailRes = await fetch(detailUrl);
                } catch {
                  detailRes = await fetch(`https://api.allorigins.win/raw?url=${encodeURIComponent(detailUrl)}`);
                }
                if (detailRes && detailRes.ok) {
                  const detailJson = await detailRes.json();
                  const appData = detailJson[appId]?.data || {};
                  horizontalArtwork = appData.header_image || appData.capsule_image || horizontalArtwork;
                  screenshots = (appData.screenshots || []).slice(0, 6).map((s) => s.path_full || s.path_thumbnail);
                  description = appData.short_description || '';
                }
              } catch (detailErr) {
                console.warn('Failed to load item detail for', appId, detailErr);
              }

              return {
                id: `steam_${appId}`,
                name: item.name,
                verticalArtwork,
                horizontalArtwork,
                screenshots,
                description,
                source: 'STEAM',
              };
            })
          );

          return { success: true, results: detailedResults, provider: 'STEAM' };
        }
      }
    } catch (steamErr) {
      console.warn('Browser fallback steam search failed, falling back to Open Game DB:', steamErr);
    }
  }

  // 3. Browser fallback: Open Video Game Database (Wikipedia/Wikimedia API - completely open CORS)
  try {
    const openUrl = `https://en.wikipedia.org/w/api.php?action=opensearch&format=json&origin=*&limit=8&search=${encodeURIComponent(cleanQuery)}`;
    const openRes = await fetch(openUrl);
    const [q, titles] = await openRes.json();

    let candidateTitles = (titles || []).filter(
      (t) => !/film|album|song|soundtrack|novel|disease|virus|bacteria|syndrome|biology/i.test(t)
    );
    if (candidateTitles.length === 0 && titles?.length > 0) candidateTitles = titles;

    candidateTitles.sort((a, b) => {
      const aIsGame = /video game/i.test(a);
      const bIsGame = /video game/i.test(b);
      if (aIsGame && !bIsGame) return -1;
      if (!aIsGame && bIsGame) return 1;
      return 0;
    });

    if (candidateTitles.length === 0) {
      const genUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search&gsrsearch=${encodeURIComponent(cleanQuery + ' video game')}&gsrlimit=4`;
      const genRes = await fetch(genUrl);
      const genData = await genRes.json();
      candidateTitles = Object.values(genData.query?.pages || {}).map((p) => p.title);
    }

    if (candidateTitles.length > 0) {
      const results = [];
      for (const title of candidateTitles.slice(0, 4)) {
        try {
          const detailUrl = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&redirects=1&titles=${encodeURIComponent(title)}&prop=pageimages|extracts|images&piprop=original|thumbnail&pithumbsize=800&pilicense=any&exintro=1&explaintext=1`;
          const detailRes = await fetch(detailUrl);
          const detailData = await detailRes.json();
          const page = Object.values(detailData.query?.pages || {})[0];
          if (!page || page.missing) continue;

          const cover = page.thumbnail?.source || page.original?.source || '';
          const desc = page.extract || '';

          let screenshots = [];
          if (page.images && page.images.length > 0) {
            const imgCandidates = page.images
              .map((i) => i.title)
              .filter((t) => /\.(jpe?g|png|webp)$/i.test(t) && !/flag|logo|icon|symbol|commons|ambox|wiki|stub/i.test(t));

            if (imgCandidates.length > 0) {
              const imgQuery = `https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&titles=${encodeURIComponent(imgCandidates.slice(0, 4).join('|'))}&prop=imageinfo&iiprop=url`;
              const imgRes = await fetch(imgQuery);
              const imgJson = await imgRes.json();
              const imgPages = Object.values(imgJson.query?.pages || {});
              screenshots = imgPages.map((ip) => ip.imageinfo?.[0]?.url).filter(Boolean);
            }
          }

          results.push({
            id: `open_${page.pageid}`,
            name: page.title.replace(/ \(video game.*?\)/i, ''),
            verticalArtwork: cover,
            horizontalArtwork: screenshots[0] || cover,
            screenshots,
            description: desc.slice(0, 300),
            source: 'OPEN_DB',
          });
        } catch (e) {
          console.warn('Failed item in open db fallback:', e);
        }
      }

      if (results.length > 0) {
        return { success: true, results, provider: 'OPEN_DB' };
      }
    }
  } catch (openErr) {
    console.error('Open Game Database fallback failed:', openErr);
  }

  return { success: false, results: [], error: `No database matches found for "${cleanQuery}".` };
}
