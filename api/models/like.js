const mongoose = require('mongoose');

const likeSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    author: mongoose.Schema.Types.ObjectId,
    post_id: mongoose.Schema.Types.ObjectId,
    publishDate: { type : Date, default: Date.now},
    type: {
        type: String, 
        enum: ['Like', 'Dislike']
    },
});

module.exports = mongoose.model('Like', likeSchema);

