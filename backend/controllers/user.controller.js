const UserModel = require('../model/chat.user.model');
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await UserModel.getAll();
    console.log('Fetched users:', users); // <-- Add this
    res.json(users);
  } catch (err) {
    next(err);
  }
};