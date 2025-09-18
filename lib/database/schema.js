// Database Schema Design for SymMuse Menstrual Health Tracker

// Users Collection Schema
export const userSchema = {
  _id: "ObjectId",
  email: "string (unique)",
  password: "string (hashed)",
  profile: {
    firstName: "string",
    lastName: "string",
    dateOfBirth: "date",
    profilePicture: "string (url)",
    bio: "string",
    location: "string",
  },
  preferences: {
    cycleLength: "number (default: 28)",
    periodLength: "number (default: 5)",
    notifications: {
      periodReminder: "boolean (default: true)",
      ovulationReminder: "boolean (default: true)",
      moodTracking: "boolean (default: true)",
    },
    privacy: {
      profileVisibility: "string (public/friends/private)",
      shareData: "boolean (default: false)",
    },
  },
  subscription: {
    plan: "string (free/premium)",
    startDate: "date",
    endDate: "date",
    stripeCustomerId: "string",
  },
  createdAt: "date",
  updatedAt: "date",
}

// Period Tracking Collection Schema
export const periodSchema = {
  _id: "ObjectId",
  userId: "ObjectId (ref: users)",
  startDate: "date",
  endDate: "date",
  flow: "string (light/medium/heavy)",
  symptoms: ["string"], // cramps, headache, bloating, etc.
  notes: "string",
  predicted: "boolean (default: false)",
  createdAt: "date",
  updatedAt: "date",
}

// Daily Mood & Symptom Tracking Schema
export const moodTrackingSchema = {
  _id: "ObjectId",
  userId: "ObjectId (ref: users)",
  date: "date",
  mood: {
    level: "number (1-10)",
    emotions: ["string"], // happy, sad, anxious, irritated, etc.
  },
  symptoms: {
    physical: ["string"], // cramps, headache, bloating, fatigue, etc.
    emotional: ["string"], // mood swings, anxiety, depression, etc.
  },
  energy: "number (1-10)",
  sleep: {
    hours: "number",
    quality: "number (1-10)",
  },
  notes: "string",
  createdAt: "date",
}

// Community Posts Schema
export const communityPostSchema = {
  _id: "ObjectId",
  userId: "ObjectId (ref: users)",
  title: "string",
  content: "string",
  category: "string", // general, periods, mood, health, etc.
  tags: ["string"],
  likes: ["ObjectId"], // array of user IDs who liked
  comments: [
    {
      userId: "ObjectId (ref: users)",
      content: "string",
      createdAt: "date",
      likes: ["ObjectId"],
    },
  ],
  isAnonymous: "boolean (default: false)",
  isPinned: "boolean (default: false)",
  createdAt: "date",
  updatedAt: "date",
}

// Teleconsultation Schema
export const consultationSchema = {
  _id: "ObjectId",
  userId: "ObjectId (ref: users)",
  doctorId: "ObjectId (ref: doctors)",
  appointmentDate: "date",
  duration: "number (minutes)",
  status: "string", // scheduled, completed, cancelled, no-show
  type: "string", // video, chat, phone
  symptoms: ["string"],
  notes: "string",
  prescription: "string",
  followUpRequired: "boolean",
  rating: "number (1-5)",
  feedback: "string",
  createdAt: "date",
  updatedAt: "date",
}

// Doctors Collection Schema
export const doctorSchema = {
  _id: "ObjectId",
  email: "string (unique)",
  password: "string (hashed)",
  profile: {
    firstName: "string",
    lastName: "string",
    specialization: "string",
    experience: "number (years)",
    qualifications: ["string"],
    profilePicture: "string (url)",
    bio: "string",
    languages: ["string"],
  },
  availability: [
    {
      day: "string", // monday, tuesday, etc.
      slots: [
        {
          startTime: "string", // "09:00"
          endTime: "string", // "10:00"
          isAvailable: "boolean",
        },
      ],
    },
  ],
  rating: "number",
  totalConsultations: "number",
  isVerified: "boolean",
  createdAt: "date",
  updatedAt: "date",
}

// Notifications Schema
export const notificationSchema = {
  _id: "ObjectId",
  userId: "ObjectId (ref: users)",
  type: "string", // period_reminder, ovulation, community_like, consultation, etc.
  title: "string",
  message: "string",
  isRead: "boolean (default: false)",
  data: "object", // additional data specific to notification type
  createdAt: "date",
}
