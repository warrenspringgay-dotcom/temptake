-- Enable trigram extension for fuzzy search indexes
create extension if not exists pg_trgm;

-- Optional, but sometimes used by Supabase setups
create extension if not exists unaccent;
