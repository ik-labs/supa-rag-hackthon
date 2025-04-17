import type { NextApiRequest, NextApiResponse } from 'next';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (server-side)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { embedding, topN } = req.body;
  if (!embedding || !Array.isArray(embedding)) {
    return res.status(400).json({ error: 'Missing or invalid embedding' });
  }

  // Step 1: Get top N relevant discussions
  const { data: discussions, error: discussionError } = await supabase.rpc('match_discussions', {
    query_embedding: embedding,
    match_count: topN || 5
  });

  if (discussionError) {
    return res.status(500).json({ error: 'Error searching discussions', details: discussionError.message });
  }
  if (!discussions || discussions.length === 0) {
    return res.status(200).json({ discussions: [], comments: [] });
  }

  const discussionIds = discussions.map((d: any) => d.discussion_id);

  // Step 2: Get top 20 relevant comments within these discussions
  const { data: comments, error: commentError } = await supabase.rpc('match_comments_in_discussions', {
    query_embedding: embedding,
    discussion_ids: discussionIds,
    match_count: 20
  });

  if (commentError) {
    return res.status(500).json({ error: 'Error searching comments', details: commentError.message });
  }

  return res.status(200).json({ discussions, comments });
}
