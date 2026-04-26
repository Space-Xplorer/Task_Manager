import mongoose, { Schema } from 'mongoose';

const TaskSchema = new Schema(
  {
    title:       { type: String, required: true, trim: true, maxlength: [100, 'Title cannot exceed 100 characters'] },
    description: { type: String, default: '', maxlength: [2000, 'Description cannot exceed 2000 characters'] },
    status:      {
      type: String,
      enum: ['pending', 'in_progress', 'completed'],
      default: 'pending',
    },
    assignedTo:  { type: [{ type: Schema.Types.ObjectId, ref: 'User' }], validate: [v => v.length > 0, 'At least one assignee is required'] },
    createdBy:   { type: Schema.Types.ObjectId, ref: 'User', required: true },
    deadline:    { type: Date, default: null },
  },
  { timestamps: true }
);

TaskSchema.index({ assignedTo: 1, status: 1 });
TaskSchema.index({ createdBy: 1 });
TaskSchema.index({ createdAt: -1 });

export const Task = mongoose.model('Task', TaskSchema);
