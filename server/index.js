import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Logging Middleware
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// Database connection
const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
});

// Migration function to update DB schema
const runMigrations = async () => {
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Add type column if not exists
      await client.query(`
        ALTER TABLE practice_logs 
        ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'practice'
      `);

      // Update status check constraint
      // First try to drop the constraint if it exists. 
      // Note: The name might vary, but standard naming is table_column_check.
      // We'll try a few common names or just ignore error if not found? 
      // Better to check catalog, but for this env we'll try the most likely name from init.sql context.
      // If init.sql was used, it's likely practice_logs_status_check.
      
      try {
        await client.query(`
            ALTER TABLE practice_logs 
            DROP CONSTRAINT IF EXISTS practice_logs_status_check
        `);
      } catch (e) {
        console.log('Constraint might not exist or has different name, proceeding...');
      }

      // Add the new constraint
      await client.query(`
        ALTER TABLE practice_logs 
        ADD CONSTRAINT practice_logs_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected', 'exam_passed', 'study_completed'))
      `);

      // Add avatar_url column to wizards table
      await client.query(`
        ALTER TABLE wizards
        ADD COLUMN IF NOT EXISTS avatar_url TEXT
      `);

      // Add managed_skills column to wizards table (for semi-admins/moderators)
      await client.query(`
        ALTER TABLE wizards
        ADD COLUMN IF NOT EXISTS managed_skills TEXT[] DEFAULT '{}'
      `);

      // Add moderator approval columns to practice_logs
      await client.query(`
        ALTER TABLE practice_logs
        ADD COLUMN IF NOT EXISTS moderator_approval_id UUID REFERENCES wizards(id),
        ADD COLUMN IF NOT EXISTS moderator_approved_at TIMESTAMPTZ
      `);

      // Add skill_metadata table
      await client.query(`
        CREATE TABLE IF NOT EXISTS skill_metadata (
          skill_name TEXT PRIMARY KEY,
          responsible_person_name TEXT,
          responsible_person_link TEXT,
          description TEXT,
          updated_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);
      
      // Add description column if it doesn't exist (for existing tables)
      await client.query(`
        ALTER TABLE skill_metadata 
        ADD COLUMN IF NOT EXISTS description TEXT
      `);

      // Add notifications table
      await client.query(`
        CREATE TABLE IF NOT EXISTS notifications (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES wizards(id) ON DELETE CASCADE,
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            read BOOLEAN DEFAULT FALSE,
            link TEXT,
            created_at TIMESTAMPTZ DEFAULT NOW()
        )
      `);

      // Add rejection_reason to practice_logs
      await client.query(`
        ALTER TABLE practice_logs 
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT
      `);

      // Add moderator_proposed_status column if not exists
      await client.query(`
        ALTER TABLE practice_logs 
        ADD COLUMN IF NOT EXISTS moderator_proposed_status VARCHAR(50)
      `);

      // Add race, age and faculty columns to wizards table
      await client.query(`
        ALTER TABLE wizards
        ADD COLUMN IF NOT EXISTS race TEXT DEFAULT 'Человек',
        ADD COLUMN IF NOT EXISTS age TEXT DEFAULT 'Хогвартс',
        ADD COLUMN IF NOT EXISTS faculty TEXT
      `);

      // Add race_change_requests table
      await client.query(`
        CREATE TABLE IF NOT EXISTS race_change_requests (
            id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
            user_id UUID NOT NULL REFERENCES wizards(id) ON DELETE CASCADE,
            requested_race TEXT NOT NULL,
            reason TEXT NOT NULL,
            explanation TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
            rejection_reason TEXT,
            admin_id UUID REFERENCES wizards(id),
            created_at TIMESTAMPTZ DEFAULT NOW(),
            processed_at TIMESTAMPTZ
        )
      `);

      await client.query('COMMIT');
      console.log('Migrations completed successfully');
    } catch (err) {
      await client.query('ROLLBACK');
      console.error('Migration failed:', err);
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('Error connecting to DB for migrations:', err);
  }
};

// Run migrations on startup
runMigrations();

// Helper to convert DB casing to CamelCase if needed, but for now we keep simple
// API Routes

// Auth: Sign Up
app.post('/api/auth/signup', async (req, res) => {
  const { name, password } = req.body;
  try {
    const check = await pool.query('SELECT id FROM wizards WHERE name = $1', [name]);
    if (check.rows.length > 0) {
      return res.status(400).json({ error: 'Такой волшебник уже числится в Хогвартсе.' });
    }

    const result = await pool.query(
      'INSERT INTO wizards (name, password) VALUES ($1, $2) RETURNING *',
      [name, password]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth: Login
app.post('/api/auth/login', async (req, res) => {
  const { name, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT * FROM wizards WHERE name = $1 AND password = $2',
      [name, password]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Неверное имя или пароль' });
    }
    
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth: Get User by Name (Public Profile)
app.get('/api/users/:name', async (req, res) => {
    try {
      const name = req.params.name.replace(/_/g, ' '); // Decode URL friendly name
      const result = await pool.query('SELECT id, name, avatar_url, race, age, faculty FROM wizards WHERE name ILIKE $1', [name]);
      if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Wizard not found' });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Auth: List All Users (Public)
app.get('/api/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT id, name, role, avatar_url, race, age, faculty FROM wizards ORDER BY name ASC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User: Update Avatar
app.patch('/api/users/:id/avatar', async (req, res) => {
    const { id } = req.params;
    const { avatar_url } = req.body;
    
    try {
        const result = await pool.query(
            'UPDATE wizards SET avatar_url = $1 WHERE id = $2 RETURNING id, name, role, avatar_url',
            [avatar_url, id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User: Update Profile (Race & Age & Faculty)
app.patch('/api/users/:id/profile', async (req, res) => {
    const { id } = req.params;
    const { race, age, faculty } = req.body;
    
    try {
        // Fetch current user state to check permissions and existing data
        const userRes = await pool.query('SELECT role, race FROM wizards WHERE id = $1', [id]);
        if (userRes.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }
        const user = userRes.rows[0];

        // Security check: Only admins can change race directly.
        // Non-admins can only change age/faculty if they are trying to change race too.
        if (user.role !== 'admin' && race !== user.race) {
            return res.status(403).json({ 
                error: 'Для смены расы необходимо подать заявку администрации.' 
            });
        }

        const result = await pool.query(
            'UPDATE wizards SET race = $1, age = $2, faculty = $3 WHERE id = $4 RETURNING id, name, role, avatar_url, race, age, faculty',
            [race, age, faculty, id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: List Users
app.get('/api/admin/users', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM wizards ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Create User
app.post('/api/admin/users', async (req, res) => {
    const { name, password, role } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO wizards (name, password, role) VALUES ($1, $2, $3) RETURNING *',
            [name, password, role]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Update User
app.patch('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    // Build dynamic query
    const keys = Object.keys(updates);
    if (keys.length === 0) return res.status(400).json({ error: 'No updates provided' });
    
    const setClause = keys.map((key, idx) => `${key} = $${idx + 2}`).join(', ');
    const values = [id, ...Object.values(updates)];
    
    try {
        const result = await pool.query(
            `UPDATE wizards SET ${setClause} WHERE id = $1 RETURNING *`,
            values
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin: Delete User
app.delete('/api/admin/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM wizards WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logs: Get Logs
app.get('/api/logs', async (req, res) => {
  const { user_id, skill_name } = req.query;
  try {
    let query = `
        SELECT pl.*, 
               mw.name as moderator_name,
               mw.avatar_url as moderator_avatar
        FROM practice_logs pl
        LEFT JOIN wizards mw ON pl.moderator_approval_id = mw.id
        WHERE pl.user_id = $1
    `;
    const params = [user_id];
    
    if (skill_name) {
        query += ' AND pl.skill_name = $2';
        params.push(skill_name);
    }
    
    query += ' ORDER BY pl.created_at DESC';
    
    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logs: List All (Admin)
app.get('/api/admin/logs', async (req, res) => {
    const { skill_name, status } = req.query;
    try {
        let query = `
            SELECT pl.*, w.name as wizard_name, w.avatar_url as wizard_avatar,
                   mw.name as moderator_name,
                   (
                       SELECT string_agg(wm.name, ', ' ORDER BY wm.name)
                       FROM wizards wm
                       WHERE wm.role = 'moderator' 
                       AND pl.skill_name = ANY(wm.managed_skills)
                   ) as assigned_moderators,
                   (
                       SELECT COUNT(*)::int
                       FROM practice_logs sub 
                       WHERE sub.user_id = pl.user_id 
                       AND sub.skill_name = pl.skill_name 
                       AND sub.status IN ('approved', 'exam_passed', 'study_completed')
                   ) as user_approved_count,
                   (
                       SELECT EXISTS (
                           SELECT 1 
                           FROM practice_logs sub 
                           WHERE sub.user_id = pl.user_id 
                           AND sub.skill_name = pl.skill_name 
                           AND sub.status IN ('exam_passed', 'study_completed')
                       )
                   ) as has_completed_status
            FROM practice_logs pl
            JOIN wizards w ON pl.user_id = w.id
            LEFT JOIN wizards mw ON pl.moderator_approval_id = mw.id
            WHERE 1=1
        `;
        const params = [];
        let paramIdx = 1;

        if (skill_name) {
            query += ` AND pl.skill_name = $${paramIdx++}`;
            params.push(skill_name);
        }

        if (status) {
            query += ` AND pl.status = $${paramIdx++}`;
            params.push(status);
        }

        query += ' ORDER BY pl.created_at DESC';

        const result = await pool.query(query, params);
        
        // Format result to match expected frontend structure (nested wizard object)
        const formattedRows = result.rows.map(row => ({
            ...row,
            wizards: { 
                name: row.wizard_name,
                avatar_url: row.wizard_avatar
            },
            moderator_name: row.moderator_name
        }));
        
        res.json(formattedRows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logs: Fast pending counts for Admin/Moderator
app.get('/api/admin/logs/pending-counts', async (req, res) => {
  const { user_id } = req.query;
  if (!user_id) return res.status(400).json({ error: 'user_id is required' });
  try {
    const userRes = await pool.query('SELECT role, managed_skills FROM wizards WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const user = userRes.rows[0];
    const isAdmin = user.role === 'admin';
    const isModerator = user.role === 'moderator';
    if (!isAdmin && !isModerator) return res.status(403).json({ error: 'Not authorized' });

    let query = `SELECT skill_name, COUNT(*)::int AS pending_count
                 FROM practice_logs
                 WHERE status = 'pending'`;
    const params = [];
    if (isModerator) {
      // Restrict to managed skills for moderators
      query += ` AND skill_name = ANY($1)`;
      params.push(user.managed_skills || []);
    }
    query += ` GROUP BY skill_name`;
    const result = await pool.query(query, params);
    const map = {};
    for (const row of result.rows) {
      map[row.skill_name] = row.pending_count;
    }
    res.json(map);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logs: Create Log
app.post('/api/logs', async (req, res) => {
  const { user_id, skill_name, content, word_count, post_link, type } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO practice_logs (user_id, skill_name, content, word_count, post_link, type) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [user_id, skill_name, content, word_count, post_link, type || 'practice']
    );
    
    // Notification Logic for Completion Requests
    if (type === 'completion_request') {
        // 1. Get User Name
        const userRes = await pool.query('SELECT name FROM wizards WHERE id = $1', [user_id]);
        const userName = userRes.rows[0]?.name || 'Волшебник';

        // 2. Find Admins and Moderators for this skill
        const recipientsRes = await pool.query(
            `SELECT id FROM wizards 
             WHERE role = 'admin' 
             OR (role = 'moderator' AND $1 = ANY(managed_skills))`,
            [skill_name]
        );

        // 3. Create Notifications
        for (const recipient of recipientsRes.rows) {
            // Don't notify the user themselves (if they happen to be admin, though unlikely to approve own request in this flow)
            if (recipient.id === user_id) continue;

            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type, link)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    recipient.id,
                    'Заявка на завершение обучения',
                    `${userName} подал(а) заявку на завершение обучения по навыку "${skill_name}"`,
                    'info',
                    `/skill/${encodeURIComponent(skill_name)}?username=${encodeURIComponent(userName)}`
                ]
            );
        }
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logs: Delete Log
app.delete('/api/logs/:id', async (req, res) => {
  const { id } = req.params;
  const { user_id } = req.body; // In real app, get from session/token
  
  try {
    // Fetch user to check role
    const userRes = await pool.query('SELECT role FROM wizards WHERE id = $1', [user_id]);
    if (userRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
    }
    const user = userRes.rows[0];

    let result;
    if (user.role === 'admin') {
        // Admin can delete ANY log
        result = await pool.query(
            'DELETE FROM practice_logs WHERE id = $1 RETURNING id',
            [id]
        );
    } else {
        // Regular users/moderators can only delete their OWN logs
        result = await pool.query(
            'DELETE FROM practice_logs WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, user_id]
        );
    }
    
    if (result.rows.length === 0) {
        return res.status(403).json({ error: 'Not authorized or log not found' });
    }
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: Grant Skill (Manual +100%)
app.post('/api/admin/skills/grant', async (req, res) => {
    const { user_id, skill_name, reason, moderator_id } = req.body;
    
    try {
        // Verify moderator/admin permissions
        const modRes = await pool.query('SELECT * FROM wizards WHERE id = $1', [moderator_id]);
        if (modRes.rows.length === 0) return res.status(404).json({ error: 'Moderator not found' });
        const moderator = modRes.rows[0];
        
        const isGlobalAdmin = moderator.role === 'admin';
        const isModerator = moderator.role === 'moderator' && moderator.managed_skills && moderator.managed_skills.includes(skill_name);
        
        if (!isGlobalAdmin && !isModerator) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Insert log with status 'exam_passed' (forces 100%)
        const result = await pool.query(
            `INSERT INTO practice_logs 
            (user_id, skill_name, content, word_count, post_link, type, status, moderator_approval_id, moderator_approved_at, created_at) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW()) 
            RETURNING *`,
            [user_id, skill_name, reason, 0, '', 'practice', 'exam_passed', moderator_id]
        );
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Skills Metadata: Get All
app.get('/api/skills/metadata', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM skill_metadata');
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Skills Metadata: Update
app.post('/api/skills/metadata', async (req, res) => {
    const { skill_name, responsible_person_name, responsible_person_link, description } = req.body;
    
    try {
        const result = await pool.query(
            `INSERT INTO skill_metadata (skill_name, responsible_person_name, responsible_person_link, description, updated_at)
             VALUES ($1, $2, $3, $4, NOW())
             ON CONFLICT (skill_name) 
             DO UPDATE SET 
                responsible_person_name = COALESCE(EXCLUDED.responsible_person_name, skill_metadata.responsible_person_name),
                responsible_person_link = COALESCE(EXCLUDED.responsible_person_link, skill_metadata.responsible_person_link),
                description = COALESCE(EXCLUDED.description, skill_metadata.description),
                updated_at = NOW()
             RETURNING *`,
            [skill_name, responsible_person_name, responsible_person_link, description]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Notifications: Get User Notifications
app.get('/api/notifications', async (req, res) => {
    const { user_id } = req.query;
    if (!user_id) return res.status(400).json({ error: 'User ID is required' });

    try {
        const result = await pool.query(
            'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC',
            [user_id]
        );
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Notifications: Mark as Read
app.patch('/api/notifications/:id/read', async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE notifications SET read = true WHERE id = $1 RETURNING *',
            [id]
        );
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Notifications: Mark All as Read
app.patch('/api/notifications/read-all', async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'User ID is required' });
    try {
        await pool.query(
            'UPDATE notifications SET read = true WHERE user_id = $1',
            [user_id]
        );
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Notifications: Delete Notification
app.delete('/api/notifications/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM notifications WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logs: Update Status (Admin/Moderator)
app.patch('/api/logs/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status, user_id, rejection_reason } = req.body;

    if (!['approved', 'rejected', 'exam_passed', 'study_completed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    try {
        // Get Log and acting User
        const logRes = await pool.query('SELECT * FROM practice_logs WHERE id = $1', [id]);
        if (logRes.rows.length === 0) return res.status(404).json({ error: 'Log not found' });
        const log = logRes.rows[0];

        // If user_id is provided, check permissions more strictly
        // For backward compatibility (if any), we might need to handle missing user_id, 
        // but frontend should send it.
        let user;
        if (user_id) {
            const userRes = await pool.query('SELECT * FROM wizards WHERE id = $1', [user_id]);
            if (userRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
            user = userRes.rows[0];
        } else {
            // Fallback or error? Let's require user_id for this new logic
            return res.status(400).json({ error: 'User ID is required' });
        }

        const isGlobalAdmin = user.role === 'admin';
        const isModerator = user.role === 'moderator' && user.managed_skills && user.managed_skills.includes(log.skill_name);

        if (!isGlobalAdmin && !isModerator) {
            return res.status(403).json({ error: 'Not authorized' });
        }

        // Check if skill requires moderation (has any moderator assigned)
        const modCheck = await pool.query(
            "SELECT 1 FROM wizards WHERE role = 'moderator' AND $1 = ANY(managed_skills) LIMIT 1",
            [log.skill_name]
        );
        const requiresModeration = modCheck.rows.length > 0;

        let newStatus = status;
        let updateModeratorInfo = false;

        // Logic for Approval
        if (status === 'approved' || status === 'exam_passed' || status === 'study_completed') {
            if (requiresModeration) {
                if (isModerator) {
                    // Moderator approving: mark as moderator approved, but keep pending for admin
                    updateModeratorInfo = true;
                    newStatus = 'pending'; 
                } else if (isGlobalAdmin) {
                    // Admin approving: check if moderator approved
                    if (!log.moderator_approval_id) {
                         return res.status(400).json({ error: 'Требуется предварительное одобрение экзаменатора (полу-администратора).' });
                    }
                }
            }
        }
        
        let result;
        if (updateModeratorInfo) {
             result = await pool.query(
                 'UPDATE practice_logs SET moderator_approval_id = $1, moderator_approved_at = NOW(), moderator_proposed_status = $2 WHERE id = $3 RETURNING *',
                 [user.id, status, id]
             );
        } else {
             result = await pool.query(
                 'UPDATE practice_logs SET status = $1, rejection_reason = $2 WHERE id = $3 RETURNING *',
                 [newStatus, rejection_reason || null, id]
             );
        }

        // Create Notification
        if (!updateModeratorInfo) { // Don't notify on intermediate moderator approval (or should we? User requirements say "post was reviewed and approved" - implies final approval)
            // Wait, if moderator approves, status is still pending. User shouldn't be notified yet?
            // "if post was accepted, notification comes that such post for such skill was reviewed and approved"
            // This sounds like final approval.
            
            // "if post was rejected, notification comes that such post for such skill was reviewed and rejected for reason X"

            let notifTitle = '';
            let notifMessage = '';
            let notifType = 'info';

            if (newStatus === 'approved' || newStatus === 'exam_passed' || newStatus === 'study_completed') {
                notifTitle = 'Пост одобрен!';
                notifMessage = `Ваш пост по навыку "${log.skill_name}" был рассмотрен и одобрен.`;
                notifType = 'success';
            } else if (newStatus === 'rejected') {
                notifTitle = 'Пост отклонен';
                notifMessage = `Ваш пост по навыку "${log.skill_name}" был рассмотрен и отклонен. Причина: ${rejection_reason || 'не указана'}.`;
                notifType = 'error';
            }

            if (notifTitle) {
                await pool.query(
                    'INSERT INTO notifications (user_id, title, message, type, link) VALUES ($1, $2, $3, $4, $5)',
                    [log.user_id, notifTitle, notifMessage, notifType, `/skill/${encodeURIComponent(log.skill_name)}`]
                );
            }
        }
        
        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Race Change Requests
app.post('/api/race-requests', async (req, res) => {
    const { user_id, requested_race, reason, explanation } = req.body;
    try {
        await pool.query('BEGIN');
        
        const result = await pool.query(
            'INSERT INTO race_change_requests (user_id, requested_race, reason, explanation) VALUES ($1, $2, $3, $4) RETURNING *',
            [user_id, requested_race, reason, explanation]
        );
        const request = result.rows[0];

        // 1. Get User Name
        const userRes = await pool.query('SELECT name FROM wizards WHERE id = $1', [user_id]);
        const userName = userRes.rows[0]?.name || 'Волшебник';

        // 2. Find Admins
        const adminsRes = await pool.query("SELECT id FROM wizards WHERE role = 'admin'");

        // 3. Create Notifications for Admins
        for (const admin of adminsRes.rows) {
            // Don't notify the user themselves if they happen to be admin
            if (admin.id === user_id) continue;

            await pool.query(
                `INSERT INTO notifications (user_id, title, message, type, link)
                 VALUES ($1, $2, $3, $4, $5)`,
                [
                    admin.id,
                    'Заявка на смену расы',
                    `${userName} хочет сменить расу на "${requested_race}". Причина: ${reason}`,
                    'info',
                    `race_request:${request.id}` // Special link format to trigger actions in frontend
                ]
            );
        }

        await pool.query('COMMIT');
        res.json(request);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/api/race-requests', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT r.*, w.name as user_name, w.avatar_url as user_avatar
            FROM race_change_requests r 
            JOIN wizards w ON r.user_id = w.id 
            WHERE r.status = 'pending'
            ORDER BY r.created_at DESC
        `);
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.patch('/api/race-requests/:id', async (req, res) => {
    const { id } = req.params;
    const { status, rejection_reason, admin_id } = req.body;
    try {
        await pool.query('BEGIN');

        const requestRes = await pool.query('SELECT * FROM race_change_requests WHERE id = $1', [id]);
        if (requestRes.rows.length === 0) {
            await pool.query('ROLLBACK');
            return res.status(404).json({ error: 'Request not found' });
        }
        const request = requestRes.rows[0];

        const updateRes = await pool.query(
            'UPDATE race_change_requests SET status = $1, rejection_reason = $2, admin_id = $3, processed_at = NOW() WHERE id = $4 RETURNING *',
            [status, rejection_reason || null, admin_id, id]
        );

        if (status === 'approved') {
            await pool.query('UPDATE wizards SET race = $1 WHERE id = $2', [request.requested_race, request.user_id]);
            
            await pool.query(
                'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
                [request.user_id, 'Заявка на смену расы одобрена!', `Ваша заявка на расу "${request.requested_race}" была одобрена администратором.`, 'success']
            );
        } else if (status === 'rejected') {
            await pool.query(
                'INSERT INTO notifications (user_id, title, message, type) VALUES ($1, $2, $3, $4)',
                [request.user_id, 'Заявка на смену расы отклонена', `Ваша заявка на расу "${request.requested_race}" была отклонена. Причина: ${rejection_reason || 'не указана'}.`, 'error']
            );
        }

        await pool.query('COMMIT');
        res.json(updateRes.rows[0]);
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error(err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve Static Files (Frontend)
const distPath = path.join(__dirname, '../dist');
app.use(express.static(distPath));

// SPA Fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
