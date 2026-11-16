const express = require("express");
const mongoose = require("mongoose");
const Transaction = require("../models/Transaction");
const Category = require("../models/Category");
const protect = require("../middleware/auth");

const router = express.Router();

router.use(protect);

// List transactions; optional filters: type, category, month=YYYY-MM
router.get("/", async (req, res) => {
  try {
    const filter = { user: req.userId };

    if (req.query.type) filter.type = req.query.type;
    if (req.query.category) filter.category = req.query.category;

    if (req.query.month) {
      const [year, month] = req.query.month.split("-").map(Number);
      filter.date = {
        $gte: new Date(year, month - 1, 1),
        $lt: new Date(year, month, 1),
      };
    }

    const transactions = await Transaction.find(filter)
      .populate("category", "name")
      .sort({ date: -1 });

    res.json(transactions);
  } catch {
    res.status(500).json({ message: "Could not load transactions." });
  }
});

// Add a transaction
router.post("/", async (req, res) => {
  try {
    const { title, amount, type, category, date } = req.body;

    if (!title || !amount || !type || !category || !date) {
      return res.status(400).json({ message: "Please fill in all fields." });
    }

    if (!["income", "expense"].includes(type) || Number(amount) <= 0) {
      return res.status(400).json({ message: "Enter a valid type and amount." });
    }

    const ownedCategory = await Category.findOne({
      _id: category,
      user: req.userId,
      type,
    });

    if (!ownedCategory) {
      return res.status(400).json({ message: "Choose one of your own matching categories." });
    }

    const transaction = await Transaction.create({
      title,
      amount: Number(amount),
      type,
      category,
      date,
      user: req.userId,
    });

    res.status(201).json(transaction);
  } catch {
    res.status(500).json({ message: "Could not add transaction." });
  }
});

// Edit a transaction
router.put("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      req.body,
      { new: true, runValidators: true }
    ).populate("category", "name");

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    res.json(transaction);
  } catch {
    res.status(400).json({ message: "Could not update transaction." });
  }
});

// Delete a transaction
router.delete("/:id", async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!transaction) {
      return res.status(404).json({ message: "Transaction not found." });
    }

    res.json({ message: "Transaction deleted." });
  } catch {
    res.status(400).json({ message: "Could not delete transaction." });
  }
});

module.exports = router;