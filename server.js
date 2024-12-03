require("dotenv").config();
const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { createClient } = require("@supabase/supabase-js");
const multer = require("multer");

const app = express();

// Initialize Supabase Client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(
    cors({
        origin: "https://file-sharing-website-vuzt.vercel.app/",
        methods: ["GET", "POST", "DELETE"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);

app.use(express.json());

// Test GET request
app.get("/", (req, res) => {
    res.send("Server is up and running!");
});

app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        const query = "SELECT * FROM users WHERE email = $1";
        const result = await pool.query(query, [email]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password_hash);

        if (!passwordMatch) {
            return res.status(401).json({ error: "Invalid email or password" });
        }

        res.status(200).json({
            message: "Login successful",
            token: "yes",
        });
    } catch (error) {
        console.error("Error during login:", error);
        res.status(500).json({ error: "Internal server error" });
    }
});

app.post("/register", async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ message: "All fields are required" });
    }

    try {
        const existingUser = await pool.query("SELECT * FROM users WHERE email = $1", [email]);

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ message: "Email is already registered" });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = await pool.query(
            "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING *",
            [name, email, hashedPassword]
        );

        res.status(201).json({
            message: "User registered successfully",
            user: {
                id: newUser.rows[0].id,
                name: newUser.rows[0].name,
                email: newUser.rows[0].email,
            },
        });
    } catch (error) {
        console.error("Error during registration:", error);
        res.status(500).json({ message: "Internal server error" });
    }
});

const storage = multer.memoryStorage();
const upload = multer({ storage });

app.post("/upload", upload.single("file"), async (req, res) => {
    const { file } = req;

    if (!file) {
        return res.status(400).json({ message: "No file uploaded" });
    }

    try {
        const { data, error } = await supabase.storage
            .from("uploads")
            .upload(`public/${Date.now()}_${file.originalname}`, file.buffer, {
                contentType: file.mimetype,
            });

        if (error) {
            return res.status(500).json({ message: "Error uploading to Supabase", error });
        }

        const result = await pool.query(
            "INSERT INTO files (filename, file_path, mime_type, size) VALUES ($1, $2, $3, $4) RETURNING *",
            [file.originalname, data.Key, file.mimetype, file.size]
        );

        res.status(200).json({
            message: "File uploaded successfully!",
            file: result.rows[0],
        });
    } catch (error) {
        console.error("Error during file upload:", error);
        res.status(500).json({ message: "File upload failed", error });
    }
});

app.get("/files", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM files");
        res.status(200).json(result.rows);
    } catch (error) {
        console.error("Error retrieving files:", error);
        res.status(500).json({ message: "Failed to retrieve files", error });
    }
});

app.get("/files/:filename", async (req, res) => {
    const { filename } = req.params;

    try {
        const { data, error } = await supabase.storage
            .from("uploads")
            .download(`public/${filename}`);

        if (error) {
            return res.status(404).json({ message: "File not found in Supabase", error });
        }

        res.setHeader("Content-Type", data.type);
        res.send(data);
    } catch (error) {
        console.error("Error during file download:", error);
        res.status(500).json({ message: "Error during download" });
    }
});

app.delete("/files/:filename", async (req, res) => {
    const { filename } = req.params;

    try {
        const { error } = await supabase.storage
            .from("uploads")
            .remove([`public/${filename}`]);

        if (error) {
            return res.status(500).json({ message: "Error deleting file from Supabase", error });
        }

        await pool.query("DELETE FROM files WHERE filename = $1", [filename]);

        res.status(200).json({ message: `File '${filename}' deleted successfully` });
    } catch (error) {
        console.error("Error during file deletion:", error);
        res.status(500).json({ message: "Failed to delete file", error });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
