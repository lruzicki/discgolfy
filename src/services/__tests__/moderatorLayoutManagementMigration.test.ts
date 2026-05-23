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
});
