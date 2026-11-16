const express = require("express");
const Budget = require("../models/Budget");
const protect = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const month = req.query.month;
    const budget = await Budget.findOne({ user: req.userId, month });
    res.json(budget || { month, amount: 0 });
  } catch {
    res.status(500).json({ message: "Could not load budget." });
  }
});

router.put("/", async (req, res) => {
  try {
    const { month, amount } = req.body;

    if (!/^\d{4}-\d{2}$/.test(month) || !Number.isFinite(Number(amount)) || Number(amount) < 0) {
      return res.status(400).json({ message: "Enter a valid month and budget amount." });
    }

    const budget = await Budget.findOneAndUpdate(
      { user: req.userId, month },
      { amount: Number(amount) },
      { new: true, upsert: true, runValidators: true }
    );

    res.json(budget);
  } catch {
    res.status(500).json({ message: "Could not save budget." });
  }
});

module.exports = router;