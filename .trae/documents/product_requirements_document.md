# Product Requirements Document (PRD) - Hogwarts Skills Tracker

## 1. Project Overview
A web application themed around Hogwarts School of Witchcraft and Wizardry, allowing users to track their magical skills progress. Users can log in, view a list of magical skills, and increase their proficiency by writing essays (practicing).

## 2. User Roles
- **Student (User)**: Can log in, view skills, add practice logs (essays), and track progress.

## 3. Core Features

### 3.1 Authentication
- **Login Page**:
  - Email and password login.
  - "Enter Hogwarts" button.
  - Themed background (e.g., Great Hall or Common Room).

### 3.2 Dashboard (Personal Cabinet)
- **Skills List**: Display a list of skills as progress bars.
- **Default Skills**:
  - Wandless Magic (Беспалочковая магия)
  - Non-verbal Magic (Невербальная магия)
  - Apparition (Трансгрессия)
  - Animagus (Анимагия)
  - Metamorphmagus (Мортимагия)
- **Progress Display**: Visual bar showing percentage (0-100%).

### 3.3 Skill Practice (Add Experience)
- **Action**: Click a "+" button next to a skill.
- **Modal/Popup**:
  - Text area for writing an essay/practice log.
  - Word counter.
  - Validation: Minimum 200 words required to save.
- **Save Action**:
  - Increases skill progress by exactly 1%.
  - Saves the text entry.
  - Closes the modal.

### 3.4 Skill History
- **Action**: Click on the progress bar or skill name.
- **Detail Page**:
  - Shows list of all saved texts for that specific skill.
  - Read-only view of past practices.

## 4. Design & UI/UX
- **Theme**: Hogwarts, magical, parchment textures, serif fonts, dark/mysterious colors (deep reds, golds, dark greens, silvers).
- **Typography**: Cinzel or similar magical fonts for headers; readable serif/sans-serif for body text.
- **Feedback**: Magical sounds or visual effects when leveling up (optional but recommended).

## 5. Technical Constraints
- Frontend: React + TypeScript + Tailwind CSS.
- Backend/Database: Supabase (Auth + Database).
