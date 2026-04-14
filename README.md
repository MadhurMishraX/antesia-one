# 🌌 ANTESIA: Advanced Gamified Learning Management System

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)](https://github.com/yourusername/antesia)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![React](https://img.shields.io/badge/React-18-blue.svg)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Backend-Supabase-green.svg)](https://supabase.com/)

## 🌟 Introduction
**Antesía** is a high-performance, full-stack Learning Management System (LMS) engineered to bridge the gap between students and educators through a gamified, real-time ecosystem. Designed specifically for high-stakes exam preparation (like JEE/NEET), it transforms traditional study habits into a competitive journey using psychological triggers like streaks, leagues, and instant feedback loops.

---

## 📸 Visual Overview

| Dashboard | Assignment Interface |
| :---: | :---: |
| ![Dashboard Placeholder](https://via.placeholder.com/800x450?text=Student+Dashboard+Screenshot) | ![Assignment Placeholder](https://via.placeholder.com/800x450?text=Assignment+Interface+Screenshot) |
| *Real-time stats, league progress, and bulletin board.* | *LaTeX rendering, navigation drawer, and auto-save.* |

| Study Vault | Teacher Auditor | Doubt Section |
| :---: | :---: | :---: |
| ![Vault Placeholder](https://via.placeholder.com/400x225?text=Study+Vault) | ![Auditor Placeholder](https://via.placeholder.com/400x225?text=Teacher+Auditor) | ![Doubt Placeholder](https://via.placeholder.com/400x225?text=Doubt+Section) |
| *Categorized modules by priority.* | *Module creation and manual grading.* | *Community-driven Q&A.* |

---

## 🚀 Core Features

### 🎓 For Students: The Gamified Journey
- **Dynamic Command Center**: A real-time dashboard tracking **Rank**, **Daily Streak**, **Total XP**, and **Accuracy**.
- **League System**: Progress through Bronze, Silver, Gold, and Platinum tiers based on XP milestones.
- **Study Vault**: Subject-wise module organization (Physics, Chemistry, Maths) with priority tagging (*Crucial*, *Vital*, *Foundational*).
- **Immersive Testing**: 
    - **LaTeX Support**: High-fidelity rendering of complex formulas via KaTeX.
    - **Hybrid Questions**: Support for MCQ and subjective text-based responses.
    - **Persistence**: Real-time auto-save to cloud prevents data loss during sessions.
- **Results & Analytics**: Post-submission breakdown with XP animations, accuracy metrics, and detailed explanations.

### 👨‍🏫 For Teachers: The Auditor Suite
- **Module Architect**: Create and manage assignments with custom XP rewards and due dates.
- **Manual Grading Flow**: Specialized interface for reviewing and approving subjective text answers.
- **Class Metrics**: Deep-dive into student performance with XP-synced leaderboards and accuracy trends.
- **Doubt Management**: Context-aware Q&A system linked directly to specific questions.

### 📢 Communication & Social
- **Bulletin Board**: Global broadcast system for urgent announcements and motivational alerts.
- **Doubt Section**: Community-driven forum with upvoting and peer-to-peer resolution.

---

## 🛠️ Technical Architecture

### Frontend Stack
- **React 18 & TypeScript**: Component-based architecture with strict type safety.
- **Tailwind CSS**: Utility-first styling for a responsive, mobile-first UI.
- **Motion (Framer Motion)**: Fluid transitions and high-energy celebration animations.
- **Recharts**: Interactive data visualization for performance metrics.
- **KaTeX**: High-speed mathematical typesetting.

### Backend Infrastructure (Supabase)
- **PostgreSQL**: Relational database for complex student-teacher data relationships.
- **Supabase Auth**: Secure authentication with role-based access control.
- **Supabase Realtime**: WebSocket-based updates for broadcasts and live stats.
- **Row Level Security (RLS)**: Granular data access policies ensuring privacy and integrity.

---

## ⚙️ Setup & Installation

### Prerequisites
- **Node.js**: v18.x or higher
- **npm**: v9.x or higher
- **Supabase Account**: A free-tier project is sufficient.

### 1. Clone & Install
```bash
git clone https://github.com/yourusername/antesia.git
cd antesia
npm install
```

### 2. Database Setup
Antesia requires specific tables and RLS policies to function.
1. Go to your [Supabase SQL Editor](https://app.supabase.com/).
2. Copy the contents of [`supabase/schema.sql`](./supabase/schema.sql).
3. Run the script to initialize tables, triggers, and security policies.
4. **Important**: Ensure you enable Google Auth or Email Auth in the Supabase Auth settings.

### 3. Environment Configuration
Create a `.env` file in the root directory:
```env
VITE_SUPABASE_URL=your_project_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_ADMIN_PASSWORD=secure_teacher_password
VITE_ADMIN_PIN=4_digit_admin_pin
```

### 4. Run Development Server
```bash
npm run dev
```

---

## 📂 Database Schema Overview

| Table | Description |
| :--- | :--- |
| `profiles` | User identity and role definitions (Student/Teacher/Admin). |
| `student_stats` | Core gamification data (XP, Streaks, Leagues). |
| `modules` | Metadata for assignments and study materials. |
| `questions` | The content library with LaTeX and option support. |
| `assignment_submissions` | Lifecycle tracking for student attempts. |
| `submission_answers` | Atomic storage for student responses. |
| `broadcasts` | Global messages for the Bulletin Board. |

---

## 🔒 Security & RLS
Antesía implements strict Row Level Security (RLS) to protect user data:
- **Students**: Can only `SELECT` their own stats and `INSERT/UPDATE` their own submissions.
- **Teachers**: Can `INSERT/UPDATE` modules and `SELECT` submissions for their assigned modules.
- **Admins**: Comprehensive access for system maintenance and bulk data management.

---

## 📄 License
This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.

---
*Built with ❤️ for the next generation of engineers and doctors.*
