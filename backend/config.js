require('dotenv').config();

module.exports = {
    jwtSecret: process.env.JWT_SECRET,
    mongoURI: process.env.MONGODB_URI,
    port: process.env.PORT || 5001,
    env: process.env.NODE_ENV || 'development',
  };