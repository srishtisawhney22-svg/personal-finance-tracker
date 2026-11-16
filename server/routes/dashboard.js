const express = require("express");
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");
const protect = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const month = req.query.month || new Date().toISOString().slice(0, 7);
    const [year, monthNumber] = month.split("-").map(Number);
    const start = new Date(year, monthNumber - 1, 1);
    const end = new Date(year, monthNumber, 1);

    const transactions = await Transaction.find({
      user: req.userId,
      date: { $gte: start, $lt: end },
    }).populate("category", "name").sort({ date: -1 });

    const income = transactions
      .filter((item) => item.type === "income")
      .reduce((sum, item) => sum + item.amount, 0);

    const expenses = transactions
      .filter((item) => item.type === "expense")
      .reduce((sum, item) => sum + item.amount, 0);

    const budget = await Budget.findOne({ user: req.userId, month });

    res.json({
      month,
      income,
      expenses,
      balance: income - expenses,
      budget: budget ? budget.amount : 0,
      remainingBudget: (budget ? budget.amount : 0) - expenses,
      recentTransactions: transactions.slice(0, 5),
    });
  } catch {
    res.status(500).json({ message: "Could not load dashboard." });
  }
});

module.exports = router;