const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const multer = require('multer');
const upload = multer();

const authRoutes = require('./api/routes/auth');
const userRoutes = require('./api/routes/users');
const cayegoryRoutes = require('./api/routes/categories');
const postRoutes = require('./api/routes/posts');
const commentsRoutes = require('./api/routes/comments');

const app = express();
mongoose.connect('mongodb+srv://admin:'+ process.env.MONGO_ATLAS_PW +'@usof-backend.6idzgcc.mongodb.net/test');

app.use(morgan('dev'));
app.use('/uploads',express.static('uploads'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.use(express.static('public'));


// prevent CORS errors
app.use((req,res,next) => { 
    res.header('Acces-Control-Allow-Origin', '*');
    res.header("Acces-Control-Allow-Headers",
    'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if(req.method === 'OPTIONS') {
        res.header('Acces-Control-Allow-Methods', 'GET, PUT, POST, PATCH, DELETE');
        return res.status(200).json({});
    }
    next();
});

app.use('/api/auth', authRoutes);
app.use('/users', userRoutes);
app.use('/categories', cayegoryRoutes);
app.use('/posts', postRoutes);
app.use('/comments', commentsRoutes);

app.use((req,res,next) => {
    const error = new Error("Not found");
    error.status = 404;
    next(error);
});

app.use((error,req,res,next) => {
    res.status(error.status || 500);
    res.json({
        message: error.message
    });
});

module.exports = app;
