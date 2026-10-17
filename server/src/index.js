import "dotenv/config";
import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import Section from "./models/Section.js";
import { curriculum } from "./data/curriculum.js";

const app = express();
const PORT = process.env.PORT || 5000;
app.use(cors({ origin: process.env.CLIENT_ORIGIN || "http://localhost:5173" }));
app.use(express.json({ limit: "1mb" }));

const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "arithmetic-mastery-api" }));

app.get("/api/sections", asyncHandler(async (_req, res) => {
  const sections = await Section.find().sort({ order: 1, createdAt: 1 });
  res.json(sections);
}));

app.post("/api/sections", asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ message: "Section title is required." });
  const section = await Section.create({ title, custom: true, order: Date.now(), topics: [] });
  res.status(201).json(section);
}));

app.patch("/api/sections/:sectionId", asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ message: "Section title is required." });
  const section = await Section.findByIdAndUpdate(req.params.sectionId, { title }, { new: true, runValidators: true });
  if (!section) return res.status(404).json({ message: "Section not found." });
  res.json(section);
}));

app.delete("/api/sections/:sectionId", asyncHandler(async (req, res) => {
  const section = await Section.findByIdAndDelete(req.params.sectionId);
  if (!section) return res.status(404).json({ message: "Section not found." });
  res.json({ success: true });
}));

app.post("/api/sections/:sectionId/topics", asyncHandler(async (req, res) => {
  const title = String(req.body.title || "").trim();
  if (!title) return res.status(400).json({ message: "Topic title is required." });
  const section = await Section.findById(req.params.sectionId);
  if (!section) return res.status(404).json({ message: "Section not found." });
  section.topics.push({ title, custom: true, order: section.topics.length });
  await section.save();
  res.status(201).json(section);
}));

app.patch("/api/topics/:topicId", asyncHandler(async (req, res) => {
  const update = {};
  if (typeof req.body.completed === "boolean") update["topics.$.completed"] = req.body.completed;
  if (typeof req.body.title === "string" && req.body.title.trim()) update["topics.$.title"] = req.body.title.trim();
  const section = await Section.findOneAndUpdate(
    { "topics._id": req.params.topicId }, { $set: update }, { new: true, runValidators: true }
  );
  if (!section) return res.status(404).json({ message: "Topic not found." });
  const topic = section.topics.id(req.params.topicId);
  res.json({ sectionId: section._id, topic });
}));

app.delete("/api/topics/:topicId", asyncHandler(async (req, res) => {
  const section = await Section.findOne({ "topics._id": req.params.topicId });
  if (!section) return res.status(404).json({ message: "Topic not found." });
  section.topics.pull({ _id: req.params.topicId });
  await section.save();
  res.json({ success: true });
}));

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ message: "Something went wrong on the server." });
});

async function start() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/arithmetic_mastery");
    const count = await Section.countDocuments();
    if (count === 0) {
      await Section.insertMany(curriculum.map(([title, topics], order) => ({
        title, order, custom: false,
        topics: topics.map((topic, topicOrder) => ({ title: topic, completed: false, custom: false, order: topicOrder }))
      })));
      console.log("Seeded arithmetic curriculum.");
    }
    app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));
  } catch (error) {
    console.error("Could not start API. Is MongoDB running?", error.message);
    process.exit(1);
  }
}
start();
