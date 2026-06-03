const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, '../frontend')));

const DATA_DIR = path.join(__dirname, 'data');
const ENGINE_PATH = path.join(__dirname, 'typex_engine.exe');
const USER_DB_FILE = path.join(DATA_DIR, 'user.txt');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure user.txt exists
if (!fs.existsSync(USER_DB_FILE)) {
    fs.writeFileSync(USER_DB_FILE, JSON.stringify([]), 'utf8');
}

// Ensure paragraphs directory exists
const PARAGRAPHS_DIR = path.join(DATA_DIR, 'paragraphs');
if (!fs.existsSync(PARAGRAPHS_DIR)) {
    fs.mkdirSync(PARAGRAPHS_DIR, { recursive: true });
}

const defaultParagraphs = {
    en_easy: [
        "The cat sat on the mat and fell fast asleep.",
        "A quick brown fox jumps over the lazy dog.",
        "She sells sea shells by the sea shore.",
        "The sun rises in the east and sets in the west.",
        "Birds fly high in the clear blue sky above."
    ],
    en_medium: [
        "Programming is the art of expressing algorithms in languages that computers can execute.",
        "Web developers use HTML to structure content and CSS to style visual presentations.",
        "Database management systems store and organize large volumes of information for fast retrieval.",
        "Learning a new language opens up fresh perspectives on different cultures.",
        "Regular exercise helps maintain physical health and mental clarity."
    ],
    en_hard: [
        "Quantum computing utilizes superposition and entanglement to perform complex computations.",
        "Artificial intelligence algorithms require massive datasets and high performance GPUs to train.",
        "Distributed database systems replicate data across multiple geographically separated nodes.",
        "Cybersecurity professionals deploy intrusion detection systems to monitor network traffic anomalies.",
        "Microservices architecture patterns decouple monolithic software systems into independent deployments."
    ],
    es_easy: [
        "El gato se sento en la alfombra y se durmio.",
        "Un rapido zorro marron salta sobre el perro.",
        "Ella vende conchas marinas a la orilla del mar.",
        "El sol sale por el este y se pone por el oeste.",
        "Las aves vuelan alto en el cielo azul despejado."
    ],
    es_medium: [
        "La programacion es el arte de expresar algoritmos en lenguajes que las computadoras ejecutan.",
        "Los desarrolladores web usan HTML para estructurar y CSS para el estilo visual de paginas.",
        "Los sistemas de bases de datos organizan grandes volumenes de informacion para busquedas.",
        "Aprender un nuevo idioma abre frescas perspectivas sobre diferentes culturas.",
        "El ejercicio regular ayuda a mantener la salud fisica y la claridad mental."
    ],
    es_hard: [
        "La computacion cuantica utiliza la superposicion para realizar calculos complejos.",
        "Los algoritmos de inteligencia artificial requieren procesadores graficos de alto rendimiento.",
        "Los sistemas distribuidos replican datos en nodos separados para garantizar disponibilidad.",
        "Los profesionales de la seguridad despliegan sistemas de deteccion para vigilar el trafico.",
        "La arquitectura de microservicios divide sistemas monoliticos en despliegues independientes."
    ],
    fr_easy: [
        "Le chat s'est assis sur le tapis et s'est endormi.",
        "Un renard brun rapide saute par-dessus le chien.",
        "Elle vend des coquillages au bord de la mer.",
        "Le soleil se leve a l'est et se couche a l'ouest.",
        "Les oiseaux volent haut dans le ciel bleu clair."
    ],
    fr_medium: [
        "La programmation est l'art d'exprimer des algorithmes dans des langages executables.",
        "Les developpeurs utilisent HTML pour structurer et CSS pour le style des pages web.",
        "Les systemes de gestion de bases de donnees organisent les informations pour la recherche.",
        "L'apprentissage d'une langue ouvre de nouvelles perspectives sur d'autres cultures.",
        "L'exercice regulier aide a maintenir la sante physique et la clarte mentale."
    ],
    fr_hard: [
        "L'informatique quantique utilise la superposition pour effectuer des calculs complexes.",
        "Les algorithmes d'intelligence artificielle necessitent des GPU a hautes performances.",
        "Les bases de donnees distribuees repliquent les donnees pour une haute disponibilite.",
        "Les experts deploient des systemes de detection pour surveiller le trafic reseau.",
        "L'architecture de microservices decouple les systemes monolithiques en applications autonomes."
    ],
    de_easy: [
        "Die Katze sass auf der Matte und schlief fest ein.",
        "Ein schneller brauner Fuchs springt ueber den Hund.",
        "Sie verkauft Muscheln am Strand der schoenen See.",
        "Die Sonne geht im Osten auf und im Westen unter.",
        "Voegel fliegen hoch am klaren blauen Himmel oben."
    ],
    de_medium: [
        "Programmierung ist die Kunst, Algorithmen in ausfuehrbaren Sprachen auszudruecken.",
        "Webentwickler verwenden HTML fuer Struktur und CSS fuer die visuelle Gestaltung.",
        "Datenbanksysteme speichern und organisieren grosse Mengen an Informationen fuer Suchen.",
        "Das Erlernen einer Sprache oeffnet neue Perspektiven auf Kulturen.",
        "Regelmaessige Bewegung hilft, die Fitness und geistige Klarheit zu foerdern."
    ],
    de_hard: [
        "Quantencomputing nutzt Superposition fuer komplexe Berechnungen auf Systemen.",
        "Algorithmen der kuenstlichen Intelligenz erfordern Grafikprozessoren mit hoher Leistung.",
        "Verteilte Datenbanksysteme replizieren Daten fuer eine hohe Verfuegbarkeit im Netz.",
        "Sicherheitsexperten installieren Erkennungssysteme zur Ueberwachung des Datenverkehrs.",
        "Microservices-Architekturen entkoppeln monolithische Softwaresysteme in Dienste."
    ]
};

// Write default paragraphs to files if they are missing
for (const [key, sentences] of Object.entries(defaultParagraphs)) {
    const [lang, diff] = key.split('_');
    const filePath = path.join(PARAGRAPHS_DIR, `${lang}_${diff}.txt`);
    if (!fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, sentences.join('\r\n'), 'utf8');
    }
}

// Helper to run the Assembly executable engine
function runEngine(args) {
    return new Promise((resolve, reject) => {
        execFile(ENGINE_PATH, args, { cwd: __dirname }, (error, stdout, stderr) => {
            if (error) {
                return reject(error);
            }
            resolve(stdout);
        });
    });
}

// Endpoint: Fetch original paragraph
app.get('/api/paragraph', async (req, res) => {
    try {
        const difficulty = req.query.difficulty || 'easy';
        const language = req.query.language || 'english';
        
        // Map language name to short code
        let lang = 'en';
        if (language === 'spanish') lang = 'es';
        else if (language === 'french') lang = 'fr';
        else if (language === 'german') lang = 'de';
        
        // Read paragraphs file
        const filePath = path.join(PARAGRAPHS_DIR, `${lang}_${difficulty}.txt`);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: `Paragraph file not found: ${lang}_${difficulty}.txt` });
        }
        
        const content = fs.readFileSync(filePath, 'utf8');
        // Split content by carriage return/line feed to get separate sentences
        const lines = content.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
        
        if (lines.length === 0) {
            return res.status(500).json({ error: 'No sentences found in paragraph file.' });
        }
        
        // Pick a random sentence
        const randomIndex = Math.floor(Math.random() * lines.length);
        const paragraph = lines[randomIndex];
        
        // Write the chosen sentence to data/input_original.txt (so the assembly calculation engine has access to it)
        const originalPath = path.join(DATA_DIR, 'input_original.txt');
        fs.writeFileSync(originalPath, paragraph, 'utf8');
        
        res.json({ paragraph });
    } catch (err) {
        console.error('Error reading paragraph in JS:', err);
        res.status(500).json({ error: 'Server error selecting paragraph.' });
    }
});

// Endpoint: Store custom practice paragraph (max 1000 characters to prevent assembly buffer overflow)
app.post('/api/paragraph/custom', (req, res) => {
    try {
        const { paragraph } = req.body;
        
        if (!paragraph || typeof paragraph !== 'string' || !paragraph.trim()) {
            return res.status(400).json({ error: 'Paragraph content cannot be empty.' });
        }
        
        const trimmedPara = paragraph.trim();
        if (trimmedPara.length > 1000) {
            return res.status(400).json({ error: 'Paragraph content exceeds the maximum limit of 1000 characters.' });
        }
        
        // Save to standard path
        const originalPath = path.join(DATA_DIR, 'input_original.txt');
        fs.writeFileSync(originalPath, trimmedPara, 'utf8');
        
        res.json({ paragraph: trimmedPara });
    } catch (err) {
        console.error('Error writing custom paragraph:', err);
        res.status(500).json({ error: 'Server error saving custom paragraph.' });
    }
});

// Helper: Hash password with SHA-256
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

// Endpoint: User signup
app.post('/api/auth/signup', (req, res) => {
    try {
        const { username, email, password } = req.body;
        
        if (!username || !email || !password || typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Username, email, and password are required.' });
        }
        
        const cleanUsername = username.trim().toLowerCase();
        const cleanEmail = email.trim().toLowerCase();
        
        if (cleanUsername.length < 3 || cleanUsername.length > 20) {
            return res.status(400).json({ error: 'Username must be between 3 and 20 characters.' });
        }
        
        if (!cleanEmail.includes('@') || cleanEmail.length < 5) {
            return res.status(400).json({ error: 'Please enter a valid email address.' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters.' });
        }
        
        const users = JSON.parse(fs.readFileSync(USER_DB_FILE, 'utf8'));
        const userExists = users.some(u => u.username === cleanUsername);
        const emailExists = users.some(u => u.email === cleanEmail);
        
        if (userExists) {
            return res.status(400).json({ error: 'Username is already taken.' });
        }
        if (emailExists) {
            return res.status(400).json({ error: 'Email is already registered.' });
        }
        
        const newUser = {
            username: cleanUsername,
            email: cleanEmail,
            passwordHash: hashPassword(password),
            signins: [new Date().toISOString()],
            history: []
        };
        
        users.push(newUser);
        fs.writeFileSync(USER_DB_FILE, JSON.stringify(users, null, 2), 'utf8');
        
        res.json({ success: true, username: cleanUsername });
    } catch (err) {
        console.error('Error during signup:', err);
        res.status(500).json({ error: 'Server error during signup.' });
    }
});

// Endpoint: User login
app.post('/api/auth/login', (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password are required.' });
        }
        
        const cleanUsername = username.trim().toLowerCase();
        const users = JSON.parse(fs.readFileSync(USER_DB_FILE, 'utf8'));
        
        const user = users.find(u => u.username === cleanUsername);
        if (!user || user.passwordHash !== hashPassword(password)) {
            return res.status(401).json({ error: 'Invalid username or password.' });
        }
        
        // Track the login in the signins list
        if (!user.signins) {
            user.signins = [];
        }
        user.signins.push(new Date().toISOString());
        
        fs.writeFileSync(USER_DB_FILE, JSON.stringify(users, null, 2), 'utf8');
        
        res.json({ success: true, username: cleanUsername });
    } catch (err) {
        console.error('Error during login:', err);
        res.status(500).json({ error: 'Server error during login.' });
    }
});

// Endpoint: Calculate speed metrics and mistakes
app.post('/api/calculate', async (req, res) => {
    try {
        console.log('Backend /api/calculate request received. Body:', req.body);
        const { typedText, originalText, timeSeconds, username, difficulty } = req.body;
        
        if (typedText === undefined || timeSeconds === undefined) {
            return res.status(400).json({ error: 'Missing typedText or timeSeconds.' });
        }
        
        let cleanUsername = null;
        if (username && typeof username === 'string') {
            cleanUsername = username.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '');
        }

        // Write transient inputs for Assembly engine
        if (originalText !== undefined) {
            fs.writeFileSync(path.join(DATA_DIR, 'input_original.txt'), String(originalText), 'utf8');
        }
        fs.writeFileSync(path.join(DATA_DIR, 'input_typed.txt'), String(typedText), 'utf8');
        fs.writeFileSync(path.join(DATA_DIR, 'input_time.txt'), String(timeSeconds), 'utf8');
        
        // Run assembly calculation engine
        await runEngine(['--calculate']);
        
        // Read results output
        const resultsPath = path.join(DATA_DIR, 'results.txt');
        if (!fs.existsSync(resultsPath)) {
            return res.status(500).json({ error: 'Assembly calculation results not found.' });
        }
        
        const resultsRaw = fs.readFileSync(resultsPath, 'utf8');
        const lines = resultsRaw.split(/\r?\n/);
        
        const results = {
            wpm: 0,
            accuracy: 0,
            correctChars: 0,
            wrongChars: 0,
            score: 0,
            rank: 'Beginner',
            mistakes: {}
        };
        
        lines.forEach(line => {
            if (line.startsWith('WPM:')) {
                results.wpm = parseInt(line.replace('WPM:', '').trim(), 10) || 0;
            } else if (line.startsWith('Accuracy:')) {
                results.accuracy = parseInt(line.replace('Accuracy:', '').trim(), 10) || 0;
            } else if (line.startsWith('CorrectChars:')) {
                results.correctChars = parseInt(line.replace('CorrectChars:', '').trim(), 10) || 0;
            } else if (line.startsWith('WrongChars:')) {
                results.wrongChars = parseInt(line.replace('WrongChars:', '').trim(), 10) || 0;
            } else if (line.startsWith('Score:')) {
                results.score = parseInt(line.replace('Score:', '').trim(), 10) || 0;
            } else if (line.startsWith('Rank:')) {
                results.rank = line.replace('Rank:', '').trim();
            } else if (line.startsWith('Mistakes:')) {
                const mistakesStr = line.replace('Mistakes:', '').trim();
                if (mistakesStr) {
                    const parts = mistakesStr.split(',');
                    parts.forEach(part => {
                        const subparts = part.split(':');
                        if (subparts.length === 2) {
                            const char = subparts[0].trim();
                            const count = parseInt(subparts[1].trim(), 10) || 0;
                            if (char) {
                                  results.mistakes[char] = count;
                            }
                        }
                    });
                }
            }
        });
        
        // Write to user profile inside user.txt if logged in
        if (cleanUsername) {
            const users = JSON.parse(fs.readFileSync(USER_DB_FILE, 'utf8'));
            const user = users.find(u => u.username === cleanUsername);
            if (user) {
                if (!user.history) {
                    user.history = [];
                }
                
                // Determine the original text that was typed against
                const finalOriginalText = originalText !== undefined 
                    ? originalText 
                    : (fs.existsSync(path.join(DATA_DIR, 'input_original.txt')) 
                        ? fs.readFileSync(path.join(DATA_DIR, 'input_original.txt'), 'utf8').trim() 
                        : '');

                const newRecord = {
                    timestamp: new Date().toISOString(),
                    wpm: results.wpm,
                    accuracy: results.accuracy,
                    score: results.score,
                    rank: results.rank,
                    difficulty: difficulty || 'easy',
                    originalText: finalOriginalText,
                    typedText: typedText,
                    timeSeconds: parseInt(timeSeconds, 10) || 0
                };
                console.log('Saving history record to user.txt:', newRecord);
                user.history.push(newRecord);
                fs.writeFileSync(USER_DB_FILE, JSON.stringify(users, null, 2), 'utf8');
            }
        }
        
        res.json(results);
    } catch (err) {
        console.error('Error during calculation:', err);
        res.status(500).json({ error: 'Server error during calculation.' });
    }
});


// Endpoint: Fetch user score history
app.get('/api/history', (req, res) => {
    try {
        const { username } = req.query;
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required.' });
        }
        
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '');
        if (!cleanUsername) {
            return res.status(400).json({ error: 'Invalid username.' });
        }
        
        const users = JSON.parse(fs.readFileSync(USER_DB_FILE, 'utf8'));
        const user = users.find(u => u.username === cleanUsername);
        if (user) {
            res.json(user.history || []);
        } else {
            res.json([]);
        }
    } catch (err) {
        console.error('Error fetching history:', err);
        res.status(500).json({ error: 'Server error fetching history.' });
    }
});

// Endpoint: Fetch user profile details (email, signins, total runs)
app.get('/api/profile', (req, res) => {
    try {
        const { username } = req.query;
        if (!username || typeof username !== 'string') {
            return res.status(400).json({ error: 'Username is required.' });
        }
        
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '');
        if (!cleanUsername) {
            return res.status(400).json({ error: 'Invalid username.' });
        }
        
        const users = JSON.parse(fs.readFileSync(USER_DB_FILE, 'utf8'));
        const user = users.find(u => u.username === cleanUsername);
        if (user) {
            res.json({
                username: user.username,
                email: user.email,
                signins: user.signins || [],
                totalRuns: user.history ? user.history.length : 0
            });
        } else {
            res.status(404).json({ error: 'User not found.' });
        }
    } catch (err) {
        console.error('Error fetching profile:', err);
        res.status(500).json({ error: 'Server error fetching profile.' });
    }
});

// Endpoint: Delete a history record
app.delete('/api/history', (req, res) => {
    try {
        const { username, timestamp } = req.body;
        if (!username || !timestamp) {
            return res.status(400).json({ error: 'Username and timestamp are required.' });
        }
        
        const cleanUsername = username.trim().toLowerCase().replace(/[^a-zA-Z0-9_-]/g, '');
        const users = JSON.parse(fs.readFileSync(USER_DB_FILE, 'utf8'));
        const user = users.find(u => u.username === cleanUsername);
        
        if (user && user.history) {
            const initialLength = user.history.length;
            user.history = user.history.filter(h => h.timestamp !== timestamp);
            
            if (user.history.length < initialLength) {
                fs.writeFileSync(USER_DB_FILE, JSON.stringify(users, null, 2), 'utf8');
                return res.json({ success: true });
            }
        }
        
        res.status(404).json({ error: 'Record not found.' });
    } catch (err) {
        console.error('Error deleting history record:', err);
        res.status(500).json({ error: 'Server error deleting history.' });
    }
});

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`TypeX Pro backend server running on http://localhost:${PORT}`);
});
