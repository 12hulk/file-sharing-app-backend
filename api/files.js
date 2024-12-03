import { Pool } from "pg";

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
});

export default async function handler(req, res) {
    if (req.method === "GET") {
        try {
            const result = await pool.query("SELECT * FROM files");
            res.status(200).json(result.rows);
        } catch (error) {
            console.error("Error retrieving files:", error);
            res.status(500).json({ message: "Failed to retrieve files", error });
        }
    } else {
        res.status(405).json({ message: "Method Not Allowed" });
    }
}
