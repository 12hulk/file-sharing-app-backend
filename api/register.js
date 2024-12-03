import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
    if (req.method === "POST") {
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
    } else {
        res.status(405).json({ message: "Method Not Allowed" });
    }
}
