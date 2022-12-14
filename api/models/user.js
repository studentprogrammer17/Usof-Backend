const mongoose = require('mongoose');

const userSchema = mongoose.Schema({
    _id: mongoose.Schema.Types.ObjectId,
    login: { type: String, required: true },
    fullName: { type: String, required: false },
    email: { 
        type: String, 
        required: true, 
        unique: true, 
        match: /[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*@(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?/
    },
    password: { type: String, required: true },
    confirmPassword: { type: String, required: true },
    userPhoto: {type: String, required:false},
    rating: {type: Number, required:false},
    role: {type: String, required:false},
    confirmationCode: { 
        type: String, 
        unique: true 
    },
    status: {
        type: String, 
        enum: ['Pending', 'Active'],
        default: 'Pending'
    },
    isMailConfirmed: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('User', userSchema);