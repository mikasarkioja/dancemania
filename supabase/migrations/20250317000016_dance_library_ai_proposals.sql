-- MAL: ai_proposals JSONB on dance_library for SalsaAgent metadata.
-- Stores an array of proposal objects (proposal_id, source, confidence_score,
-- label_suggestions, segments, biomechanical_summary, created_at, status).
-- One long video may have 20+ suggested moves.

ALTER TABLE public.dance_library
  ADD COLUMN IF NOT EXISTS ai_proposals jsonb DEFAULT '[]'::jsonb;

COMMENT ON COLUMN public.dance_library.ai_proposals IS
  'MAL: Array of SalsaAgentMetadata (proposal_id, source, confidence_score, label_suggestions, segments, biomechanical_summary, created_at, status). Used by Tinder verification UI.';

CREATE INDEX IF NOT EXISTS idx_dance_library_ai_proposals
  ON public.dance_library USING gin (ai_proposals)
  WHERE ai_proposals IS NOT NULL AND jsonb_array_length(ai_proposals) > 0;
