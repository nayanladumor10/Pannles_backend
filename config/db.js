require("dotenv").config();
const mongoose = require("mongoose");

const db = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URL)
        console.log("✅ Database connected successfully");
    } catch (error) {
        console.error("❌ Database connection error:", error.message); 
    }
};
db()

module.exports = db;
