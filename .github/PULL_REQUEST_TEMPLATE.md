## Summary

- Briefly describe what changed and why.

## Checklist

- [ ] If API changed, I updated `backend/openapi/deadmans.v1.yaml`.
- [ ] If API changed, I ran `npm --prefix frontend run generate:transport` and included regenerated frontend transport artifacts (`src/shared/api/contracts/` and `src/shared/realtime/generated.ts`).
- [ ] If API changed, I included a brief OpenAPI diff note in this PR description.
- [ ] If deletion/archive behavior changed, I reviewed `docs/architecture/data-retention.md` and kept implementation aligned.
- [ ] If deletion behavior changed, I updated backend tests to cover the expected hard/soft-delete path.
- [ ] I verified this change cannot cascade-delete global identity/catalog data (`users`, `question_definitions`, `modifier_definitions`) from game flows.
