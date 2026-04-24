-- Add "Funky" to flavor_tags — the defining cheese word.
-- Used on consumer surfaces (taste quiz, profile fingerprint) in place
-- of the more clinical "Pungent" which stays for producer metadata.
--
-- Run once, idempotent via ON CONFLICT.

INSERT INTO flavor_tags (name, description) VALUES
  ('Funky', 'Bold, barnyard, washed-rind character — the defining cheese trait')
ON CONFLICT (name) DO NOTHING;
