# NYC Quizzer Bot - Knowledge Ecosystem

## 🎯 Project Vision
The NYC Quizzer Bot is not just a trivia bot, but a system to identify and reward technical expertise within the community. It separates "Activity XP" (handled by Arcane) from "Knowledge XP," creating a meritocracy based on technical skill.

## 🛠 Core Functionality

### 1. Broadcast Mode (Passive Learning)
- **Mechanism:** AI-generated technical questions dropped in random intervals.
- **Source:** Generative AI (via OpenRouter) for varied and fresh content.
- **Competition:** First-come, first-served. The fastest correct answer wins.
- **Goal:** Keep the server engaged with quick technical challenges.

### 2. Dedicated Quiz Mode (Event/Study)
- **Access Control:** Restricted to users with the `Not your Pal` role.
- **Location Control:** Only executable in designated Quiz Channels or Voice Channels.
- **Customization:** The initiator can define:
  - **Topic:** (e.g., Web Dev, OS, DBMS, Networking, etc.)
  - **Difficulty:** Easy, Medium, Hard.
  - **Length:** Number of questions.
- **Source:** Curated, high-quality static question banks.

### 3. The "Daily Boss" Question
- **Frequency:** Once every 24 hours.
- **Difficulty:** Extremely Hard.
- **Rules:** Only one attempt per user.
- **Reward:** Massive Knowledge XP boost.

## 🏆 Reward & XP System

### Knowledge XP (K-XP)
K-XP is calculated based on two factors: **Difficulty** and **Speed**.
- **Formula:** `Points = (BaseDifficultyPoints * Multiplier) / TimeTakenSeconds`
- **Topic Tracking:** XP is tracked per topic to determine "Experts."
- **Time-Slicing:** Scores are tracked across four dimensions:
  - Daily
  - Weekly
  - Monthly
  - All-Time

### Expertise & Roles
- **Topic Leaderboards:** Users who dominate a specific topic (e.g., "Top Cybersecurity Player") are recognized.
- **Expert Roles:** Automatic role assignment for the top-tier players in specific domains.

## ⌨️ Command Specifications

| Command | Description | Access |
| :--- | :--- | :--- |
| `/quiz start` | Starts a customized quiz session (Topic, Difficulty, Length) | `Not your Pal` |
| `/quiz leaderboard` | Paginated leaderboard with filters for Time (Daily/etc) and Topic | Everyone |
| `/quiz stats` | Shows personal K-XP, rank, and topic expertise | Everyone |
| `/quiz admin` | Management of curated questions and bot settings | Admins |

## 🏗 Technical Stack
- **Runtime:** Node.js (ESM) with TypeScript.
- **Framework:** `discord.js`.
- **AI:** OpenRouter API.
- **Storage:** SQLite (for complex XP tracking, time-based leaderboards, and pagination).
- **Scheduling:** `node-cron`.

## ⚠️ Implementation Constraints
- **Anti-Spam:** Prevent multiple active quizzes in the same channel.
- **Performance:** Use pagination for leaderboards to avoid hitting Discord's embed limits.
- **Validation:** Strict role and channel checks for Dedicated Mode.
