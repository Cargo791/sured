import express from "express";
import cors from "cors";
import pkg from "pg";
import dotenv from "dotenv";

dotenv.config();
const { Pool } = pkg;

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Health check
app.get("/", (req, res) => {
  res.send("Server is running ✅");
});

// ✅ PostgreSQL / Supabase connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

// ✅ TRACK PACKAGE
app.post("/api/track", async (req, res) => {
  const { trackingId } = req.body;

  if (!trackingId) {
    return res.status(400).json({ message: "Tracking ID is required" });
  }

  try {
    const result = await pool.query(
      "SELECT * FROM tracking WHERE tracking_id = $1",
      [trackingId.toUpperCase()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Shipment not found" });
    }

    return res.json(result.rows[0]);
  }catch (err) {
  console.error("TRACKING DATABASE ERROR:", {
    message: err.message,
    code: err.code,
    detail: err.detail,
    table: err.table,
    column: err.column
  });

  return res.status(500).json({
    message: "Database error"
  });
}
});

// ✅ ADD / UPDATE TRACKING (UPSERT)
app.post("/api/add", async (req, res) => {
  const {
    tracking_id,
    status,
    location,
    eta,
    last_scan_time,
    origin,
    shipment_date,
    location_date,
    sender_address,
    receiver_name,
    receiver_email,
    receiver_phone,
    receiver_address,
    package_description,
    package_weight,
  } = req.body;

  try {
    await pool.query(
      `
      INSERT INTO tracking (
        tracking_id,
        status,
        location,
        eta,
        last_scan_time,
        origin,
        shipment_date,
        location_date,
        sender_address,
        receiver_name,
        receiver_email,
        receiver_phone,
        receiver_address,
        package_description,
        package_weight
      )
      VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15
      )ON CONFLICT (tracking_id)
DO UPDATE SET
  status = EXCLUDED.status,
  location = EXCLUDED.location,
  eta = EXCLUDED.eta,
  last_scan_time = EXCLUDED.last_scan_time,
  location_date = EXCLUDED.location_date
      `,
      [
        tracking_id.toUpperCase(),
        status,
        location,
        eta,
        last_scan_time || new Date(),
        origin,
        shipment_date,
        location_date,
        sender_address,
        receiver_name,
        receiver_email,
        receiver_phone,
        receiver_address,
        package_description,
        package_weight,
      ]
    );

    res.json({ message: "Tracking saved successfully ✅" });
  } catch (err) {
    console.error("Save error:", err);
    res.status(500).json({ message: "Error saving tracking info" });
  }
});

// ✅ Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);
