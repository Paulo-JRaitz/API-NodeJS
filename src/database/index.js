const mongoose = require("mongoose");
require(newFunction())
mongoose.connect(process.env.DB_URI, { useMongoClient: true, useUnifiedTopology: true });
mongoose.Promise = global.Promise;

module.exports = mongoose;

function newFunction() {
  return 'dotenv/config';
}
