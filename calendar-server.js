const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const http = require('http');
const WebSocket = require('ws');
const multer = require('multer');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data.json');

// Configure multer for image uploads
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}${ext}`);
    }
});
const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mime = allowedTypes.test(file.mimetype);
        if (ext && mime) {
            cb(null, true);
        } else {
            cb(new Error('Only images are allowed'));
        }
    }
});

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// WebSocket clients
const clients = new Set();

// WebSocket connection handling
wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('[WS] Client connected, total clients:', clients.size);

    ws.on('close', () => {
        clients.delete(ws);
        console.log('[WS] Client disconnected, total clients:', clients.size);
    });
});

// Broadcast to all connected WebSocket clients
function broadcast(data) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(message);
        }
    });
}

// Track sent reminders to avoid duplicates
const sentReminders = new Set();

// Load or init data
function loadData() {
    try {
        if (fs.existsSync(DATA_FILE)) {
            return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
        }
    } catch (e) {}
    return { events: [], todos: [], notes: [] };
}

function saveData(data) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// Schedule event reminder immediately
function scheduleEventReminder(event) {
    if (!event.start || !event.reminder) return;

    const now = new Date();
    const eventStart = new Date(event.start);
    const reminderMinutes = event.reminder;

    let reminderTime;
    if (reminderMinutes === 0) {
        reminderTime = eventStart;
    } else {
        reminderTime = new Date(eventStart.getTime() - reminderMinutes * 60 * 1000);
    }

    // Only schedule if reminder time is in the future
    if (reminderTime > now) {
        const delay = reminderTime.getTime() - now.getTime();
        console.log(`[SCHEDULED] "${event.title}" reminder in ${Math.round(delay / 1000)} seconds`);

        setTimeout(() => {
            const reminderMessage = {
                type: 'reminder',
                event: {
                    id: event.id,
                    title: event.title,
                    description: event.description,
                    start: event.start,
                    reminder: reminderMinutes
                },
                message: reminderMinutes === 0
                    ? `"${event.title}" 现在开始`
                    : `"${event.title}" 将在 ${reminderMinutes} 分钟后开始`
            };
            console.log(`[REMINDER] ${event.title} - ${reminderMessage.message}`);
            broadcast(reminderMessage);
        }, delay);
    }
}

let data = loadData();

// Check for due reminders every 30 seconds
setInterval(() => {
    const now = new Date();

    data.events.forEach(event => {
        if (!event.start) return;

        // For reminder=0, send at event start time
        // For reminder>0, send X minutes before
        const eventStart = new Date(event.start);
        const reminderMinutes = event.reminder || 0;
        
        if (reminderMinutes === 0) {
            // At start time
            const reminderKey = `${event.id}-0`;
            if (now >= eventStart && !sentReminders.has(reminderKey)) {
                sentReminders.add(reminderKey);
                const reminderMessage = {
                    type: 'reminder',
                    event: {
                        id: event.id,
                        title: event.title,
                        description: event.description,
                        start: event.start,
                        reminder: 0
                    },
                    message: `"${event.title}" 现在开始`
                };
                console.log(`[REMINDER] ${event.title} - ${reminderMessage.message}`);
                broadcast(reminderMessage);
            }
        } else {
            // X minutes before
            const reminderTime = new Date(eventStart.getTime() - reminderMinutes * 60 * 1000);
            const reminderKey = `${event.id}-${reminderMinutes}`;
            if (now >= reminderTime && now < eventStart && !sentReminders.has(reminderKey)) {
                sentReminders.add(reminderKey);
                const reminderMessage = {
                    type: 'reminder',
                    event: {
                        id: event.id,
                        title: event.title,
                        description: event.description,
                        start: event.start,
                        reminder: reminderMinutes
                    },
                    message: `"${event.title}" 将在 ${reminderMinutes} 分钟后开始`
                };
                console.log(`[REMINDER] ${event.title} - ${reminderMessage.message}`);
                broadcast(reminderMessage);
            }
        }
    });
}, 30000);

// Check for overdue todos every minute
const sentTodoReminders = new Set();
setInterval(() => {
    const now = new Date();

    (data.todos || []).forEach(todo => {
        if (todo.completed || !todo.dueDate) return;

        const reminderKey = `${todo.id}-overdue`;
        if (sentTodoReminders.has(reminderKey)) return;

        // Check if overdue (past due date and not completed)
        const dueDateTime = new Date(todo.dueDate);
        if (now > dueDateTime) {
            sentTodoReminders.add(reminderKey);
            const dueDateStr = todo.dueDate.replace('T', ' ');
            const reminderMessage = {
                type: 'todo-overdue',
                todo: {
                    id: todo.id,
                    title: todo.title,
                    dueDate: todo.dueDate,
                    priority: todo.priority
                },
                message: `"${todo.title}" 已超过截止时间 ${dueDateStr}`
            };
            console.log(`[TODO OVERDUE] ${todo.title} - ${reminderMessage.message}`);
            broadcast(reminderMessage);
        }
    });
}, 60000);

// API Routes
app.get('/api/events', (req, res) => {
    res.json(data.events);
});

app.get('/api/events/:id', (req, res) => {
    const event = data.events.find(e => e.id === req.params.id);
    if (event) res.json(event);
    else res.status(404).json({ error: 'Not found' });
});

app.post('/api/events', (req, res) => {
    const event = {
        id: Date.now().toString(),
        ...req.body,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    data.events.push(event);
    saveData(data);
    broadcast({ type: 'event-updated', action: 'create', event });

    // Schedule reminder if set
    if (event.reminder !== undefined && event.reminder !== null) {
        scheduleEventReminder(event);
    }

    res.json(event);
});

app.put('/api/events/:id', (req, res) => {
    const idx = data.events.findIndex(e => e.id === req.params.id);
    if (idx >= 0) {
        data.events[idx] = { ...data.events[idx], ...req.body, updatedAt: new Date().toISOString() };
        saveData(data);
        broadcast({ type: 'event-updated', action: 'update', event: data.events[idx] });

        // Schedule reminder if set
        if (data.events[idx].reminder !== undefined && data.events[idx].reminder !== null) {
            scheduleEventReminder(data.events[idx]);
        }

        res.json(data.events[idx]);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.delete('/api/events/:id', (req, res) => {
    data.events = data.events.filter(e => e.id !== req.params.id);
    saveData(data);
    broadcast({ type: 'event-updated', action: 'delete', eventId: req.params.id });
    res.json({ success: true });
});

app.get('/api/events/date/:date', (req, res) => {
    const filtered = data.events.filter(e => e.start && e.start.startsWith(req.params.date));
    res.json(filtered);
});

// Todos API
app.get('/api/todos', (req, res) => {
    res.json(data.todos || []);
});

app.post('/api/todos', (req, res) => {
    const todo = {
        id: Date.now().toString(),
        title: req.body.title || '',
        completed: req.body.completed || false,
        dueDate: req.body.dueDate || null,
        priority: req.body.priority || 'medium',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    if (!data.todos) data.todos = [];
    data.todos.push(todo);
    saveData(data);
    broadcast({ type: 'todo-updated', action: 'create', todo });
    res.json(todo);
});

app.put('/api/todos/:id', (req, res) => {
    const idx = (data.todos || []).findIndex(t => t.id === req.params.id);
    if (idx >= 0) {
        data.todos[idx] = { ...data.todos[idx], ...req.body, updatedAt: new Date().toISOString() };
        saveData(data);
        broadcast({ type: 'todo-updated', action: 'update', todo: data.todos[idx] });
        res.json(data.todos[idx]);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.delete('/api/todos/:id', (req, res) => {
    if (!data.todos) data.todos = [];
    const todo = data.todos.find(t => t.id === req.params.id);
    data.todos = data.todos.filter(t => t.id !== req.params.id);
    saveData(data);
    if (todo) {
        broadcast({ type: 'todo-updated', action: 'delete', todoId: req.params.id });
    }
    res.json({ success: true });
});

// Notes API
app.get('/api/notes', (req, res) => {
    res.json(data.notes || []);
});

app.post('/api/notes', upload.array('image', 20), (req, res) => {
    // Handle multiple images (comma-separated)
    let imagePath = null;
    if (req.files && req.files.length > 0) {
        imagePath = req.files.map(f => `/uploads/${f.filename}`).join(',');
    }
    const note = {
        id: Date.now().toString(),
        title: req.body.title || '',
        content: req.body.content || '',
        color: req.body.color || '#1890ff',
        date: req.body.date || new Date().toISOString().slice(0, 10),
        image: imagePath,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };
    if (!data.notes) data.notes = [];
    data.notes.push(note);
    saveData(data);
    broadcast({ type: 'note-updated', action: 'create', note });
    res.json(note);
});

app.put('/api/notes/:id', upload.array('image', 20), (req, res) => {
    const idx = (data.notes || []).findIndex(n => n.id === req.params.id);
    if (idx >= 0) {
        const oldNote = data.notes[idx];

        // If new images are uploaded, handle old images
        if (req.files && req.files.length > 0 && oldNote.image) {
            // Delete old images that are not in the remaining list
            const oldImages = oldNote.image.split(',');
            const newFiles = req.files.map(f => `/uploads/${f.filename}`);
            const remainingImages = req.body.remainingImages ? req.body.remainingImages.split(',') : [];

            // Delete old images not kept
            oldImages.forEach(img => {
                if (!remainingImages.includes(img)) {
                    const oldPath = path.join(__dirname, img);
                    if (fs.existsSync(oldPath)) {
                        fs.unlinkSync(oldPath);
                    }
                }
            });
        }

        // If removeImage flag is set, delete all old images
        if (req.body.removeImage === 'true' && oldNote.image) {
            const oldImages = oldNote.image.split(',');
            oldImages.forEach(img => {
                const oldPath = path.join(__dirname, img);
                if (fs.existsSync(oldPath)) {
                    fs.unlinkSync(oldPath);
                }
            });
        }

        const updateData = { ...req.body };
        if (req.files && req.files.length > 0) {
            // New images uploaded - combine with remaining if any
            const newFiles = req.files.map(f => `/uploads/${f.filename}`);
            if (req.body.remainingImages) {
                const remaining = req.body.remainingImages.split(',');
                updateData.image = [...remaining, ...newFiles].join(',');
            } else {
                updateData.image = newFiles.join(',');
            }
        } else if (req.body.removeImage === 'true') {
            updateData.image = null;
        } else if (req.body.remainingImages) {
            // Only keeping some existing images
            updateData.image = req.body.remainingImages;
        }

        data.notes[idx] = { ...oldNote, ...updateData, updatedAt: new Date().toISOString() };
        saveData(data);
        broadcast({ type: 'note-updated', action: 'update', note: data.notes[idx] });
        res.json(data.notes[idx]);
    } else {
        res.status(404).json({ error: 'Not found' });
    }
});

app.delete('/api/notes/:id', (req, res) => {
    if (!data.notes) data.notes = [];
    const note = data.notes.find(n => n.id === req.params.id);
    // Delete associated image file
    if (note && note.image) {
        const imagePath = path.join(__dirname, note.image);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
        }
    }
    data.notes = data.notes.filter(n => n.id !== req.params.id);
    saveData(data);
    if (note) {
        broadcast({ type: 'note-updated', action: 'delete', noteId: req.params.id });
    }
    res.json({ success: true });
});

app.post('/api/reminder/push', (req, res) => {
    const { eventId, message } = req.body;
    const event = data.events.find(e => e.id === eventId);
    if (event) {
        console.log(`[REMINDER] ${event.title}: ${message || event.description}`);
        
        // Broadcast to all WebSocket clients
        const reminderMessage = {
            type: 'reminder',
            event: {
                id: event.id,
                title: event.title,
                description: event.description,
                start: event.start,
                reminder: event.reminder
            },
            message: message || `"${event.title}" 将开始`
        };
        broadcast(reminderMessage);
        
        res.json({ success: true, message: 'Reminder pushed' });
    } else {
        res.status(404).json({ error: 'Event not found' });
    }
});

// Push todo reminder
app.post('/api/todo/reminder/push', (req, res) => {
    const { todoId, message } = req.body;
    const todo = (data.todos || []).find(t => t.id === todoId);
    if (todo) {
        console.log(`[TODO REMINDER] ${todo.title}: ${message || '到期提醒'}`);

        const reminderMessage = {
            type: 'todo-reminder',
            todo: {
                id: todo.id,
                title: todo.title,
                dueDate: todo.dueDate,
                priority: todo.priority
            },
            message: message || `"${todo.title}" 截止日期: ${todo.dueDate}`
        };
        broadcast(reminderMessage);

        res.json({ success: true, message: 'Todo reminder pushed' });
    } else {
        res.status(404).json({ error: 'Todo not found' });
    }
});

// Serve calendar HTML
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'calendar.html'));
});

server.listen(PORT, () => {
    console.log(`Calendar API running at http://localhost:${PORT}`);
    console.log(`WebSocket running at ws://localhost:${PORT}`);
    console.log(`API Endpoints:`);
    console.log(`=== Events ===`);
    console.log(`  GET    /api/events              - Get all events`);
    console.log(`  GET    /api/events/:id         - Get single event`);
    console.log(`  POST   /api/events             - Create event`);
    console.log(`  PUT    /api/events/:id         - Update event`);
    console.log(`  DELETE /api/events/:id         - Delete event`);
    console.log(`  GET    /api/events/date/:date  - Get events by date`);
    console.log(`  POST   /api/reminder/push      - Push event reminder`);
    console.log(`=== Todos ===`);
    console.log(`  GET    /api/todos               - Get all todos`);
    console.log(`  POST   /api/todos              - Create todo`);
    console.log(`  PUT    /api/todos/:id          - Update todo`);
    console.log(`  DELETE /api/todos/:id          - Delete todo`);
    console.log(`  POST   /api/todo/reminder/push - Push todo reminder`);
    console.log(`=== Notes ===`);
    console.log(`  GET    /api/notes              - Get all notes`);
    console.log(`  POST   /api/notes             - Create note (multipart/form-data, image optional)`);
    console.log(`  PUT    /api/notes/:id         - Update note (multipart/form-data, image optional)`);
    console.log(`  DELETE /api/notes/:id         - Delete note`);
    console.log(`=== WebSocket Messages ===`);
    console.log(`  reminder     - Event reminder notification`);
    console.log(`  todo-updated - Todo created/updated/deleted`);
    console.log(`  todo-overdue - Todo past due date`);
    console.log(`  todo-reminder - Todo manual reminder`);
    console.log(`  note-updated - Note created/updated/deleted`);
});

