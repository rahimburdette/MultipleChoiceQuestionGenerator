import { NextResponse } from 'next/server';

// Search for medical images using Google Custom Search API
// Falls back to constructing useful search URLs if no API key configured
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const { query } = body;
  if (!query) {
    return NextResponse.json({ error: 'Missing query.' }, { status: 400 });
  }

  // Build a medical-specific search query
  const medicalQuery = `${query} radiology OR histology OR pathology OR clinical image site:radiopaedia.org OR site:pathologyoutlines.com OR site:dermnetnz.org OR site:wikimedia.org`;

  const googleApiKey = process.env.GOOGLE_SEARCH_API_KEY;
  const searchEngineId = process.env.GOOGLE_SEARCH_ENGINE_ID;

  if (googleApiKey && searchEngineId) {
    // Use Google Custom Search API for real image results
    try {
      const url = new URL('https://www.googleapis.com/customsearch/v1');
      url.searchParams.set('key', googleApiKey);
      url.searchParams.set('cx', searchEngineId);
      url.searchParams.set('q', query);
      url.searchParams.set('searchType', 'image');
      url.searchParams.set('num', '3');
      url.searchParams.set('imgSize', 'medium');
      url.searchParams.set('safe', 'active');
      // Prefer medical/educational sources
      url.searchParams.set('siteSearch', 'radiopaedia.org');
      url.searchParams.set('siteSearchFilter', 'i'); // include

      const res = await fetch(url.toString());
      if (res.ok) {
        const data = await res.json();
        const images = (data.items || []).map((item) => ({
          url: item.link,
          thumbnail: item.image?.thumbnailLink || item.link,
          title: item.title,
          source: item.displayLink,
          contextUrl: item.image?.contextLink,
        }));
        return NextResponse.json({ images });
      }
    } catch (e) {
      console.error('Google search failed:', e);
    }
  }

  // Fallback: construct Radiopaedia/OpenI search URLs for the client to use
  const radiopaediaSearch = `https://radiopaedia.org/search?q=${encodeURIComponent(query)}&scope=cases`;
  const openISearch = `https://openi.nlm.nih.gov/gridquery?q=${encodeURIComponent(query)}&m=1&n=4`;

  // Try OpenI (NLM's open medical image search) as a free fallback
  try {
    const openIRes = await fetch(openISearch, {
      headers: { 'Accept': 'application/json' },
    });
    if (openIRes.ok) {
      const text = await openIRes.text();
      // OpenI returns HTML, try to parse image URLs from it
      const imgRegex = /https:\/\/[^"'\s]+\.(jpg|jpeg|png|gif)/gi;
      const matches = text.match(imgRegex) || [];
      const uniqueImages = [...new Set(matches)].slice(0, 3);
      if (uniqueImages.length > 0) {
        return NextResponse.json({
          images: uniqueImages.map((url) => ({
            url,
            thumbnail: url,
            title: query,
            source: 'openi.nlm.nih.gov',
            contextUrl: `https://openi.nlm.nih.gov/gridquery?q=${encodeURIComponent(query)}`,
          })),
        });
      }
    }
  } catch (e) {
    console.error('OpenI search failed:', e);
  }

  // Final fallback: return search links so student can look it up
  return NextResponse.json({
    images: [],
    searchLinks: {
      radiopaedia: radiopaediaSearch,
      openI: `https://openi.nlm.nih.gov/gridquery?q=${encodeURIComponent(query)}`,
    },
  });
}
