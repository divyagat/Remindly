import mongoose, { Schema, type Model, type Types } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser {
  _id: Types.ObjectId;
  name: string;
  email: string;
  password: string;
  createdAt: Date;
  updatedAt: Date;
}

interface IUserMethods {
  comparePassword(candidate: string): Promise<boolean>;
}

type UserModel = Model<IUser, object, IUserMethods>;

const userSchema = new Schema<IUser, UserModel, IUserMethods>(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, select: false, minlength: 8 },
  },
  { timestamps: true },
);

userSchema.pre("save", async function hashPassword() {
  if (!this.isModified("password")) {
    return;
  }
  this.password = await bcrypt.hash(this.password, 12);
});

userSchema.methods.comparePassword = function comparePassword(candidate: string) {
  return bcrypt.compare(candidate, this.password);
};

const User = (mongoose.models.User as UserModel | undefined) ?? mongoose.model<IUser, UserModel>("User", userSchema);

export default User;
