# Implementation Plan - Teacher Dashboard & Admin User Management (Updated with Secret Shortcut)

We will build a comprehensive **Teacher Dashboard Modal** protected by a Teacher PIN or password that can be unlocked by typing the secret keyboard sequence **`adminbaby`** anywhere in the app.

## Features
1. **Secret Keyboard Trigger**: Typing `adminbaby` on the keyboard instantly opens the Teacher Dashboard.
2. **View All Students**: Searchable, filterable by class/period, viewing scores, streaks, PINs, and avatars.
3. **Edit Student Info**: Modify student stage names, PINs, class codes, and scores directly from the teacher interface.
4. **Delete Users**: Remove incorrect or test student accounts from the leaderboard and database.
5. **Add New Students**: Create student accounts directly as an admin.

## Proposed Changes

### Backend (`server.ts` & `src/services/apiClient.ts`)
- Add `DELETE /api/students/:id` endpoint for deleting student accounts.
- Ensure authentication or teacher PIN verification endpoint if needed.

### Frontend Components (`src/components/TeacherDashboardModal.tsx`)
- Create a dedicated modal with student management table.
- Search filter by name and filter by class code.
- Inline edit modal or row editing for name, PIN, score, and class code.
- Delete confirmation dialog.

### Global App Integration (`src/App.tsx` or similar)
- Add a global `useEffect` keyboard listener tracking keystrokes for `adminbaby` to open the Teacher Dashboard modal.
