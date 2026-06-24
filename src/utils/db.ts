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

    CREATE TABLE IF NOT EXISTS question_sets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE,
        description TEXT,
        createdBy TEXT,
        visibility TEXT DEFAULT 'public', -- 'public' or 'event'
        is_archived INTEGER DEFAULT 0,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS curated_questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        set_id INTEGER,
        topic TEXT,
        difficulty TEXT,
        question TEXT,
        option_a TEXT,
        option_b TEXT,
        option_c TEXT,
        option_d TEXT,
        correct TEXT,
        explanation TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (set_id) REFERENCES question_sets(id)
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

        // Return the total XP for this topic
        const result = db.prepare('SELECT SUM(amount) as total FROM scores WHERE userId = ? AND topic = ?').get(userId, topic) as { total: number };
        return result?.total || 0;
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
        return db.prepare('SELECT * FROM curated_questions WHERE topic = ? AND difficulty = ? AND set_id IS NULL').all(topic, difficulty);
    },

    getQuestionsBySet: (setName: string) => {
        return db.prepare(`
            SELECT q.* FROM curated_questions q 
            JOIN question_sets s ON q.set_id = s.id 
            WHERE s.name = ? AND s.is_archived = 0
        `).all(setName);
    },

    getQuestionsBySetId: (setId: number) => {
        return db.prepare('SELECT * FROM curated_questions WHERE set_id = ?').all(setId);
    },

    getAvailableSets: (onlyPublic = false) => {
        const query = onlyPublic 
            ? 'SELECT * FROM question_sets WHERE visibility = "public" AND is_archived = 0' 
            : 'SELECT * FROM question_sets WHERE is_archived = 0';
        return db.prepare(query).all();
    },

    getSetDetails: (setName: string) => {
        return db.prepare('SELECT * FROM question_sets WHERE name = ?').get(setName) as any;
    },

    addCuratedQuestion: (q: any) => {
        const stmt = db.prepare(`
            INSERT INTO curated_questions (set_id, topic, difficulty, question, option_a, option_b, option_c, option_d, correct, explanation)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        return stmt.run(q.set_id || null, q.topic, q.difficulty, q.question, q.a, q.b, q.c, q.d, q.correct, q.explanation);
    },

    createSet: (name: string, description: string, createdBy: string, visibility: string = 'public') => {
        return db.prepare('INSERT INTO question_sets (name, description, createdBy, visibility) VALUES (?, ?, ?, ?)').run(name, description, createdBy, visibility);
    },

    updateSetVisibility: (name: string, visibility: string) => {
        return db.prepare('UPDATE question_sets SET visibility = ? WHERE name = ?').run(visibility, name);
    },

    archiveSet: (name: string, archived: boolean) => {
        return db.prepare('UPDATE question_sets SET is_archived = ? WHERE name = ?').run(archived ? 1 : 0, name);
    },

    deleteSet: (name: string) => {
        const set = dbManager.getSetDetails(name);
        if (set) {
            db.prepare('DELETE FROM curated_questions WHERE set_id = ?').run(set.id);
            db.prepare('DELETE FROM question_sets WHERE name = ?').run(name);
        }
    },

    clearScores: () => {
        db.prepare('DELETE FROM scores').run();
        db.prepare('UPDATE users SET totalKxp = 0').run();
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
