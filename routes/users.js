const express = require('express');
const router = express.Router();
const User = require('../models/User');
const jwt = require('jsonwebtoken');

router.post('/login', async (req, res) => {
    const username = req.body.username;

    const user = await User.findOne({ username });
    if (!user) {
        // Create new user if not exists
        const newUser = new User({ username });
        await newUser.save();
        const token = jwt.sign({ _id: newUser._id }, process.env.JWT_SECRET);
        return res.send({ token });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET);
    res.send({ token });
});

module.exports = router;