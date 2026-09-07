import mongoose from "mongoose";

const doctorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    mobile: {
      type: String,
      required: true,
      unique: true,
    },
    specialization: {
      type: String,
      required: true,
    },
    availability: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["active", "on-leave", "busy"],
      default: "active",
    },
    password: {
      type: String,
      required: true,
    },

    shiftStart: {
      type: String,
      default: "09:00",
    },
    shiftEnd: {
      type: String,
      default: "17:00",
    },

    emergencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Emergency",
      },
    ],

    hospital: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },
  },
  {
    timestamps: true, 
  }
);

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;