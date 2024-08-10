const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');

dotenv.config();

const app = express();

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Добавьте эту строку

// Настройка корневого маршрута
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
});

const db = mongoose.connection;
db.on('error', console.error.bind(console, 'connection error:'));
db.once('open', () => {
    console.log('Connected to MongoDB');
});

app.use('/users', require('./routes/users'));
app.use('/notes', require('./routes/notes'));

app.listen(3000, () => {
    console.log('Server is running on port 3000');
});