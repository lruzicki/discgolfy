import fs from 'fs';
import path from 'path';

describe('throw events migration', () => {
  it('defines throw_events schema with creator-only manage policy', () => {
    const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter((name) => name.includes('throw_events'));
    expect(migrationFiles.length).toBeGreaterThan(0);

    const sql = fs.readFileSync(path.join(migrationsDir, migrationFiles[0]), 'utf8');

    expect(sql).toContain('CREATE TABLE throw_events');
    expect(sql).toContain("event_type text CHECK (event_type IN ('tree', 'water', 'ob', 'hit_person'))");
    expect(sql).toContain('ALTER TABLE throw_events ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY "Throw events are viewable by everyone" ON throw_events FOR SELECT USING (true)');
    expect(sql).toContain('CREATE POLICY "Match creators can manage throw events" ON throw_events FOR ALL USING');
  });
});
