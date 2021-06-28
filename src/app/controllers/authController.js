const { request, response } = require('express');
const express = require('express');
const User = require('../models/User')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authconfig = require('../../config/auth.json')
const router = express.Router();
const crypto = require('crypto');
const mailer = require('../../modules/mailer');

function generateToke(params = {}) {
  return jwt.sign(params, authconfig.secret,
    {
      expiresIn: 86400,
    });
}

router.post('/register', async (request, response) => {
  const { email } = request.body;

  try {
    if (await User.findOne({ email }))
      return response.status(400).send({ message: 'User already exists.' });

    const user = await User.create(request.body)
    user.password = undefined;

    return response.send({ user, token: generateToke({ id: user.id }) })
  } catch (error) {
    return response.status(400).send({ error: 'Registration failed.' });
  }
});

router.post('/authenticate', async (request, response) => {
  const { email, password } = request.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user) {
    return response.status(400).send({ error: 'User not found.' });
  }
  if (!await bcrypt.compare(password, user.password)) {
    return response.status(400).send({ error: "Password doesn't match." });
  }
  user.password = undefined;
  response.send({ user, token: generateToke({ id: user.id }) });
});

router.post('/forgot_password', async (request, response) => {
  const { email } = request.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      return response.status(400).send({ error: 'User not found.' });
    }
    const token = crypto.randomBytes(20).toString('hex');
    const now = new Date();
    now.setHours(now.getHours() + 1);

    await User.findByIdAndUpdate(user.id, {
      '$set': {
        passwordResetToken: token,
        passwordResetExpire: now
      }
    });
    console.log(token);
    mailer.sendMail({
      to: email,
      from: 'paulo.raitz@hotmail.com',
      cc: 'paulinho.raitz@gmail.com',
      template: 'auth/forgot_password',
      subject: "Restore your password",
      context: { token },
    }, (err) => {
      if (err) {
        console.log(err)
        return response.status(400).send({ error: "Cannot send forgot password email" });
      }
      return response.status(200).send({ message: "Email enviado com sucesso!" });
    });
  }
  catch (error) {
    console.log(error)
    return response.status(400).send({ error: "Email not found." });
  }
});

module.exports = app => app.use('/auth', router);