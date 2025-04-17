import type { NextApiRequest, NextApiResponse } from 'next';

// Supabase Edge Function URL
const EDGE_EMBED_URL = 'https://nucdlezhefexgraqtgou.supabase.co/functions/v1/get-embedding';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query' });
  }

  try {
    // Call the Supabase Edge Function
    const url = `${EDGE_EMBED_URL}?query=${encodeURIComponent(query)}`;
    const edgeRes = await fetch(url);
    if (!edgeRes.ok) {
      const errText = await edgeRes.text();
      return res.status(500).json({ error: 'Supabase Edge Function error', details: errText });
    }
    const data = await edgeRes.json();
    return res.status(200).json({ embedding: data });
  } catch (err: unknown) {
    let errorMsg = 'Unknown error';
    if (err instanceof Error) {
      errorMsg = err.message;
    }
    return res.status(500).json({ error: 'Internal server error', details: errorMsg });
  }
}
