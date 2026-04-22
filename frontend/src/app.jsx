const { useState, useEffect } = React;

function App() {
  const [tasks, setTasks] = useState([]);
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  async function loadTasks() {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setTasks(await res.json());
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadTasks(); }, []);

  async function addTask(e) {
    e.preventDefault();
    if (!title.trim()) return;
    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title })
    });
    if (res.ok) {
      setTitle("");
      loadTasks();
    }
  }

  async function toggleTask(task) {
    await fetch(`/api/tasks/${task.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done: !task.done })
    });
    loadTasks();
  }

  async function deleteTask(id) {
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    loadTasks();
  }

  return (
    <div className="container">
      <h1>📋 Task Manager</h1>
      <p className="subtitle">A tiny full-stack demo running in Docker</p>

      <form onSubmit={addTask} className="add-form">
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
        />
        <button type="submit">Add</button>
      </form>

      {loading && <p>Loading…</p>}
      {error && <p className="error">Error: {error}</p>}

      <ul className="tasks">
        {tasks.map((task) => (
          <li key={task.id} className={task.done ? "done" : ""}>
            <label>
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleTask(task)}
              />
              <span>{task.title}</span>
            </label>
            <button className="delete" onClick={() => deleteTask(task.id)}>✕</button>
          </li>
        ))}
      </ul>

      {!loading && tasks.length === 0 && (
        <p className="empty">No tasks yet — add one above.</p>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
