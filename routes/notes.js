const express = require('express');
const router = express.Router();
const Note = require('../models/Note');
const auth = require('../middleware/auth');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Ограничение на размер файла (5 МБ)
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Разрешенные типы файлов
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'];

// Настройка multer для загрузки файлов
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // Увеличим лимит до 50MB
    }
});

router.post('/', auth, upload.array('attachments', 5), async (req, res) => {
    try {
        console.log('Creating note with attachments:', {
            filesCount: req.files ? req.files.length : 0,
            files: req.files ? req.files.map(f => ({
                filename: f.originalname,
                size: f.size,
                mimetype: f.mimetype
            })) : []
        });

        const attachments = req.files ? req.files.map(file => ({
            filename: file.originalname,
            data: file.buffer,
            contentType: file.mimetype
        })) : [];

        const note = new Note({
            title: req.body.title || '',
            content: req.body.content || '',
            userId: req.user._id,
            tags: req.body.tags ? JSON.parse(req.body.tags) : [],
            attachments: attachments
        });

        const savedNote = await note.save();
        console.log('Note saved with attachments:', {
            noteId: savedNote._id,
            attachmentsCount: savedNote.attachments.length,
            attachments: savedNote.attachments.map(a => ({
                id: a._id,
                filename: a.filename,
                hasData: !!a.data
            }))
        });

        res.status(201).json(savedNote);
    } catch (err) {
        console.error('Error creating note:', err);
        res.status(400).json({ 
            message: 'Failed to create note', 
            error: err.message,
            stack: err.stack 
        });
    }
});

router.get('/', auth, async (req, res) => {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'updatedAt';

    console.log('Fetching notes with sortBy:', sortBy); // Логируем параметр сортировки

    try {
        const notes = await Note.find({ userId: req.user._id })
            .sort({ [sortBy]: -1 })
            .skip(skip)
            .limit(limit)
            .select('title content tags attachments createdAt updatedAt');

        console.log('Sending notes:', notes); // Логируем отправляемые заметки
        
        res.json(notes);
    } catch (err) {
        console.error('Error fetching notes:', err);
        res.status(500).json({ message: 'Failed to fetch notes', error: err.message });
    }
});

router.put('/:id', auth, async (req, res) => {
    try {
        const note = await Note.findOneAndUpdate(
            { _id: req.params.id, userId: req.user._id },
            { 
                title: req.body.title, 
                content: req.body.content,
                tags: req.body.tags,
                updatedAt: Date.now()
            },
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

router.get('/search', auth, async (req, res) => {
    const { query, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    try {
        const notes = await Note.find({
            userId: req.user._id,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ]
        })
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit));

        const total = await Note.countDocuments({
            userId: req.user._id,
            $or: [
                { title: { $regex: query, $options: 'i' } },
                { content: { $regex: query, $options: 'i' } },
                { tags: { $in: [new RegExp(query, 'i')] } }
            ]
        });

        res.send({
            notes,
            currentPage: parseInt(page),
            totalPages: Math.ceil(total / limit)
        });
    } catch (err) {
        res.status(400).send(err);
    }
});

router.get('/sort', auth, async (req, res) => {
    const { sortBy } = req.query;
    try {
        const notes = await Note.find({ userId: req.user._id }).sort({ [sortBy]: -1 });
        res.send(notes);
    } catch (err) {
        res.status(400).send(err);
    }
});

// Добавим новый маршрут для удаления прикрепленного файла
router.delete('/:noteId/attachments/:attachmentId', auth, async (req, res) => {
    try {
        const note = await Note.findOne({ _id: req.params.noteId, userId: req.user._id });
        if (!note) {
            return res.status(404).json({ message: 'Note not found' });
        }

        const attachmentIndex = note.attachments.findIndex(
            attachment => attachment._id.toString() === req.params.attachmentId
        );

        if (attachmentIndex === -1) {
            return res.status(404).json({ message: 'Attachment not found' });
        }

        note.attachments.splice(attachmentIndex, 1);
        await note.save();

        res.json({ message: 'Attachment deleted successfully' });
    } catch (err) {
        console.error('Error deleting attachment:', err);
        res.status(500).json({ message: 'Failed to delete attachment', error: err.message });
    }
});

// Добавим новый маршрут для скачивания файлов
router.get('/:noteId/attachments/:attachmentId/download', auth, async (req, res) => {
    try {
        console.log('Downloading attachment:', {
            noteId: req.params.noteId,
            attachmentId: req.params.attachmentId,
            userId: req.user._id
        });

        const note = await Note.findOne({
            _id: req.params.noteId,
            userId: req.user._id
        });

        if (!note) {
            console.log('Note not found:', {
                noteId: req.params.noteId,
                userId: req.user._id
            });
            return res.status(404).json({ message: 'Note not found' });
        }

        console.log('Note found:', {
            noteId: note._id,
            attachmentsCount: note.attachments.length,
            attachments: note.attachments.map(a => ({
                id: a._id,
                filename: a.filename
            }))
        });

        // Используем find вместо id для поиска вложения
        const attachment = note.attachments.find(
            att => att._id.toString() === req.params.attachmentId
        );

        if (!attachment) {
            console.log('Attachment not found:', {
                attachmentId: req.params.attachmentId,
                availableAttachments: note.attachments.map(a => a._id.toString())
            });
            return res.status(404).json({ message: 'Attachment not found' });
        }

        console.log('Found attachment:', {
            filename: attachment.filename,
            contentType: attachment.contentType,
            dataLength: attachment.data ? attachment.data.length : 0
        });

        if (!attachment.data) {
            return res.status(404).json({ message: 'Attachment data is missing' });
        }

        // Устанавливаем правильные заголовки для скачивания файла
        res.set({
            'Content-Type': attachment.contentType,
            'Content-Disposition': `attachment; filename="${encodeURIComponent(attachment.filename)}"`,
            'Content-Length': attachment.data.length
        });

        // Отправляем файл
        res.send(attachment.data);
    } catch (err) {
        console.error('Error downloading attachment:', err);
        res.status(500).json({ 
            message: 'Failed to download attachment', 
            error: err.message,
            stack: err.stack
        });
    }
});

module.exports = router;
