import mongoose, { Document, Model, Schema } from "mongoose";

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  loginAttempts: number;
  lockUntil: Date | null;
}

const userSchema: Schema<IUser> = new Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String, required: true },
  loginAttempts: { type: Number, default: 0, required: true },
  lockUntil: { type: Date, required: true, default: null },
});

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;
