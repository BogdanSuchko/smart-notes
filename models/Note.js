const mongoose = require('mongoose');

const NoteSchema = new mongoose.Schema({
	title: String,
	content: String,
	userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
	tags: [String],
	attachments: [{
		filename: String,
		data: Buffer,
		contentType: String
	}],
	createdAt: { type: Date, default: Date.now },
	updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Note', NoteSchema);
