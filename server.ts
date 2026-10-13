import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { containsInappropriateLanguage } from './src/utils/profanityFilter';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Persistent storage file
const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'rockstars.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

interface StudentRecord {
  id: string;
  name: string;
  avatar: string;
  passcode: string;
  classCode: string;
  totalScore: number;
  highestStreak: number;
  quizzesCompleted: number;
  levelProgress: Record<number, { stars: number; highAccuracy: number }>;
  bonusStars?: number;
  badges: string[];
  updatedAt: string;
}

interface InitialData {
  students: StudentRecord[];
}

// Seed initial classroom rockstars so leaderboard is active immediately
const defaultStudents: StudentRecord[] = [
  {
    id: 's_maya',
    name: 'Drummer Maya',
    avatar: '🥁',
    passcode: '1234',
    classCode: 'ROOM-101',
    totalScore: 3850,
    highestStreak: 12,
    quizzesCompleted: 15,
    levelProgress: { 1: { stars: 3, highAccuracy: 100 }, 2: { stars: 3, highAccuracy: 95 }, 3: { stars: 3, highAccuracy: 90 }, 4: { stars: 3, highAccuracy: 92 }, 5: { stars: 3, highAccuracy: 90 }, 6: { stars: 3, highAccuracy: 88 } },
    badges: ['quarter_master', 'eighth_explorer', 'broken_beat_boss', 'triplet_titan', 'rhythm_maestro'],
    updatedAt: new Date(Date.now() - 3600000).toISOString()
  },
  {
    id: 's_leo',
    name: 'Leo Shredder',
    avatar: '🎸',
    passcode: '1234',
    classCode: 'ROOM-101',
    totalScore: 2980,
    highestStreak: 9,
    quizzesCompleted: 12,
    levelProgress: { 1: { stars: 3, highAccuracy: 100 }, 2: { stars: 3, highAccuracy: 90 }, 3: { stars: 3, highAccuracy: 90 }, 4: { stars: 3, highAccuracy: 85 }, 5: { stars: 2, highAccuracy: 80 } },
    badges: ['quarter_master', 'eighth_explorer', 'broken_beat_boss'],
    updatedAt: new Date(Date.now() - 7200000).toISOString()
  },
  {
    id: 's_zoe',
    name: 'Zoe BeatBox',
    avatar: '🎤',
    passcode: '1234',
    classCode: 'ROOM-101',
    totalScore: 2150,
    highestStreak: 8,
    quizzesCompleted: 10,
    levelProgress: { 1: { stars: 3, highAccuracy: 95 }, 2: { stars: 3, highAccuracy: 85 }, 3: { stars: 2, highAccuracy: 85 }, 4: { stars: 2, highAccuracy: 80 } },
    badges: ['quarter_master', 'eighth_explorer'],
    updatedAt: new Date(Date.now() - 10800000).toISOString()
  },
  {
    id: 's_sam',
    name: 'Sam Keytar',
    avatar: '🎹',
    passcode: '1234',
    classCode: 'ROOM-101',
    totalScore: 1650,
    highestStreak: 6,
    quizzesCompleted: 8,
    levelProgress: { 1: { stars: 3, highAccuracy: 90 }, 2: { stars: 2, highAccuracy: 80 }, 3: { stars: 2, highAccuracy: 80 } },
    badges: ['quarter_master', 'eighth_explorer'],
    updatedAt: new Date(Date.now() - 14400000).toISOString()
  },
  {
    id: 's_charlie',
    name: 'Charlie Bass',
    avatar: '⚡',
    passcode: '1234',
    classCode: 'ROOM-101',
    totalScore: 1320,
    highestStreak: 5,
    quizzesCompleted: 6,
    levelProgress: { 1: { stars: 2, highAccuracy: 85 }, 2: { stars: 2, highAccuracy: 75 } },
    badges: ['quarter_master'],
    updatedAt: new Date(Date.now() - 18000000).toISOString()
  }
];

function loadData(): InitialData {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const content = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(content);
    }
  } catch (err) {
    console.error('Failed reading data file:', err);
  }
  return { students: defaultStudents };
}

function saveData(data: InitialData) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed writing data file:', err);
  }
}

let store: InitialData = loadData();

// API Endpoints

// 1. Get Leaderboard
app.get('/api/leaderboard', (req, res) => {
  const classCode = (req.query.classCode as string) || 'ALL';
  let filtered = store.students;

  if (classCode && classCode !== 'ALL') {
    filtered = filtered.filter(s => s.classCode.toUpperCase() === classCode.toUpperCase());
  }

  // Sort descending by total score
  const sorted = [...filtered].sort((a, b) => b.totalScore - a.totalScore);
  res.json({
    leaderboard: sorted.map((s, index) => {
      const lvls = Object.keys(s.levelProgress || {}).map(Number);
      const highestLevel = lvls.length > 0 ? Math.max(...lvls) : 1;
      return {
        rank: index + 1,
        id: s.id,
        name: s.name,
        avatar: s.avatar,
        classCode: s.classCode,
        totalScore: s.totalScore,
        highestLevel,
        highestStreak: s.highestStreak,
        quizzesCompleted: s.quizzesCompleted,
        badgesCount: s.badges.length,
        starsCount: Object.values(s.levelProgress || {}).reduce((acc, curr) => acc + curr.stars, 0) + (s.bonusStars || 0)
      };
    })
  });
});

// 2. Student Login or Register
app.post('/api/students/login', (req, res) => {
  const { name, passcode, avatar, classCode } = req.body;
  if (!name || typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ error: 'Name is required' });
  }

  const cleanName = name.trim();
  if (containsInappropriateLanguage(cleanName)) {
    return res.status(400).json({
      error: 'That rockstar name contains inappropriate language. Please choose a school-friendly name!'
    });
  }

  const cleanPass = (passcode || '1234').toString().trim();
  const cleanClass = (classCode || 'ROOM-101').toString().trim().toUpperCase();

  let student = store.students.find(s => s.name.toLowerCase() === cleanName.toLowerCase());

  if (student) {
    // If student exists, verify passcode
    if (student.passcode !== cleanPass) {
      return res.status(401).json({ error: 'Incorrect passcode for this Rockstar name!' });
    }
    // Update class or avatar if changed
    if (avatar) student.avatar = avatar;
    if (cleanClass) student.classCode = cleanClass;
    student.updatedAt = new Date().toISOString();
  } else {
    // Create new student profile
    student = {
      id: 's_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      name: cleanName,
      avatar: avatar || '🎸',
      passcode: cleanPass,
      classCode: cleanClass,
      totalScore: 0,
      highestStreak: 0,
      quizzesCompleted: 0,
      levelProgress: {},
      badges: [],
      updatedAt: new Date().toISOString()
    };
    store.students.push(student);
  }

  saveData(store);
  res.json({ student });
});

// 3. Update Student Progress & Score
app.post('/api/students/score', (req, res) => {
  const { studentId, pointsEarned, streak, level, stars, accuracy, newBadges } = req.body;
  if (!studentId) {
    return res.status(400).json({ error: 'Student ID required' });
  }

  const student = store.students.find(s => s.id === studentId);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  student.totalScore += Math.max(0, Number(pointsEarned) || 0);
  if (streak && streak > student.highestStreak) {
    student.highestStreak = streak;
  }
  student.quizzesCompleted += 1;

  if (level !== undefined && stars !== undefined) {
    const lvlNum = Number(level);
    const prev = student.levelProgress[lvlNum] || { stars: 0, highAccuracy: 0 };
    student.levelProgress[lvlNum] = {
      stars: Math.max(prev.stars, Number(stars) || 0),
      highAccuracy: Math.max(prev.highAccuracy, Number(accuracy) || 0)
    };
  }

  if (Array.isArray(newBadges)) {
    for (const b of newBadges) {
      if (!student.badges.includes(b)) {
        student.badges.push(b);
      }
    }
  }

  student.updatedAt = new Date().toISOString();
  saveData(store);

  res.json({ success: true, student });
});

// 4. Get Student Profile
app.get('/api/students/:id', (req, res) => {
  const student = store.students.find(s => s.id === req.params.id);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }
  res.json({ student });
});

// 5. Update Student Profile / Scores / Passcode (Teacher/Student Edit)
app.put('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const { name, avatar, passcode, classCode, totalScore, highestStreak, starsCount } = req.body;

  const student = store.students.find(s => s.id === id);
  if (!student) {
    return res.status(404).json({ error: 'Student not found' });
  }

  if (name !== undefined) {
    const cleanName = String(name).trim();
    if (!cleanName) {
      return res.status(400).json({ error: 'Name cannot be empty' });
    }
    if (containsInappropriateLanguage(cleanName)) {
      return res.status(400).json({ error: 'Inappropriate language is blocked.' });
    }
    student.name = cleanName;
  }

  if (avatar !== undefined) student.avatar = String(avatar);
  if (passcode !== undefined) student.passcode = String(passcode).trim();
  if (classCode !== undefined) student.classCode = String(classCode).trim().toUpperCase();
  if (totalScore !== undefined) student.totalScore = Math.max(0, Number(totalScore) || 0);
  if (highestStreak !== undefined) student.highestStreak = Math.max(0, Number(highestStreak) || 0);
  if (starsCount !== undefined) {
    const targetStars = Math.max(0, Number(starsCount) || 0);
    const currentLevelStars = Object.values(student.levelProgress || {}).reduce((acc, curr) => acc + curr.stars, 0);
    student.bonusStars = Math.max(0, targetStars - currentLevelStars);
  }

  student.updatedAt = new Date().toISOString();
  saveData(store);

  res.json({ success: true, student });
});

// 6. Delete Student Profile (Admin)
app.delete('/api/students/:id', (req, res) => {
  const { id } = req.params;
  const index = store.students.findIndex(s => s.id === id);
  if (index !== -1) {
    store.students.splice(index, 1);
    saveData(store);
  }
  res.json({ success: true });
});

// Production / Dev handling
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  if (!isProd) {
    const { createServer } = await import('vite');
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Denti Rhythm Rockstars server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
