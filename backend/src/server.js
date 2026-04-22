const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
app.use(cors());
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Wait for the DB and make sure the tasks table exists.
async function initDb(retries = 10) {
  while (retries > 0) {
    try {
      await pool.query(`
        CREATE TABLE IF NOT EXISTS tasks (
          id          SERIAL PRIMARY KEY,
          title       TEXT NOT NULL,
          done        BOOLEAN NOT NULL DEFAULT FALSE,
          created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `);
      console.log("Database ready.");
      return;
    } catch (err) {
      console.log(`DB not ready yet (${retries} tries left):`, err.message);
      retries -= 1;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw new Error("Could not connect to the database.");
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// List tasks
app.get("/api/tasks", async (_req, res) => {
  try {
    const { rows } = await pool.query(
      "SELECT id, title, done, created_at FROM tasks ORDER BY id DESC"
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create a task
app.post("/api/tasks", async (req, res) => {
  const { title } = req.body || {};
  if (!title || typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ error: "title is required" });
  }
  try {
    const { rows } = await pool.query(
      "INSERT INTO tasks (title) VALUES ($1) RETURNING id, title, done, created_at",
      [title.trim()]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle a task's done status
app.patch("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  const { done } = req.body || {};
  if (typeof done !== "boolean") {
    return res.status(400).json({ error: "done (boolean) is required" });
  }
  try {
    const { rows } = await pool.query(
      "UPDATE tasks SET done = $1 WHERE id = $2 RETURNING id, title, done, created_at",
      [done, id]
    );
    if (rows.length === 0) return res.status(404).json({ error: "not found" });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a task
app.delete("/api/tasks/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const result = await pool.query("DELETE FROM tasks WHERE id = $1", [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: "not found" });
    res.status(204).end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3000;

initDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`API listening on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error("Startup failed:", err);
    process.exit(1);
  });
