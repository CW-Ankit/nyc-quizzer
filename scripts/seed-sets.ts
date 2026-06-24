import { dbManager } from '../src/utils/db.js';

const TEST_SETS = [
    {
        name: 'Web Dev Fundamentals',
        description: 'Basic HTML, CSS, and JS concepts.',
        visibility: 'public',
        questions: [
            { topic: 'webdev', difficulty: 'Easy', question: 'Which HTML tag is used for a hyperlink?', a: '<a>', b: '<link>', c: '<href>', d: '<url>', correct: 'a', explanation: 'The <a> tag defines a hyperlink.' },
            { topic: 'webdev', difficulty: 'Medium', question: 'What does CSS stand for?', a: 'Creative Style Sheets', b: 'Cascading Style Sheets', c: 'Computer Style Sheets', d: 'Colorful Style Sheets', correct: 'b', explanation: 'CSS stands for Cascading Style Sheets.' },
        ]
    },
    {
        name: 'Database Pro',
        description: 'Deep dive into SQL and NoSQL.',
        visibility: 'public',
        questions: [
            { topic: 'databases', difficulty: 'Medium', question: 'Which SQL command is used to extract data from a database?', a: 'GET', b: 'EXTRACT', c: 'SELECT', d: 'OPEN', correct: 'c', explanation: 'The SELECT statement is used to select data from a database.' },
            { topic: 'databases', difficulty: 'Hard', question: 'What is ACID in databases?', a: 'Atomicity, Consistency, Isolation, Durability', b: 'Access, Control, Integrity, Data', c: 'Array, Collection, Index, Data', d: 'Atomic, Central, Integrated, Durable', correct: 'a', explanation: 'ACID stands for Atomicity, Consistency, Isolation, and Durability.' },
        ]
    },
    {
        name: 'Cybersecurity Challenge',
        description: 'An event-only set for advanced security enthusiasts.',
        visibility: 'event',
        questions: [
            { topic: 'cybersecurity', difficulty: 'Hard', question: 'What is a "SQL Injection" attack?', a: 'Injecting code into a physical server', b: 'Inserting malicious SQL code into an entry field to manipulate a database', c: 'A type of wireless interference', d: 'Brute forcing a password', correct: 'b', explanation: 'SQL injection is a web security vulnerability that allows an attacker to interfere with the queries that an application makes to its database.' },
        ]
    }
];

async function seedSets() {
    console.log('🌱 Starting Set Seeding...');
    
    try {
        for (const set of TEST_SETS) {
            console.log(`Creating set: ${set.name}...`);
            const result = dbManager.createSet(set.name, set.description, 'System-Seed', set.visibility);
            
            // We need to fetch the ID of the set we just created to link questions
            const setDetails = dbManager.getSetDetails(set.name);
            
            if (setDetails && setDetails.id) {
                for (const q of set.questions) {
                    dbManager.addCuratedQuestion({
                        set_id: setDetails.id,
                        ...q
                    });
                }
                console.log(`✅ Added ${set.questions.length} questions to [${set.name}]`);
            }
        }

        // Also add some "General" questions that aren't part of any set
        console.log('Adding general (non-set) questions...');
        dbManager.addCuratedQuestion({
            topic: 'os', difficulty: 'Easy', question: 'What is the core of an Operating System?', a: 'Kernel', b: 'Shell', c: 'Driver', d: 'BIOS', correct: 'a', explanation: 'The kernel is the central component of an operating system.'
        });

        console.log('✨ Seeding complete! You now have themed sets and general questions.');
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    }
}

seedSets();
