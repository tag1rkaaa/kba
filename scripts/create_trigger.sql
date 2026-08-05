DROP TRIGGER IF EXISTS articles_search_vector_update ON articles;
DROP FUNCTION IF EXISTS update_search_vector();

CREATE OR REPLACE FUNCTION update_search_vector() 
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'UPDATE' OR TG_OP = 'INSERT' THEN
    NEW.search_vector := to_tsvector('russian',
      coalesce(NEW.title, '') || ' ' ||
      coalesce(NEW.content_plain, '')
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER articles_search_vector_update
BEFORE INSERT OR UPDATE ON articles
FOR EACH ROW EXECUTE FUNCTION update_search_vector();