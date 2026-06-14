import fs from 'fs';
import path from 'path';

describe('live Match watch RLS migration', () => {
  it('restricts active Match reads to participating Players while keeping creator-only writes', () => {
    const migrationsDir = path.resolve(__dirname, '../../../supabase/migrations');
    const migrationFiles = fs.readdirSync(migrationsDir).filter((name) => name.includes('live_match_watch'));
    expect(migrationFiles.length).toBeGreaterThan(0);

    const sql = fs.readFileSync(path.join(migrationsDir, migrationFiles[0]), 'utf8');

    expect(sql).toContain('CREATE OR REPLACE FUNCTION public.can_read_match(match_uuid uuid)');
    expect(sql).toContain("m.status <> 'active'");
    expect(sql).toContain('mp.player_id = public.current_profile_id()');
    expect(sql).toContain('DROP POLICY IF EXISTS "Matches are viewable by everyone" ON matches');
    expect(sql).toContain('CREATE POLICY "Active matches are viewable by participants" ON matches FOR SELECT');
    expect(sql).toContain('CREATE POLICY "Match players are viewable by match readers" ON match_players FOR SELECT');
    expect(sql).toContain('CREATE POLICY "Scores are viewable by match readers" ON scores FOR SELECT');
    expect(sql).toContain('CREATE POLICY "Throws are viewable by match readers" ON throws FOR SELECT');
    expect(sql).toContain('CREATE POLICY "Throw events are viewable by match readers" ON throw_events FOR SELECT');
    expect(sql).toContain('CREATE POLICY "Match creators can manage scores" ON scores FOR ALL');
    expect(sql).toContain('CREATE POLICY "Match creators can manage throws" ON throws FOR ALL');
  });
});
