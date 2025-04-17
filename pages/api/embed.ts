import type { NextApiRequest, NextApiResponse } from 'next';
// import { Ratelimit } from '@upstash/ratelimit';
// import { Redis } from '@upstash/redis';

// HuggingFace API endpoint for gte-small feature extraction
const HF_API_URL = 'https://api-inference.huggingface.co/pipeline/feature-extraction/thenlper/gte-small';

// // Initialize Upstash Redis and RateLimiter
// const redis = new Redis({
//   url: process.env.NEXT_UPSTASH_URL!,
//   token: process.env.NEXT_UPSTASH_TOKEN!,
// });
// const ratelimit = new Ratelimit({
//   redis,
//   limiter: Ratelimit.fixedWindow(5, '1 m'), // 5 requests per minute per IP
//   analytics: true,
// });

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // // Rate limit logic
  // const ip = req.headers['x-forwarded-for']?.toString().split(',')[0] || req.socket.remoteAddress || 'unknown';
  // const { success, remaining, reset } = await ratelimit.limit(ip);

  // res.setHeader('X-RateLimit-Limit', '5');
  // res.setHeader('X-RateLimit-Remaining', remaining.toString());
  // res.setHeader('X-RateLimit-Reset', reset.toString());

  // if (!success) {
  //   return res.status(429).json({ error: 'Too many requests. Please try again later.' });
  // }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query } = req.body;
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query' });
  }

  try {
    const hfRes = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.NEXT_HF_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: query }),
    });

    if (!hfRes.ok) {
      const error = await hfRes.text();
      console.error('HuggingFace API error:', error);
      return res.status(500).json({ error: `HuggingFace API error: ${error}` });
    }

    const embedding = await hfRes.json();
    // The embedding is usually a 2D array [[...]] for a single input, so we flatten
    const vector = Array.isArray(embedding) && Array.isArray(embedding[0]) ? embedding[0] : embedding;

    return res.status(200).json({ embedding: vector });
  } catch (err: any) {
    console.error('API catch error:', err);
    return res.status(500).json({ error: err.message || 'Unknown error' });
  }
}
