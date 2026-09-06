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

    patients: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Patient",
      },
    ],

    reports: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "LabReport",  
      },
    ],

    calendar: [
      {
        date: {
          type: Date,
          required: true,
        },
        slots: [
          {
            time: { type: String, required: true }, 
            status: {
              type: String,
              enum: ["free", "booked", "cancelled"],
              default: "free",
            },
            patient: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Patient",
              default: null,
            },
          },
        ],
      },
    ],

    emergencies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Emergency",
      },
    ],
  },
  {
    timestamps: true, 
  }
);

const Doctor = mongoose.model("Doctor", doctorSchema);

export default Doctor;