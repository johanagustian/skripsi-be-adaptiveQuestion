const userService = require('../services/userService');
const { REGISTRASI_SCHEMA, LOGIN_SCHEMA } = require('../utils/validations');

const registerUser = async (req, res, next) => {
  try {
    const { error, value } = REGISTRASI_SCHEMA.validate(req.body);
    if (error) {
      return res.status(400).json({
        status: 'failed',
        message: error.details[0].message
      });
    }

    const newUser = await userService.register(value);

    return res.status(201).json({
      status: 'success',
      message: 'User berhasil ditambahkan',
      data: newUser,
    });
  } catch (error) {
    next(error);
  }
};

const getCurrentUser = async ( req, res, next ) => {
   try {
      const userId = req.user.id;

      const user = await userService.getById(userId);

      return res.status(200).json({
         status: "success",
         data: user
      });

   } catch(err) {
      next(err);
   }
}

const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { userData, source } = await userService.getById(id);

    return res.status(200)
      .header('X-Data-Source', source)
      .json({ 
        status: 'success', 
        data: userData 
      });

  } catch (error) {
    next(error);
  }
};

module.exports = { registerUser, getCurrentUser, getUserById };