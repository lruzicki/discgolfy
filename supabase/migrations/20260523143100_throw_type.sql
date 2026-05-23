ALTER TABLE throws
ADD COLUMN throw_type text;

ALTER TABLE throws
ADD CONSTRAINT throws_throw_type_check CHECK (throw_type IN ('shot', 'putt'));
