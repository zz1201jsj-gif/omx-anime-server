const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");

const app = express();

const PORT = 3000;

// هنغيره لاحقًا لمفتاح سري قوي محفوظ خارج الكود
const JWT_SECRET = "OMX_ANIME_CHANGE_THIS_SECRET";

app.use(cors());
app.use(express.json());

// قاعدة البيانات
const db = new Database("omx_anime.db");

// إنشاء جدول المستخدمين
db.prepare(`
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
`).run();

// الصفحة الرئيسية
app.get("/", (req, res) => {
    res.json({
        app: "OMX Anime Server",
        status: "online"
    });
});

// إنشاء حساب
app.post("/api/register", async (req, res) => {
    try {
        const { username, email, password } = req.body;

        if (!username || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "جميع البيانات مطلوبة"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "كلمة المرور يجب أن تكون 8 أحرف على الأقل"
            });
        }

        const existingUser = db.prepare(`
            SELECT id
            FROM users
            WHERE email = ? OR username = ?
        `).get(email, username);

        if (existingUser) {
            return res.status(409).json({
                success: false,
                message: "الحساب موجود بالفعل"
            });
        }

        // تشفير كلمة المرور
        const hashedPassword = await bcrypt.hash(password, 12);

        // حفظ المستخدم
        const result = db.prepare(`
            INSERT INTO users
            (username, email, password)
            VALUES (?, ?, ?)
        `).run(
            username,
            email,
            hashedPassword
        );

        // إنشاء Token
        const token = jwt.sign(
            {
                userId: result.lastInsertRowid,
                username: username
            },
            JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.status(201).json({
            success: true,
            message: "تم إنشاء الحساب",
            token: token,
            user: {
                id: result.lastInsertRowid,
                username: username,
                email: email
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "حدث خطأ في السيرفر"
        });
    }
});

// تسجيل الدخول
app.post("/api/login", async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "البريد وكلمة المرور مطلوبان"
            });
        }

        // البحث عن المستخدم
        const user = db.prepare(`
            SELECT *
            FROM users
            WHERE email = ?
        `).get(email);

        if (!user) {
            return res.status(401).json({
                success: false,
                message: "البريد أو كلمة المرور غير صحيحة"
            });
        }

        // مقارنة كلمة المرور
        const passwordCorrect = await bcrypt.compare(
            password,
            user.password
        );

        if (!passwordCorrect) {
            return res.status(401).json({
                success: false,
                message: "البريد أو كلمة المرور غير صحيحة"
            });
        }

        // إنشاء Token
        const token = jwt.sign(
            {
                userId: user.id,
                username: user.username
            },
            JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        res.json({
            success: true,
            message: "تم تسجيل الدخول",
            token: token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            message: "حدث خطأ في السيرفر"
        });
    }
});

// تشغيل السيرفر
app.listen(PORT, () => {
    console.log("================================");
    console.log("       OMX ANIME SERVER");
    console.log("================================");
    console.log(`Server running on port ${PORT}`);
    console.log("Database: omx_anime.db");
    console.log("================================");
});