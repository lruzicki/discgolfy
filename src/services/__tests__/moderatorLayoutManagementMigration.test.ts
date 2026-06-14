import fs from 'fs';
import path from 'path';

describe('moderator layout management migration', () => {
  it('adds moderator role and moderator-only write policies for courses/layouts/holes', () => {
    const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter((name) => name.includes('moderator_layout_management'));
    expect(migrationFiles.length).toBeGreaterThan(0);

    const sql = fs.readFileSync(path.join(migrationsDir, migrationFiles[0]), 'utf8');

    expect(sql).toContain('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_moderator boolean NOT NULL DEFAULT false');
    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.is_moderator()');
    expect(sql).toContain('REVOKE UPDATE (is_moderator) ON profiles FROM authenticated');
    expect(sql).toContain('CREATE POLICY "Moderators can update profiles" ON profiles');
    expect(sql).toContain('FOR UPDATE');

    expect(sql).toContain('CREATE POLICY "Moderators can manage courses" ON courses');
    expect(sql).toContain('CREATE POLICY "Moderators can manage layouts" ON layouts');
    expect(sql).toContain('CREATE POLICY "Moderators can manage holes" ON holes');
  });

  it('adds reusable course holes, ordered layout membership, and metadata-only course maps', () => {
    const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter((name) => name.includes('course_hole_layout_map_editor'));
    expect(migrationFiles.length).toBeGreaterThan(0);

    const sql = fs.readFileSync(path.join(migrationsDir, migrationFiles[0]), 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS course_holes');
    expect(sql).toContain('course_id uuid NOT NULL REFERENCES courses(id)');
    expect(sql).toContain('name text NOT NULL');
    expect(sql).toContain('tee_latitude double precision');
    expect(sql).toContain('basket_longitude double precision');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS layout_holes');
    expect(sql).toContain('layout_id uuid NOT NULL REFERENCES layouts(id)');
    expect(sql).toContain('course_hole_id uuid NOT NULL REFERENCES course_holes(id)');
    expect(sql).toContain('position integer NOT NULL');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS course_maps');
    expect(sql).toContain('style_key text NOT NULL DEFAULT');
    expect(sql).not.toContain('image_url');
    expect(sql).not.toContain('storage_path');

    expect(sql).toContain('CREATE POLICY "Moderators can manage course holes" ON course_holes');
    expect(sql).toContain('CREATE POLICY "Moderators can manage layout holes" ON layout_holes');
    expect(sql).toContain('CREATE POLICY "Moderators can manage course maps" ON course_maps');
  });

  it('adds stable hole numbers to reusable course holes', () => {
    const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter((name) => name.includes('add_course_hole_number'));
    expect(migrationFiles.length).toBeGreaterThan(0);

    const sql = fs.readFileSync(path.join(migrationsDir, migrationFiles[0]), 'utf8');

    expect(sql).toContain('ADD COLUMN IF NOT EXISTS hole_number integer');
    expect(sql).toContain('ALTER COLUMN hole_number SET NOT NULL');
    expect(sql).toContain('UNIQUE (course_id, hole_number)');
  });
});
