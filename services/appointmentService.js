
import mongoose from 'mongoose';
import Appointment from '../models/Appointment.js';
import SlotLock from '../models/SlotLock.js';
import Doctor from '../models/doctor.js';

function formatTimeHHMM(time) {
  if (!time) throw new Error('Time is required for formatting');
  const [h, m] = time.split(':').map(Number);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2,'0')}`;
}

export function generateSlots(startTime, endTime, minutes = 30) {
  const slots = [];
  const toMinutes = t => {
    const [hh, mm] = t.split(':').map(Number);
    return hh*60 + mm;
  };
  let cur = toMinutes(startTime);
  const end = toMinutes(endTime);
  while (cur + minutes <= end) {
    const hh = String(Math.floor(cur / 60)).padStart(2,'0');
    const mm = String(cur % 60).padStart(2,'0');
    slots.push(`${hh}:${mm}`);
    cur += minutes;
  }
  return slots;
}

function getDateRange(date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0,0,0,0);
  const endOfDay = new Date(date);
  endOfDay.setHours(23,59,59,999);
  return { startOfDay, endOfDay };
}

export async function getAvailableSlots(doctorId, date) {
  const doctor = await Doctor.findById(doctorId);
  if (!doctor) throw new Error('Doctor not found');

  const allSlots = generateSlots(doctor.shiftStart ?? '09:00', doctor.shiftEnd ?? '16:00');

  const { startOfDay, endOfDay } = getDateRange(date);

  const booked = await Appointment.find({
    doctorId,
    date: { $gte: startOfDay, $lte: endOfDay },
    status: 'scheduled'
  }, 'time').lean();

  const bookedSet = new Set(booked.map(b => formatTimeHHMM(b.time)));
  return allSlots.filter(s => !bookedSet.has(s));
}

export async function ensureDoctorAvailable(doctorId, date, time) {
  const formattedTime = formatTimeHHMM(time);
  const availableSlots = await getAvailableSlots(doctorId, date);
  if (!availableSlots.includes(formattedTime)) {
    throw new Error('Doctor not available at this slot');
  }
}

export async function bookAppointmentAtomically({ patient, doctorId, date, time, appointmentType }) {
  const session = await mongoose.startSession();
  try {
    let appointment;
    await session.withTransaction(async () => {
      const { startOfDay, endOfDay } = getDateRange(date);

      const existing = await Appointment.findOne({
        doctorId,
        date: { $gte: startOfDay, $lte: endOfDay },
        time: formatTimeHHMM(time),
        status: 'scheduled'
      }).session(session);

      if (existing) throw new Error('Slot already booked');

      appointment = await Appointment.create([{
        patient,
        doctorId,
        date,
        time: formatTimeHHMM(time),
        appointmentType,
        status: 'scheduled'
      }], { session });

      appointment = appointment[0];
    });
    return appointment;
  } catch (err) {
    if (err.code === 11000) throw new Error('Slot already booked (duplicate)');
    throw err;
  } finally {
    session.endSession();
  }
}


export async function tryLockAndBook({ patient, doctorId, date, time, appointmentType }) {
  const lockDate = date.toISOString().split('T')[0];
  const formattedTime = formatTimeHHMM(time);

  try {
    await SlotLock.create({ doctorId, date: lockDate, timeSlot: formattedTime });
  } catch (err) {
    if (err.code === 11000) throw new Error('Slot locked/claimed');
    throw err;
  }

  try {
    const appointment = await Appointment.create({
      patient,
      doctorId,
      date,
      time: formattedTime,
      appointmentType,
      status: 'scheduled'
    });
    return appointment;
  } catch (err) {
    throw err;
  } finally {
    await SlotLock.deleteOne({ doctorId, date: lockDate, timeSlot: formattedTime }).catch(()=>{});
  }
}
