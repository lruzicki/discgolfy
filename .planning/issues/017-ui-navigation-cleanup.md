## Parent
[PRD-mvp-polish.md](../PRD-mvp-polish.md)

## What to build
Remove redundant manual navigation components from screens that are now nested within the Tab Navigator.

1. **SelectCourseScreen**: Remove the `bottomNav` View and its associated styles.
2. **Audit**: Check `SelectPlayersScreen` and others for similar legacy navigation bars and remove them.

## Acceptance criteria
- [ ] No "double bottom menu" is visible on the Select Course screen.
- [ ] All screens in the `PlayStack` and `ProfileStack` rely solely on the Tab Navigator for primary navigation.

## Blocked by
None - can start immediately.
