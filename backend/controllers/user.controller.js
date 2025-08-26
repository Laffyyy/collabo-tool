const UserModel = require('../model/chat.user.model');
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await UserModel.getAll();
    console.log('All users from database:', users); // Debug log
    return res.json(users);
  } catch (err) {
    return next(err);
  }
};