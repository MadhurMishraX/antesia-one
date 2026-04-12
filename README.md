# Antesía - Advanced Learning Management System

Antesía is a high-performance, gamified Learning Management System (LMS) designed to bridge the gap between students and teachers through real-time interaction, detailed analytics, and a competitive learning environment.

## 🚀 Key Features

### For Students
- **Study Vault**: Access modules, assignments, and study materials organized by subject.
- **Gamified Learning**: Earn XP, climb the global Leaderboard, and progress through leagues (Bronze to Diamond).
- **Real-time Doubts**: Post doubts directly from specific questions and receive instant notifications when teachers reply.
- **Streaks & Stats**: Track daily learning streaks and detailed performance metrics.
- **Broadcasts**: Stay updated with urgent announcements and system-wide broadcasts.

### For Teachers
- **Command Center**: Send real-time broadcasts, monitor class health, and manage urgent alerts.
- **Auditor**: Create and manage modules, questions, and assignments with a powerful interface.
- **Class Metrics**: Deep-dive into student performance with XP-synced leaderboards and accuracy tracking.
- **Analytics**: Visualize class-wide progress with interactive charts and performance sorting.
- **Doubt Management**: Respond to student queries with full context of the module and question.

### For Admins
- **Full Control**: Manage users, modules, and system-wide data.
- **Data Safety**: Built-in tools for bulk cleanup and storage management.
- **2FA Security**: Secure admin access with PIN-based verification.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Motion (formerly Framer Motion)
- **Icons**: Lucide React
- **Backend/Database**: Supabase (Auth, PostgreSQL, Real-time, Storage)
- **Charts**: Recharts

## ⚙️ Setup & Installation

1. **Clone the repository**
2. **Install dependencies**:
   ```bash
   npm install
   ```
3. **Environment Configuration**:
   Create a `.env` file in the root directory and add your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
4. **Run Development Server**:
   ```bash
   npm run dev
   ```
5. **Build for Production**:
   ```bash
   npm run build
   ```

## 📂 Project Structure

- `src/pages/student`: Student-facing interfaces and learning tools.
- `src/pages/teacher`: Teacher dashboard, analytics, and management tools.
- `src/context`: Authentication and global state management.
- `src/components`: Reusable UI components and layouts.
- `src/lib`: Supabase client and utility functions.
- `supabase/`: Database schema and RLS policies.

## 🔒 Security

Antesía implements strict Row Level Security (RLS) policies in Supabase to ensure:
- Students can only access their own submissions and stats.
- Teachers can manage modules they created and view their students' progress.
- Admins have comprehensive oversight while maintaining data integrity.

---
Developed with a focus on performance, accessibility, and user engagement.
