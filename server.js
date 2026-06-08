require('dotenv').config();
const express = require('express');
const cors = require('cors');

const userRouter = require('./routes/userRouter');
const authenticationRouter = require('./routes/authenticationRouter');
const documentRouter = require('./routes/documentRouter');
const sessionRouter = require('./routes/sessionRouter')
const testAbility = require('./routes/abilityTestRouter')

const app = express();
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || 'localhost';

app.use(cors({
    origin: 'http://localhost:5173',
    credentials: true
}));

app.use(express.json())

app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: 'welcome to APTA'
    })
})

app.use('/auth', authenticationRouter);

app.use('/documents', documentRouter);

app.use('/test-abilities', testAbility);

app.use('/sessions', sessionRouter);

app.use('/users', userRouter);

app.use((err, req, res, next) => {
  // Ambil statusCode dari error yang dilempar service, jika tidak ada, default ke 500
  const statusCode = err.statusCode || 500;
  
  // Ambil pesan error-nya
  const message = err.message || "Internal Server Error";

  // Kirim respons JSON yang rapi
  res.status(statusCode).json({
    status: statusCode >= 500 ? 'error' : 'failed',
    message: message
  });
});

app.listen(PORT, HOST, () => {
  console.log(`Server APTA-API berjalan pada http://${HOST}:${PORT}`);
});