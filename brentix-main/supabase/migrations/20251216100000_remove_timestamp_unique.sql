-- Remove UNIQUE constraint on timestamp to allow duplicate timestamps
-- Each row is a unique data point regardless of timestamp

-- Drop the unique constraint (constraint name format: table_column_key)
ALTER TABLE public.price_data DROP CONSTRAINT IF EXISTS price_data_timestamp_key;

-- Also check for any unique index on timestamp
DROP INDEX IF EXISTS price_data_timestamp_key;
