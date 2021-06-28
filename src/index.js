const express = require('express');

const app = express();
const port = 3003;

app.use(express.json());
app.use(express.urlencoded({ extended: false }))

require('./app/controllers/index')(app);

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`)
})