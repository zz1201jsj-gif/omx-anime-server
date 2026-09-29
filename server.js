const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const db = new Database("omx_anime.db");

// ===============================
// DATABASE
// ===============================

db.prepare(`
    CREATE TABLE IF NOT EXISTS omx_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT UNIQUE NOT NULL,
        username TEXT NOT NULL DEFAULT 'مستخدم OMX',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// ===============================
// CREATE UNIQUE OMX ID
// ===============================

function generateUserId() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let randomPart = "";

    for (let i = 0; i < 8; i++) {
        randomPart += chars.charAt(
            crypto.randomInt(0, chars.length)
        );
    }

    return `OMX-${randomPart}`;
}

// ===============================
// CREATE ACCOUNT
// ===============================

app.post("/api/account/create", (req, res) => {
    try {
        let userId;

        while (true) {
            userId = generateUserId();

            const exists = db.prepare(`
                SELECT id
                FROM omx_users
                WHERE user_id = ?
            `).get(userId);

            if (!exists) break;
        }

        const result = db.prepare(`
            INSERT INTO omx_users
            (user_id, username)
            VALUES (?, ?)
        `).run(userId, "مستخدم OMX");

        const user = db.prepare(`
            SELECT id, user_id, username, created_at
            FROM omx_users
            WHERE id = ?
        `).get(result.lastInsertRowid);

        res.status(201).json({
            success: true,
            message: "تم إنشاء حساب OMX",
            user: user
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "حدث خطأ في السيرفر"
        });
    }
});

// ===============================
// LOGIN WITH OMX ID
// ===============================

app.post("/api/account/login", (req, res) => {
    try {
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "رقم المعرف مطلوب"
            });
        }

        const user = db.prepare(`
            SELECT id, user_id, username, created_at
            FROM omx_users
            WHERE user_id = ?
        `).get(userId.trim().toUpperCase());

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "رقم المعرف غير موجود"
            });
        }

        res.json({
            success: true,
            message: "تم تسجيل الدخول",
            user: user
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "حدث خطأ في السيرفر"
        });
    }
});

// ===============================
// UPDATE USERNAME
// ===============================

app.put("/api/account/username", (req, res) => {
    try {
        const { userId, username } = req.body;

        if (!userId || !username) {
            return res.status(400).json({
                success: false,
                message: "رقم المعرف والاسم مطلوبان"
            });
        }

        const cleanUsername = username.trim();

        if (cleanUsername.length < 2) {
            return res.status(400).json({
                success: false,
                message: "الاسم قصير جدًا"
            });
        }

        const result = db.prepare(`
            UPDATE omx_users
            SET username = ?
            WHERE user_id = ?
        `).run(
            cleanUsername,
            userId.trim().toUpperCase()
        );

        if (result.changes === 0) {
            return res.status(404).json({
                success: false,
                message: "الحساب غير موجود"
            });
        }

        const user = db.prepare(`
            SELECT id, user_id, username, created_at
            FROM omx_users
            WHERE user_id = ?
        `).get(userId.trim().toUpperCase());

        res.json({
            success: true,
            message: "تم تحديث الاسم",
            user: user
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "حدث خطأ في السيرفر"
        });
    }
});

// ===============================
// SERVER STATUS
// ===============================

app.get("/", (req, res) => {
    res.json({
        app: "OMX Anime Server",
        status: "online",
        version: "2.0",
        accountSystem: "OMX ID"
    });
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, "0.0.0.0", () => {
    console.log("================================");
    console.log("       OMX ANIME SERVER");
    console.log("================================");
    console.log(`Server running on port ${PORT}`);
    console.log("Database: omx_anime.db");
    console.log("Account system: OMX ID");
    console.log("================================");
});