const { Pool } = require('pg');
const UserModel = require('../model/user.model');
const config = require('../config');

// Initialize user model with database pool
const pool = new Pool(config.database);
const userModel = new UserModel(pool);

exports.getAllUsers = async (req, res, next) => {
  try {
    console.log('🔍 Getting all users...');
    const result = await userModel.getAllUsers();
    console.log('✅ All users from database:', result.users.length, 'users found');
    return res.json(result.users);
  } catch (err) {
    console.error('❌ Error in getAllUsers controller:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    return next(err);
  }
};

exports.getUserDetails = async (req, res, next) => {
  try {
    const { userId } = req.params;
    console.log('🔍 Getting user details for ID:', userId);
    
    const user = await userModel.getUserById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    console.log('✅ User details found:', user);
    return res.json(user);
  } catch (err) {
    console.error('❌ Error in getUserDetails controller:', err);
    return next(err);
  }
};