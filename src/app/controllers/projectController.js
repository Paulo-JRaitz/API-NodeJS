const { request, response } = require('express');
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/auth')

router.use(authMiddleware);

router.get('/', (request, response) => {
  response.send({ message: "Wellcome!", user: request.userId })
});
module.exports = app => app.use('/projects', router);