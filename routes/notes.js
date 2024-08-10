const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const auth = require('../middleware/auth');

router.post('/', auth, async (req, res) => {
    const note = new Note({
        title: req.body.title,
        content: req.body.content,
        userId: req.user._id,
    });

    try {
        const savedNote = await note.save();
        res.send(savedNote);
    } catch (err) {
        res.status(400).send(err);
    }
});

router.get('/', auth, async (req, res) => {
    try {
        const notes = await Note.find({ userId: req.user._id });
        res.send(notes);
    } catch (err) {
        res.status(400).send(err);
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const note = await Note.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { title: req.body.title, content: req.body.content },
            { new: true }
        );
        res.send(note);
    } catch (err) {
        res.status(400).send(err);
    }
});

router.delete('/:id', auth, async (req, res) => {
    try {
        const note = await Note.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
        res.send(note);
    } catch (err) {
        res.status(400).send(err);
    }
});

module.exports = router;