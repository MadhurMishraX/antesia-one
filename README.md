# 🌌 Antesia

[![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)](https://supabase.io/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Framer Motion](https://img.shields.io/badge/Framer_Motion-0055FF?style=for-the-badge&logo=framer&logoColor=white)](https://www.framer.com/motion/)

**Antesia** is an intelligent, dual-role command center designed specifically for modern education. It bridges the gap between teacher instruction and student execution through a gamified, real-time interface.

---

## ✨ Core Features

### 👨‍🎓 Student Experience
*   **Intelligent Dashboard**: Real-time tracking of XP, Global Rank, Accuracy, and Streaks with time-aware "Smart Greetings."
*   **Academic Ready**: Built-in support for **LaTeX/KaTeX** rendering for complex math and science equations.
*   **Study Vault**: Access all educational modules published by teachers with clear priority labeling (Crucial, Vital, Supporting).
*   **Interactive Leaderboard**: A gamified global ranking system featuring a 3D-podium and "Trailblazer" tie-breaker logic (earlier completion wins ranks).
*   **Doubt Section**: A collaborative space to post questions and help peers, fostering community learning.
*   **Dynamic Module Interface**: Sleek, distraction-free interface for answering questions with real-time feedback and celebratory results.
*   **Broadcast History**: Instant access to important announcements and urgent alerts from the teaching staff.

### 👩‍🏫 Teacher Command Center
*   **Central Command**: A holistic view of class health with quick access to the most vital pedagogical tools.
*   **The Auditor**: A robust management engine to create, edit, and publish study modules with specific XP rewards and priorities.
*   **Class Analytics**: Deep-dive into student performance using advanced Recharts visualizations, tracking Accuracy, Effort, and Topic Mastery.
*   **Student Management**: Detailed metrics for every student, including average time per question and subject-wise breakdowns.
*   **Doubt Management**: Resolving student queries effectively to maintain a steady learning momentum.

### 🛡️ Iron-Clad Security
*   **Session Management**: Zero-risk session handling using volatile memory (`sessionStorage`) that clears immediately on tab closure.
*   **Idle Sentry**: Automatic security logout after **20 minutes** of inactivity to protect accounts on shared/public computers.
*   **Role-Based Access**: Strict RBAC (Role-Based Access Control) for Students, Teachers, and Admins.

---

## 🚀 Getting Started

### Prerequisites
*   [Node.js](https://nodejs.org/) (v18 or higher)
*   A [Supabase](https://supabase.com/) Project

### Installation & Local Setup

1.  **Clone the repository**:
    ```bash
    git clone https://github.com/MadhurMishraX/antesia.git
    cd antesia
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Environment Configuration**:
    Create a `.env` file in the root directory and add your Supabase credentials:
    ```env
    VITE_SUPABASE_URL=your_supabase_url
    VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
    ```

4.  **Start the development server**:
    ```bash
    npm run dev
    ```

---

## 🛠️ Tech Stack

*   **Frontend**: React 18, TypeScript, Vite
*   **Styling**: Tailwind CSS (Native Dark Mode support)
*   **Animations**: Framer Motion
*   **Backend/DB**: Supabase (PostgreSQL + Real-time + Auth)
*   **Charts**: Recharts
*   **Icons**: Lucide React

---

## 🌅 Design Philosophy
Antesia follows a "Technical Dashboard" aesthetic—prioritizing information density and scannability while maintaining a clean, professional "Mission Control" feel. Every interaction is designed to reduce cognitive load and maximize focus.

---

## 🌌 Developed By
**Madhur Mishra**  
[GitHub](https://github.com/MadhurMishraX) | [LinkedIn](https://www.linkedin.com/in/madhurmishram2/)

*"Empowering the next generation of learners through structured, gamified achievement."*
