import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'data', 'knowledge.db');

// Ensure data directory exists
if (!fs.existsSync(path.dirname(dbPath))) {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true });
}

const db = new Database(dbPath);

// Initialize Schema
db.exec(`
    CREATE TABLE IF NOT EXISTS users (
        userId TEXT PRIMARY KEY,
        username TEXT,
        totalKxp INTEGER DEFAULT 0,
        joinedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS scores (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        userId TEXT,
        topic TEXT,
        amount INTEGER,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES users(userId)
    );

    CREATE TABLE IF NOT EXISTS curated_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        topic TEXT,
        difficulty TEXT,
        question TEXT,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct TEXT,
        explanation TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS boss_attempts (
        userId TEXT,
        date DATE DEFAULT CURRENT_DATE,
        PRIMARY KEY (userId, date)
    );

    CREATE TABLE IF NOT EXISTS bot_settings (
        key TEXT PRIMARY KEY,
        value TEXT
    );
`);


export const dbManager = {
    // User Management
    ensureUser: (userId: string, username: string) => {
        const stmt = db.prepare('INSERT OR IGNORE INTO users (userId, username) VALUES (?, ?)');
        stmt.run(userId, username);
    },

    addUserXp: (userId: string, topic: string, amount: number, username: string) => {
        // Update total K-XP and keep username current
        db.prepare('UPDATE users SET totalKxp = totalKxp + ?, username = ? WHERE userId = ?').run(amount, username, userId);
        
        // Log score for time-based leaderboards
        db.prepare('INSERT INTO scores (userId, topic, amount) VALUES (?, ?, ?)').run(userId, topic, amount);
    },

    // Leaderboard Queries
    getLeaderboard: (timeframe: 'daily' | 'weekly' | 'monthly' | 'alltime', topic?: string, limit = 100) => {
        let dateFilter = '';
        if (timeframe === 'daily') dateFilter = "AND timestamp >= date('now')";
        if (timeframe === 'weekly') dateFilter = "AND timestamp >= date('now', '-7 days')";
        if (timeframe === 'monthly') dateFilter = "AND timestamp >= date('now', '-30 days')";

        const topicFilter = topic ? `AND topic = ?` : '';

        const query = `
            SELECT u.username, SUM(s.amount) as total
            FROM scores s
            JOIN users u ON s.userId = u.userId
            WHERE 1=1 ${dateFilter} ${topicFilter}
            GROUP BY s.userId
            ORDER BY total DESC
            LIMIT ?
        `;

        const params = topic ? [topic, limit] : [limit];
        return db.prepare(query).all(...params);
    },

    // Question Management
    getCuratedQuestions: (topic: string, difficulty: string) => {
        return db.prepare('SELECT * FROM curated_questions WHERE topic = ? AND difficulty = ?').all(topic, difficulty);
    },

    addCuratedQuestion: (q: any) => {
        const stmt = db.prepare(`
            INSERT INTO curated_questions (topic, difficulty, question, option_a, option_b, option_c, option_d, correct, explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(q.topic, q.difficulty, q.question, q.a, q.b, q.c, q.d, q.correct, q.explanation);
    },

    // Boss Logic
    hasAttemptedBoss: (userId: string) => {
        const result = db.prepare('SELECT 1 FROM boss_attempts WHERE userId = ? AND date = CURRENT_DATE').get(userId);
        return !!result;
    },

    recordBossAttempt: (userId: string) => {
        db.prepare('INSERT OR IGNORE INTO boss_attempts (userId) VALUES (?)').run(userId);
    },

    getUserStats: (userId: string) => {
        const user = db.prepare('SELECT * FROM users WHERE userId = ?').get(userId) as any;
        const topicStats = db.prepare('SELECT topic, SUM(amount) as total FROM scores WHERE userId = ? GROUP BY topic ORDER BY total DESC').all(userId) as any[];
        
        return { user, topicStats };
    }
};
