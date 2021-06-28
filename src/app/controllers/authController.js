const { request, response } = require('express');
const express = require('express');
const User = require('../models/User')
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authconfig = require('../../config/auth.json')
const router = express.Router();
const crypto = require('crypto');
const mailer = require('../../modules/mailer');
const { use } = require('../../modules/mailer');

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
      html: `<!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8" />
          <meta http-equiv="X-UA-Compatible" content="IE=edge" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <title>Recover Password</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500&display=swap');
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700&display=swap');
            :root {
              --white: #fff;
              --light: #ddd;
              --regular: #999;
              --darker: rgba(61, 61, 61, 0.623);
              --black: #000;
              --ok: #03b848;
            }
            * {
              margin: 0;
              padding: 0;
              outline: 0;
              box-sizing: border-box;
            }
            html,
            body,
            #root {
              height: 100%;
            }
            body {
              background: var(--light);
              -webkit-font-smoothing: antialiased;
            }
            body,
            input,
            button {
              font-family: Roboto, sans-serif;
              padding-top: 5rem;
              font-family: Roboto, sans-serif;
              display: flex;
              justify-content: center;
              align-items: stretch;
            }
      
            img {
              align-items: center;
              max-width: 6rem;
              padding-bottom: 1rem;
            }
            div {
              width: 400px;
              height: 140px;
              border-radius: 1rem;
              padding: 1rem;
              background-color: #262626;
              color: whitesmoke;
              box-shadow: 3px -3px 6px var(--darker), 3px 3px 6px var(--white);
              display: flex;
              flex-direction: column;
              align-items: center;
            }
      
            h1 {
              font-size: 30px;
              margin: 0 auto;
            }
            section {
              display: flex;
              flex-direction: column;
              align-items: center;
              width: 450px;
              height: 320px;
              background: var(--white);
              border-radius: 1rem;
              box-shadow: 4px -4px 10px var(--white), 4px 4px 10px var(--regular);
              padding: 30px 20px;
            }
            p {
              padding-bottom: 1.4rem;
            }
            code {
              background: var(--darker);
              border-radius: 0.5rem;
              font-size: 16px;
              text-align: center;
              color: var(--ok);
              padding: 0.2rem;
            }
          </style>
        </head>
        <body>
          <section>
            <header>
              <img
                src="https://raw.githubusercontent.com/Paulo-JRaitz/Front-end-Back-end/17bdd091c2e83168a94dd69a4bc6320a7ab41f9c/web/public/pjr.svg"
                alt="Logo Rtz"
              />
            </header>
            <main>
              <div>
                <h1>Reset your password</h1>
                <p>you reset the password with this token</p>
                <code>${token}</code>
              </div>
            </main>
          </section>
        </body>
      </html>
      `,
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

router.post('/reset_password', async (request, response) => {
  const { email, token, password } = request.body;

  try {
    const user = await User.findOne({ email }).select('+passwordResetToken passwordResetExpire');

    if (!user) {
      return response.status(400).send({ error: "User not found" });
    }

    if (token !== user.passwordResetToken) {
      return response.status(400).send({ error: "Invalid token" });
    }

    const now = new Date()
    if (now > user.passwordResetExpire) {
      return response.status(400).send({ error: "Expired token, generate a new one" });
    }

    user.password = password;

    await user.save();

    response.status(200).send({ message: "Password changed successfully" });

  } catch (error) {
    console.log(error)
    return response.status(400).send({ error: "Can not reset password, try again" });
  }
});
module.exports = app => app.use('/auth', router);