import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  Outlet,
  useNavigate,
} from "react-router-dom";
import axios from "axios";
import "./App.css";

const api = axios.create({ baseURL: "http://localhost:5000/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  function signIn(data) {
    localStorage.setItem("token", data.token);
    setToken(data.token);
  }

  function signOut() {
    localStorage.removeItem("token");
    setToken(null);
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/login"
          element={<AuthPage signup={false} onSignIn={signIn} />}
        />
        <Route
          path="/signup"
          element={<AuthPage signup={true} onSignIn={signIn} />}
        />
        <Route
          path="/"
          element={
            token ? <Layout onSignOut={signOut} /> : <Navigate to="/login" />
          }
        >
          <Route index element={<Navigate to="/dashboard" />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="transactions" element={<TransactionsPage />} />
          <Route path="budget" element={<BudgetPage />} />
          <Route path="categories" element={<CategoriesPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

function AuthPage({ signup, onSignIn }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(event) {
    event.preventDefault();
    setError("");

    try {
      const path = signup ? "/auth/signup" : "/auth/login";
      const response = await api.post(path, form);
      onSignIn(response.data);
      navigate("/dashboard");
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Could not connect. Is the server running?"
      );
    }
  }

  return (
    <main className="auth-page">
      <form className="card auth-card" onSubmit={submit}>
        <p className="eyebrow">PERSONAL FINANCE TRACKER</p>
        <h1>{signup ? "Create your account" : "Welcome back"}</h1>

        {signup && (
          <label>
            Name
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
        )}

        <label>
          Email
          <input
            required
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </label>

        <label>
          Password
          <input
            required
            minLength="8"
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </label>

        {error && <p className="error">{error}</p>}
        <button className="primary" type="submit">
          {signup ? "Sign up" : "Log in"}
        </button>

        <p className="muted">
          {signup ? "Already registered? " : "New here? "}
          <Link to={signup ? "/login" : "/signup"}>
            {signup ? "Log in" : "Create an account"}
          </Link>
        </p>
      </form>
    </main>
  );
}

function Layout({ onSignOut }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <Link className="brand" to="/dashboard">
          MyFinance
        </Link>
        <nav>
          <Link to="/dashboard">Dashboard</Link>
          <Link to="/transactions">Transactions</Link>
          <Link to="/budget">Budget</Link>
          <Link to="/categories">Categories</Link>
          <button className="link-button" onClick={onSignOut}>
            Log out
          </button>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  );
}

function DashboardPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [data, setData] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api
      .get("/dashboard", { params: { month } })
      .then((response) => setData(response.data))
      .catch(() => setError("Could not load dashboard."));
  }, [month]);

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">OVERVIEW</p>
          <h1>Dashboard</h1>
        </div>
        <input
          aria-label="Select month"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      {error && <p className="error">{error}</p>}

      {data && (
        <>
          <section className="summary-grid">
            <Summary title="Balance" value={data.balance} />
            <Summary title="Income" value={data.income} />
            <Summary title="Expenses" value={data.expenses} />
          </section>

          <section className="card budget-card">
            <div className="page-heading">
              <h2>Monthly budget</h2>
              <strong>
                {money(data.expenses)} / {money(data.budget)}
              </strong>
            </div>
            <div className="progress">
              <span
                style={{
                  width: `${
                    data.budget > 0
                      ? Math.min(100, (data.expenses / data.budget) * 100)
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className={data.remainingBudget < 0 ? "error" : "muted"}>
              {data.budget > 0
                ? `${money(Math.abs(data.remainingBudget))} ${
                    data.remainingBudget < 0 ? "over budget" : "remaining"
                  }`
                : "Set a budget to track monthly spending."}
              {data.budget > 0 &&
              data.expenses >= data.budget * 0.8 &&
              data.remainingBudget >= 0
                ? " — Spending is getting close to your budget."
                : ""}
            </p>
          </section>

          <section className="card">
            <h2>Recent transactions</h2>
            {data.recentTransactions.length === 0 ? (
              <p className="muted">No transactions this month yet.</p>
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Description</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recentTransactions.map((item) => (
                      <tr key={item._id}>
                        <td>{item.title}</td>
                        <td>{item.category?.name}</td>
                        <td>{new Date(item.date).toLocaleDateString()}</td>
                        <td className={item.type}>
                          {item.type === "income" ? "+" : "−"}
                          {money(item.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}

function Summary({ title, value }) {
  return (
    <div className="card summary">
      <p className="muted">{title}</p>
      <strong>{money(value)}</strong>
    </div>
  );
}

function TransactionsPage() {
  const [items, setItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [typeFilter, setTypeFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState("");

  const emptyForm = {
    title: "",
    amount: "",
    type: "expense",
    category: "",
    date: new Date().toISOString().slice(0, 10),
  };
  const [form, setForm] = useState(emptyForm);

  async function loadTransactions() {
    const params = {};
    if (typeFilter) params.type = typeFilter;
    if (categoryFilter) params.category = categoryFilter;

    const response = await api.get("/transactions", { params });
    setItems(response.data);
  }

  async function loadCategories() {
    const response = await api.get("/categories");
    setCategories(response.data);
  }

  useEffect(() => {
    loadTransactions().catch(() =>
      setMessage("Could not load transactions.")
    );
    loadCategories().catch(() =>
      setMessage("Could not load categories.")
    );
  }, [typeFilter, categoryFilter]);

  const matchingCategories = categories.filter(
    (category) => category.type === form.type
  );

  async function submit(event) {
    event.preventDefault();
    setMessage("");

    try {
      if (editing) {
        await api.put(`/transactions/${editing}`, form);
      } else {
        await api.post("/transactions", form);
      }

      setForm(emptyForm);
      setEditing(null);
      setMessage("Transaction saved.");
      await loadTransactions();
    } catch (err) {
      setMessage(
        err.response?.data?.message ||
          "Could not save transaction. Add a matching category first."
      );
    }
  }

  function edit(item) {
    setEditing(item._id);
    setForm({
      title: item.title,
      amount: item.amount,
      type: item.type,
      category: item.category?._id || item.category,
      date: new Date(item.date).toISOString().slice(0, 10),
    });
  }

  async function remove(id) {
    try {
      await api.delete(`/transactions/${id}`);
      await loadTransactions();
      setMessage("Transaction deleted.");
    } catch {
      setMessage("Could not delete transaction.");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">YOUR RECORDS</p>
          <h1>Transactions</h1>
        </div>
        <div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <form className="card form-grid" onSubmit={submit}>
        <h2>{editing ? "Edit transaction" : "Add a transaction"}</h2>

        <label>
          Description
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>

        <label>
          Amount
          <input
            required
            min="0.01"
            step="0.01"
            type="number"
            value={form.amount}
            onChange={(e) => setForm({ ...form, amount: e.target.value })}
          />
        </label>

        <label>
          Type
          <select
            value={form.type}
            onChange={(e) =>
              setForm({ ...form, type: e.target.value, category: "" })
            }
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <label>
          Category
          <select
            required
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          >
            <option value="">Choose category</option>
            {matchingCategories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Date
          <input
            required
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>

        <button className="primary" type="submit">
          {editing ? "Update" : "Add transaction"}
        </button>

        {editing && (
          <button
            type="button"
            onClick={() => {
              setEditing(null);
              setForm(emptyForm);
            }}
          >
            Cancel edit
          </button>
        )}
      </form>

      {message && <p className="notice">{message}</p>}

      <section className="card">
        <h2>Transaction history</h2>
        {items.length === 0 ? (
          <p className="muted">No transactions yet. Add one above.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Description</th>
                  <th>Category</th>
                  <th>Type</th>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item._id}>
                    <td>{item.title}</td>
                    <td>{item.category?.name}</td>
                    <td>{item.type}</td>
                    <td>{new Date(item.date).toLocaleDateString()}</td>
                    <td className={item.type}>{money(item.amount)}</td>
                    <td>
                      <button onClick={() => edit(item)}>Edit</button>{" "}
                      <button onClick={() => remove(item._id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}

function BudgetPage() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [amount, setAmount] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    api
      .get("/budget", { params: { month } })
      .then((response) => setAmount(response.data.amount || ""))
      .catch(() => setMessage("Could not load budget."));
  }, [month]);

  async function save(event) {
    event.preventDefault();

    try {
      await api.put("/budget", { month, amount: Number(amount) });
      setMessage("Budget saved.");
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not save budget.");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">MONTHLY PLAN</p>
          <h1>Budget</h1>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />
      </div>

      <form className="card form-grid" onSubmit={save}>
        <h2>Set your spending limit</h2>
        <label>
          Monthly budget amount
          <input
            required
            min="0"
            step="0.01"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>
        <button className="primary" type="submit">
          Save budget
        </button>
      </form>

      {message && <p className="notice">{message}</p>}
    </>
  );
}

function CategoriesPage() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [type, setType] = useState("expense");
  const [message, setMessage] = useState("");

  async function load() {
    const response = await api.get("/categories");
    setItems(response.data);
  }

  useEffect(() => {
    load().catch(() => setMessage("Could not load categories."));
  }, []);

  async function add(event) {
    event.preventDefault();

    try {
      await api.post("/categories", { name, type });
      setName("");
      setMessage("Category added.");
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not add category.");
    }
  }

  async function remove(id) {
    try {
      await api.delete(`/categories/${id}`);
      setMessage("Category deleted.");
      await load();
    } catch (err) {
      setMessage(err.response?.data?.message || "Could not delete category.");
    }
  }

  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">ORGANIZE</p>
          <h1>Categories</h1>
        </div>
      </div>

      <form className="card form-grid" onSubmit={add}>
        <h2>Add a category</h2>

        <label>
          Name
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <label>
          Type
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
        </label>

        <button className="primary" type="submit">
          Add category
        </button>
      </form>

      {message && <p className="notice">{message}</p>}

      <section className="card">
        <h2>Your categories</h2>
        {items.map((category) => (
          <div className="category-row" key={category._id}>
            <span>
              {category.name} <small>{category.type}</small>
            </span>
            <button onClick={() => remove(category._id)}>Delete</button>
          </div>
        ))}
      </section>
    </>
  );
}

function money(value = 0) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
  }).format(Number(value || 0));
}

export default App;