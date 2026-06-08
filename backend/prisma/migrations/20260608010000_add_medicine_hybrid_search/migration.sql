CREATE EXTENSION IF NOT EXISTS vector;

ALTER TABLE medicine_catalog
  ADD COLUMN search_vector tsvector,
  ADD COLUMN embedding vector(384);

ALTER TABLE household_medicine_inventory
  ADD COLUMN search_vector tsvector,
  ADD COLUMN embedding vector(384);

CREATE OR REPLACE FUNCTION medicine_catalog_search_vector_refresh()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple',
    concat_ws(
      ' ',
      NEW.name,
      array_to_string(NEW.aliases, ' '),
      NEW.indication,
      NEW.contraindication,
      NEW.adverse_reaction,
      NEW.dosage
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER medicine_catalog_search_vector_refresh_trigger
  BEFORE INSERT OR UPDATE OF name, aliases, indication, contraindication, adverse_reaction, dosage
  ON medicine_catalog
  FOR EACH ROW
  EXECUTE FUNCTION medicine_catalog_search_vector_refresh();

CREATE OR REPLACE FUNCTION household_medicine_inventory_search_vector_refresh()
RETURNS trigger AS $$
BEGIN
  NEW.search_vector := to_tsvector(
    'simple',
    concat_ws(
      ' ',
      NEW.name,
      array_to_string(NEW.aliases, ' '),
      NEW.indication,
      NEW.contraindication,
      NEW.adverse_reaction,
      NEW.dosage,
      NEW.notes
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER household_medicine_inventory_search_vector_refresh_trigger
  BEFORE INSERT OR UPDATE OF name, aliases, indication, contraindication, adverse_reaction, dosage, notes
  ON household_medicine_inventory
  FOR EACH ROW
  EXECUTE FUNCTION household_medicine_inventory_search_vector_refresh();

UPDATE medicine_catalog
SET search_vector = to_tsvector(
  'simple',
  concat_ws(
    ' ',
    name,
    array_to_string(aliases, ' '),
    indication,
    contraindication,
    adverse_reaction,
    dosage
  )
);

UPDATE household_medicine_inventory
SET search_vector = to_tsvector(
  'simple',
  concat_ws(
    ' ',
    name,
    array_to_string(aliases, ' '),
    indication,
    contraindication,
    adverse_reaction,
    dosage,
    notes
  )
);

CREATE INDEX medicine_catalog_search_vector_idx
  ON medicine_catalog USING GIN (search_vector);

CREATE INDEX household_medicine_inventory_search_vector_idx
  ON household_medicine_inventory USING GIN (search_vector);

CREATE INDEX medicine_catalog_embedding_idx
  ON medicine_catalog USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;

CREATE INDEX household_medicine_inventory_embedding_idx
  ON household_medicine_inventory USING hnsw (embedding vector_cosine_ops)
  WHERE embedding IS NOT NULL;
