const UserModel = require('../model/chat.user.model');
exports.getAllUsers = async (req, res, next) => {
  try {
    const users = await UserModel.getAll();
    res.json(users);
  } catch (err) {
    next(err);
  }
};