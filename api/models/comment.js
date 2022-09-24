const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    author: mongoose.Schema.Types.ObjectId,
    post_id: mongoose.Schema.Types.ObjectId,
    publishDate: { type : Date, default: Date.now},
    content: { type: String, required: true }
});

module.exports = mongoose.model('Comment', commentSchema);

