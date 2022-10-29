const mongoose = require('mongoose');

const commentSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    author: { type: String},
    post_id: mongoose.Schema.Types.ObjectId,
    publishDate: { type : Date, default: Date.now},
    content: { type: String, required: true },
    userPhoto: { type: String},
    edited: {type: Boolean}
});

module.exports = mongoose.model('Comment', commentSchema);

