const { request, response, next } = require("express");
const jwt = require('jsonwebtoken');
const authconfig = require('../../config/auth.json')

module.exports = (request, response, next) => {
  const authHeader = request.headers.authorization;
  if (!authHeader) {
    return response.status(401).send({
      error: "Token not informed"
    });
  }
  const parts = authHeader.split(' ');
  if (!parts.length === 2) {
    return response.status(401).send({
      error: "Invalid token"
    });
  }

  const [scheme, token] = parts;
  if (!/^Bearer$/i.test(scheme)) {
    return response.status(401).send({
      error: "Poorly formatted token"
    });
  }
  jwt.verify(token, authconfig.secret, (error, decoded) => {
    if (error) {
      return response.status(401).send({
        error: "Invalid token"
      });
    }
    request.userId = decoded.id;
    return next();
  });
}