# Technical Architecture Document - Hogwarts Skills Tracker

## 1. Tech Stack
- **Frontend Framework**: React (Vite)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (with custom theme configuration for Hogwarts colors)
- **State Management**: Zustand
- **Routing**: React Router DOM
- **Backend Service**: Supabase
  - **Auth**: Email/Password
  - **Database**: PostgreSQL

## 2. Database Schema

### `profiles` (extends auth.users)
- `id`: uuid (PK, FK to auth.users.id)
- `username`: text
- `house`: text (Gryffindor, Slytherin, etc.) - *Optional for future*

### `skills`
- `id`: uuid (PK)
- `name`: text (e.g., "Wandless Magic")
- `created_at`: timestamp

### `user_skills`
- `id`: uuid (PK)
- `user_id`: uuid (FK to profiles.id)
- `skill_name`: text (Stored directly or FK to skills if we pre-seed, simpler to just store name and progress for this scope) -> *Decision: Let's use a fixed list in frontend for simplicity, but store progress in DB.*
- *Refined Schema*:
  - We need to track *logs* to calculate progress, or store progress and logs separately.
  - Requirement: "Increases by 1%".
  - Let's store `skill_logs`.

### `practice_logs`
- `id`: uuid (PK)
- `user_id`: uuid (FK to auth.users.id)
- `skill_name`: text (e.g., "Wandless Magic")
- `content`: text (The essay)
- `word_count`: integer
- `created_at`: timestamp

*Note: Progress can be calculated dynamically (count of logs * 1) or stored in a summary table. For simplicity and performance, we can just count logs since 1 log = 1%.*

## 3. Frontend Architecture

### Directory Structure
- `src/components`: Reusable UI (Button, Modal, ProgressBar)
- `src/pages`:
  - `Login`: Auth screen
  - `Dashboard`: Skills overview
  - `SkillDetail`: History of a specific skill
- `src/lib`: Supabase client
- `src/store`: Zustand store for user session and skills data

## 4. API / Data Access
- Use Supabase JS Client directly in React components/hooks.
- Row Level Security (RLS) policies to ensure users only access their own data.

## 5. Security
- RLS enabled on `practice_logs`.
- Policy: `SELECT`, `INSERT` allowed for `auth.uid() = user_id`.
