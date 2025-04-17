import type { NextApiRequest, NextApiResponse } from 'next';
// Helper to create Supabase client with optional JWT
import { createClient } from '@supabase/supabase-js';
import { google } from '@ai-sdk/google';
import { generateText } from 'ai';
//implement upstash

function getSupabaseClientWithJWT(req: NextApiRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  let accessToken = undefined;
  if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
    accessToken = authHeader.replace('Bearer ', '');
  }
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    },
    auth: { persistSession: false },
  });
}


export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Use Supabase client with JWT from Authorization header (if present)
  const supabase = getSupabaseClientWithJWT(req);
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { embedding, topN } = req.body;
  if (!embedding || !Array.isArray(embedding)) {
    return res.status(400).json({ error: 'Missing or invalid embedding' });
  }

  // Debug: log the embedding
  // console.log('Vector search embedding:', embedding);

  // Step 1: Get top N relevant discussions
  const { data: discussions, error: discussionError } = await supabase.rpc('match_discussions', {
    query_embedding: embedding,
    match_count: topN || 5
  });
  // console.log('Discussion search results:', discussions, 'Error:', discussionError);

  if (discussionError) {
    console.error('Discussion vector search error:', discussionError);
    return res.status(500).json({ error: 'Error searching discussions', details: discussionError.message });
  }
  if (!discussions || discussions.length === 0) {
    // console.log('No discussions found for embedding:', embedding);
    return res.status(200).json({ discussions: [], comments: [] });
  }

  const discussionIds = discussions.map((d: Discussion) => d.discussion_id);

  // Step 2: Get top 20 relevant comments within these discussions
  const { data: comments, error: commentError } = await supabase.rpc('match_comments_in_discussions', {
    query_embedding: embedding,
    discussion_ids: discussionIds,
    match_count: 20
  });
  // console.log('Comment search results:', comments, 'Error:', commentError);

  if (commentError) {
    console.error('Comment vector search error:', commentError);
    return res.status(500).json({ error: 'Error searching comments', details: commentError.message });
  }

  // Group comments under their parent discussion and build context
  type Discussion = {
    discussion_id: string | number;
    title: string;
    body: string;
    similarity: number;
  };
  type Comment = {
    comment_id: string | number;
    body: string;
    similarity: number;
    discussion_id: string | number;
  };
  const context = (discussions as Discussion[]).map((discussion) => ({
    discussion_id: discussion.discussion_id,
    title: discussion.title,
    body: discussion.body,
    similarity: discussion.similarity,
    comments: (comments as Comment[])
      .filter((c) => c.discussion_id === discussion.discussion_id)
      .sort((a, b) => a.similarity - b.similarity)
      .map((comment) => ({
        comment_id: comment.comment_id,
        body: comment.body,
        similarity: comment.similarity,
      })),
  }));

  console.log('Structured context for LLM:', JSON.stringify(context, null, 2));

  // If we have relevant discussions, call Gemini 2.0 Flash for answer generation
  let answer = null;
  if (discussions && discussions.length > 0) {
    try {
      const userQuery = req.body.query || '';
      const chatHistory = Array.isArray(req.body.history) ? req.body.history : [];
      // Format chat history as markdown (user/bot turns)
      const formattedHistory = chatHistory.length > 0
        ? `\n\n---\n**Chat History:**\n${chatHistory.map((msg: {type: string, text: string}) => `${msg.type === 'user' ? 'User' : 'Bot'}: ${msg.text}`).join('\n')}`
        : '';
      const systemPrompt = `You are a helpful assistant for a Supabase community chat.\n\n**Format your answer using Markdown with the following rules:**\n- Start with a main heading summarizing the answer (e.g., "# Supabase MFA & Access Issues").\n- Use subheadings (##) for each distinct issue or topic.\n- Use bullet points for lists and steps.\n- Use code blocks for commands, code, or error messages.\n- Use bold for important terms.\n- Add spacing between sections for readability.\n- If the answer is not in the context, say "I don't know based on the provided information."\n\nBe concise and clear.${formattedHistory}\n\nUser Question:\n${userQuery}\n\nRelevant Discussions and Comments:\n${context.map(d =>
        `---\nDiscussion: ${d.title}\n${d.body}\nComments:\n${d.comments.map(c => `- ${c.body}`).join('\n')}`
      ).join('\n')}`;
      const { text: llmAnswer } = await generateText({
        model: google('gemini-2.0-flash'),
        prompt: systemPrompt,
      });
      console.log('Gemini LLM output:', llmAnswer);
      answer = llmAnswer;
    } catch (err) {
      console.error('Gemini LLM error:', err);
      answer = null;
    }
  }

  return res.status(200).json({
    answer,
    discussions,
    comments,
    context // for debugging/inspection
  });
}

