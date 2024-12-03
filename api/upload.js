import multer from "multer";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const storage = multer.memoryStorage();
const upload = multer({ storage }).single("file");

export default async function handler(req, res) {
    if (req.method === "POST") {
        upload(req, res, async (err) => {
            if (err) {
                return res.status(500).json({ message: "File upload failed", error: err });
            }

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

                res.status(200).json({
                    message: "File uploaded successfully!",
                    file: data,
                });
            } catch (error) {
                console.error("Error during file upload:", error);
                res.status(500).json({ message: "File upload failed", error });
            }
        });
    } else {
        res.status(405).json({ message: "Method Not Allowed" });
    }
}
