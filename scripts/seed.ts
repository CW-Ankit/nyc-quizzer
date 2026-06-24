import { dbManager } from '../src/utils/db.js';

const seedData = [
    // Web Dev - Easy
    { topic: 'webdev', difficulty: 'Easy', question: 'What does HTML stand for?', a: 'Hyper Text Markup Language', b: 'High Tech Modern Language', c: 'Hyperlink Text Management Language', d: 'Home Tool Markup Language', correct: 'a', explanation: 'HTML stands for HyperText Markup Language, the standard markup language for documents designed to be displayed in a web browser.' },
    { topic: 'webdev', difficulty: 'Easy', question: 'Which CSS property controls the text size?', a: 'font-style', b: 'text-size', c: 'font-size', d: 'text-style', correct: 'c', explanation: 'The font-size property sets the size of the font.' },
    
    // Databases - Medium
    { topic: 'databases', difficulty: 'Medium', question: 'Which of the following is a NoSQL database?', a: 'MySQL', b: 'PostgreSQL', c: 'MongoDB', d: 'SQLite', correct: 'c', explanation: 'MongoDB is a document-oriented NoSQL database, whereas the others are relational (SQL).' },
    { topic: 'databases', difficulty: 'Medium', question: 'What is a Foreign Key?', a: 'A key that uniquely identifies a row', b: 'A key used to link two tables together', c: 'A key that allows null values', d: 'A key that cannot be changed', correct: 'b', explanation: 'A foreign key is a column or group of columns in a relational database table that provides a link between data in two tables.' },

    // OS - Hard
    { topic: 'os', difficulty: 'Hard', question: 'What is "thrashing" in an operating system?', a: 'When the CPU is too fast for the RAM', b: 'Excessive paging occurring when the OS spends more time swapping than executing', c: 'A method of cleaning the hard drive', d: 'A type of deadlock', correct: 'b', explanation: 'Thrashing happens when the system spends more time swapping pages in and out of memory than executing actual instructions.' },
    
    // Networking - Easy
    { topic: 'networking', difficulty: 'Easy', question: 'What is the purpose of a DNS server?', a: 'To assign IP addresses', b: 'To translate domain names to IP addresses', c: 'To encrypt web traffic', d: 'To route packets between networks', correct: 'b', explanation: 'DNS (Domain Name System) acts like the phonebook of the internet, translating human-readable names like google.com into IP addresses.' },

    // Cybersecurity - Medium
    { topic: 'cybersecurity', difficulty: 'Medium', question: 'What is a "Man-in-the-Middle" (MitM) attack?', a: 'A DDoS attack', b: 'An attack where the attacker secretly relays and possibly alters communication between two parties', c: 'A type of phishing email', d: 'Injecting malicious code into a website', correct: 'b', explanation: 'In a MitM attack, the attacker intercepts communication between two parties to steal data or impersonate them.' },
];

async function seed() {
    console.log('🌱 Starting database seeding...');
    try {
        seedData.forEach(q => {
            dbManager.addCuratedQuestion(q);
        });
        console.log(`✅ Successfully seeded ${seedData.length} questions!`);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
    }
}

seed();
