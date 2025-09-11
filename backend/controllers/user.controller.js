const UserModel = require('../model/chat.user.model');

exports.getAllUsers = async (req, res, next) => {
  try {
    console.log('🔍 Getting all users...');
    const users = await UserModel.getAll();
    console.log('✅ All users from database:', users.length, 'users found');
    return res.json(users);
  } catch (err) {
    console.error('❌ Error in getAllUsers controller:', err);
    console.error('Error details:', err.message);
    console.error('Error stack:', err.stack);
    return next(err);
  }
};