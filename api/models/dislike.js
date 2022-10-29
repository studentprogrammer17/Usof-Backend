const mongoose = require('mongoose');

const DislikeSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    userLogin: {
        type: String,
        ref: 'User'
    },
    postId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Post'
    },
    commentId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Comment'
    },
    
}, {timestamps: true});

module.exports = mongoose.model('DisLike', DislikeSchema);

