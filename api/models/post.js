const mongoose = require('mongoose');

const postSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    author: mongoose.Schema.Types.ObjectId,
    title: { type: String, required: true },
    publishDate: { type : Date, default: Date.now},
    status: {
        type: String, 
        enum: ['Active', 'Inactive'],
        default: 'Active'
    },
    likes: {type: String},
    content: { type: String, required: true },
    categories: { type: String, required: true }
});

module.exports = mongoose.model('Post', postSchema);

