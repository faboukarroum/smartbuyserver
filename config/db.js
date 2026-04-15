const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    console.error('Make sure MongoDB is running on your machine.');
    console.error(`Attempted connection URI: ${process.env.MONGO_URI}`);
    process.exit(1);
  }
};

module.exports = connectDB;
