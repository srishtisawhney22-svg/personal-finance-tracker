const express = require("express");
const Category = require("../models/Category");
const Transaction = require("../models/Transaction");
const protect = require("../middleware/auth");

const router = express.Router();
router.use(protect);

router.get("/", async (req, res) => {
  try {
    const categories = await Category.find({ user: req.userId }).sort({ name: 1 });
    res.json(categories);
  } catch {
    res.status(500).json({ message: "Could not load categories." });
  }
});

router.post("/", async (req, res) => {
  try {
    const { name, type } = req.body;
    if (!name || !["income", "expense"].includes(type)) {
      return res.status(400).json({ message: "Enter a name and choose income or expense." });
    }

    const category = await Category.create({
      name: name.trim(),
      type,
      user: req.userId,
    });

    res.status(201).json(category);
  } catch {
    res.status(500).json({ message: "Could not add category." });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { _id: req.params.id, user: req.userId },
      { name: req.body.name, type: req.body.type },
      { new: true, runValidators: true }
    );

    if (!category) return res.status(404).json({ message: "Category not found." });
    res.json(category);
  } catch {
    res.status(400).json({ message: "Could not update category." });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    const used = await Transaction.exists({
      category: req.params.id,
      user: req.userId,
    });

    if (used) {
      return res.status(400).json({ message: "This category is used by transactions." });
    }

    const category = await Category.findOneAndDelete({
      _id: req.params.id,
      user: req.userId,
    });

    if (!category) return res.status(404).json({ message: "Category not found." });
    res.json({ message: "Category deleted." });
  } catch {
    res.status(400).json({ message: "Could not delete category." });
  }
});

module.exports = router;