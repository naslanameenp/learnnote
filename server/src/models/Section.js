import mongoose from "mongoose";

const topicSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 180 },
  completed: { type: Boolean, default: false },
  custom: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
}, { timestamps: true });

const sectionSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true, maxlength: 120 },
  topics: [topicSchema],
  custom: { type: Boolean, default: false },
  order: { type: Number, default: 0 }
}, { timestamps: true });

export default mongoose.model("Section", sectionSchema);
