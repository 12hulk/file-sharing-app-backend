import { Pool } from "pg";
import bcrypt from "bcryptjs";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
    if (req.method === "POST") {
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
                token: "yes", // Replace with actual JWT token if used
            });
        } catch (error) {
            console.error("Error during login:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    } else {
        res.status(405).json({ message: "Method Not Allowed" });
    }
}
