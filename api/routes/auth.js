const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const nodemailer = require('nodemailer');
const randtoken = require('rand-token');
const jwt = require("jsonwebtoken");
const multer = require("multer");
const User = require("../models/user");
const nodemail = require('../models/nodemail')

const storage = multer.diskStorage({
    destination: function(req, file, cb) {
      cb(null, './uploads/');
    },
    filename: function(req, file, cb) {
      cb(null, Date.now() + file.originalname); 
    }
  });
  
  const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/png' || file.mimetype === 'image/jpg') {
      cb(null, true);
    } else {
      cb(null, false);
    }
  };
  
  const upload = multer({
    storage: storage,
    limits: {
      fileSize: 1024 * 1024 * 5
    },
    fileFilter: fileFilter
  });


router.post("/login", async (req,res,next) => {
    await User.find({login: req.body.login})
    .exec()
    .then(user => {
        if(user.length < 1) {
            return res.status(401).json({
                message: 'Authentification is failed'
            })
        }
        if(user[0].isMailConfirmed !== true) {
            return res.status(401).json({
                message: 'Mail is not confirmed'
            })
        }
        const isPass = bcrypt.compareSync(
            req.body.password,
            user[0].password
        )
        if(isPass) {
            const token = jwt.sign({
                email: user[0].email,
                userId: user[0]._id
            }, 
            process.env.JWT_KEY,
            {
                expiresIn: "1h"
            }
            );
            return res.status(200).json({
                message: 'You\'ve been logged in!\n Insert token in authentication field in header',
                token: `Bearer ${token}`,
                userId: user[0]._id
            })
        }
        else {
            return res.status(401).json({
                message: 'Authentification is failed'
            })
        }
    })
    .catch(err => {
        res.status(500).json({
            error: err
        });
    })
});

router.post("/logout", (req,res,next) => { 
    res.status(200).json({
        message: "You are logged out"
    });
    res.end();
});

router.post("/register",upload.single('userPhoto'), async (req,res,next) => {
    await User.find({email: req.body.email})
    .exec()
    .then(user => {
        if(user.length >= 1) {
            return res.status(409).json({
                message: "This email has already exist"
            });
        }
        else {
            User.find({login: req.body.login})
            .exec()
            .then(user => {
                if(user.length >= 1) {
                    return res.status(409).json({
                        message: "This login has already exist"
                    });
                }
                else {
                    if(!req.body.password.match(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{6,})/)) {
                        return res.status(409).json({
                            message: "Password has to have: one lowercase, uppercase, digit and at least 6 length"
                        });
                    }
                    const salt = bcrypt.genSaltSync(10)
                    let password = bcrypt.hashSync(req.body.password, salt);
                    let confirmPassword = bcrypt.hashSync(req.body.confirmPassword, salt)
                    if(req.body.confirmPassword !== req.body.password) {
                        return res.status(409).json({
                            message: "Passwords do not match"
                        });
                    }
                    const user = new User({
                        _id: new mongoose.Types.ObjectId(),
                        login: req.body.login,
                        email: req.body.email,
                        password: password,
                        confirmPassword: confirmPassword,
                        role: "user",
                        fullName: "not set",
                        rating: 0,
                        userPhoto: "not set"

                    });
                    const token = jwt.sign({
                        email: req.body.email,
                        userId: user._id
                    }, 
                    process.env.JWT_KEY,
                    {
                        expiresIn: "1h"
                    }
                    );

                    user
                    .save()
                    .then(result => {
                            const message = {
                            to: req.body.email,
                            subject: 'Email Confirm',
                            html: `<h1>Confirm your email, clicking link below</h2>                                       
                                    <h2>
                                    <a href="http://localhost:3000/api/auth/email-confirmation/${token}">
                                        http://localhost:3000/api/auth/email-confirmation/${token}
                                    </a>
                                    </h2>     
                            `, 
                            }
                            nodemail(message)

                        res.status(201).json({
                            message: "You've been registered. Do not forget to confirm email!"
                        });
                    })
                    .catch(err => {
                        console.log(err.message)
                        if(err.message.includes('User validation failed: email:')) {
                            res.status(500).json({
                                error: "Invalid email"
                            });
                        }
                        else {
                            res.status(500).json({
                                error: err
                            });
                        }
                    });    
                        
                
                }
            });
        }
    });
});

router.post("/email-confirmation/:token", async (req,res,next) => { 
    const token = req.params.token;
    const decoded = jwt.verify(token, process.env.JWT_KEY)

    await User.updateOne({_id: decoded.userId}, { $set: { "isMailConfirmed": true } })
    .exec()
    .then(result => {
      res.status(200).json({
          message: 'Mail is confirmed',
          request: {
              type: 'POST',
              url: 'http://localhost:3000/auth/login'
          }
      });
    });

});


router.post("/password-reset", async (req,res,next) => {
    await User.find({email: req.body.email})
    .exec()
    .then(user => {
        if(user.length < 1) {
            return res.status(401).json({
                message: 'Mail does not exist'
            })
        }
        const token = jwt.sign({
            email: req.body.email,
            userId: user._id
        }, 
        process.env.JWT_KEY,
        {
            expiresIn: "1h"
        }
        );
        
        const message = {
            to: req.body.email,
            subject: 'Reset Password',
            html: `<h1>Reset your password clicking link below</h1>
                    <p>If you does not want to reset password - ignore this message<p>                                       
                    <h2>
                    <a href="http://localhost:3000/api/auth/password-reset/${token}">
                        http://localhost:3000/api/auth/password-reset/${token}
                    </a>
                    </h2>     
            `, 
        }
        nodemail(message);
        res.status(201).json({
            message: "Check your mail"
        });

    })
    .catch(err => {
        res.status(500).json({
            error: err
        });
    })
});

router.post("/password-reset/:token", async (req,res,next) => { 
    const token = req.params.token;
    const decoded = jwt.verify(token, process.env.JWT_KEY)

    const salt = bcrypt.genSaltSync(10)
    const newPassword = bcrypt.hashSync(req.body.newPassword, salt)
    await User.updateOne({_id: decoded.userId}, { $set: { "password": newPassword } })
    .exec()
    .then(result => {
      res.status(200).json({
          message: 'Password is resetted',
          request: {
              type: 'POST',
              url: 'http://localhost:3000/auth/login'
          }
      });
    });
});



module.exports = router;

