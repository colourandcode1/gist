# Architecture Notes

## Current Structure

### Data Model
- **Sessions** (Firestore collection: `sessions`)
  - Contains: metadata, `transcript_content`, and embedded `nuggets` array
  - Fields: `userId`, `teamId`, `projectId`, `title`, `session_date`, etc.
  - Nuggets are stored as an array within each session document

### Key Functions

#### Session Management
- `saveSession()` - Creates a new session with nuggets
- `getSessions()` - Lists sessions (transcript_content excluded by default for performance)
- `getSessionById()` - Gets full session with transcript_content
- `deleteSession()` - Deletes session and automatically removes all embedded nuggets
- `getSessionsByProject()` - Gets sessions filtered by project

#### Nugget Management
- `getAllNuggets()` - Gets all nuggets across sessions (with optional team/project filters)
- `getNuggetsBySessionId()` - Gets all nuggets from a specific session/transcript
- `updateNuggetCategoryTags()` - Updates a nugget's category/tags
- `updateNuggetFields()` - Updates any nugget fields
- `deleteNugget()` - Deletes a single nugget

## Future Features Support

### ✅ View All Nuggets from One Transcript
**Status:** Fully supported
- Use `getNuggetsBySessionId(sessionId, userId)` to get all nuggets from a specific transcript
- Nuggets include `session_id`, `session_title`, and `session_date` for reference

### ✅ Delete Transcript Removes All Nuggets
**Status:** Fully supported
- Use `deleteSession(sessionId, userId)` 
- Deleting the session document automatically deletes all embedded nuggets (no additional cleanup needed)
- Includes permission checks (only session owner can delete)

### ✅ Projects/Groups Support
**Status:** Ready for implementation
- `projectId` field added to session schema (defaults to `null` for unassigned)
- `getSessionsByProject()` function available
- `getAllNuggets()` supports project filtering
- Firestore index needed: `(projectId, userId, createdAt)` for efficient queries

## Architecture Considerations

### Current Approach: Embedded Nuggets

**Pros:**
- ✅ Atomic operations (session + nuggets in one document)
- ✅ Automatic deletion (delete session = delete nuggets)
- ✅ Easy to fetch all nuggets for a session
- ✅ Strong consistency (no orphaned nuggets)
- ✅ Simple queries for session-level operations

**Cons:**
- ⚠️ Firestore document size limit: 1MB per document
- ⚠️ Large nuggets arrays could hit limits (~100-200 nuggets depending on size)
- ⚠️ Updating one nugget requires reading/writing entire session
- ⚠️ Querying across all nuggets requires loading all sessions (memory intensive)
- ⚠️ Can't efficiently query nuggets across multiple sessions

### When to Consider Alternative Architecture

Consider migrating to **separate nuggets collection** if:
- Sessions consistently have >100 nuggets
- Need to query/filter nuggets across multiple sessions efficiently
- Need real-time updates on individual nuggets
- Document size exceeds ~800KB (approaching 1MB limit)

### Alternative Architecture (Future Migration)

If needed, a hybrid or full separation approach:

**Option A: Hybrid (Recommended)**
- Keep nuggets embedded for small sessions (<50 nuggets)
- Move to separate `nuggets` collection for large sessions
- Add `nuggets_count` and `nuggets_location` fields to sessions

**Option B: Full Separation**
- Separate `nuggets` collection with `session_id` reference
- Requires cascade delete logic (Cloud Functions or client-side)
- Better for cross-session queries and real-time updates

## Performance Optimizations

### Current Optimizations
1. **Lazy Loading Transcript Content**
   - `transcript_content` excluded from session listings by default
   - Only fetched when viewing/editing a specific session
   - Reduces memory usage and initial load time

2. **Efficient Nugget Updates**
   - `getSessionByIdForUpdate()` excludes transcript_content
   - Nuggets cleaned to prevent transcript_content leakage
   - Updates only modify nuggets array, not full document

3. **Index Requirements**
   - `(userId, createdAt)` - for user session lists
   - `(teamId, createdAt)` - for team session lists  
   - `(projectId, userId, createdAt)` - for project filtering (future)

## Migration Strategy (if needed)

If document size becomes an issue:

1. **Phase 1:** Add `nuggets_count` to monitor document sizes
2. **Phase 2:** Implement hybrid approach for new large sessions
3. **Phase 3:** Migrate existing large sessions via script
4. **Phase 4:** Update queries to handle both embedded and separate nuggets

## Recommendations

### For Current Use Cases
✅ The embedded approach works well for:
- Small to medium sessions (<100 nuggets each)
- Single-user or small team workflows
- Session-focused operations (view/edit all nuggets together)

### For Future Scale
- Monitor document sizes in production
- Consider project-level aggregation needs
- Evaluate query patterns (session-centric vs nugget-centric)
- Plan migration path if document limits become an issue

