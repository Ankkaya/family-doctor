-- Separate genuine model embeddings from the legacy hash vectors.
ALTER TABLE household_medicine_inventory
  ADD COLUMN semantic_embedding vector,
  ADD COLUMN semantic_embedding_model text,
  ADD COLUMN semantic_embedding_hash text;

-- No ANN index: searches compute exact distances inside a materialized household scope.
