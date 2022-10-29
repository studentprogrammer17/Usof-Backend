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
      cb(null, '../project-app/src/uploads');
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
                message: 'Логін чи пароль невірний'
            })
        }
        if(user[0].isMailConfirmed !== true) {
            return res.status(401).json({
                message: 'email не підтверджений'
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
                message: 'Ви успішно зайшли!',
                token: `${token}`,
                userId: user[0]._id
            })
        }
        else {
            return res.status(401).json({
                message: 'Логін чи пароль невірний'
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
                message: "Такий email вже існує"
            });
        }
        else {
            User.find({login: req.body.login})
            .exec()
            .then(user => {
                if(user.length >= 1) {
                    return res.status(409).json({
                        message: "Такий логін вже існує"
                    });
                }
                else {
                    if(req.body.login.length < 4 || req.body.login.length.length > 20) {
                        return res.status(409).json({
                            message: "Логін повинен бути не менш ніж 4 символа та не більш 20"
                        });
                    }
                    if(!req.body.password.match(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{6,})/)) {
                        return res.status(409).json({
                            message: "У паролі має бути як мінімум: 6 сімволів, одна цифра, маленькая та велика літера"
                
                        });
                    }
                    const salt = bcrypt.genSaltSync(10)
                    let password = bcrypt.hashSync(req.body.password, salt);
                    let confirmPassword = bcrypt.hashSync(req.body.confirmPassword, salt)
                    if(req.body.confirmPassword !== req.body.password) {
                        return res.status(409).json({
                            message: "Паролі не співпадають"
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
                            subject: 'Підтвердження реєстрації на сайті "деВорог"',
                            html: `<h1>Вас вітає підтримка сайту "деВорог", для реєстрації вам залишилось підтвердити ваш емейл.</h2>                                       
                                    <h2>Якщо ви не рєструвались на сайті, проігноруйте це повідомлення</h2>
                                    <h2>
                                    <a href="http://localhost:3000/email-confirmation/${token}">
                                        http://localhost:3000/email-confirmation/${token}
                                    </a>
                                    </h2>     
                            `, 
                            }
                            nodemail(message)

                        res.status(201).json({
                            message: "Ви були зареєстровані! Не забудьте підтвердити ваш емейл!"
                        });
                    })
                    .catch(err => {
                        console.log(err.message)
                        if(err.message.includes('User validation failed: email:')) {
                            res.status(500).json({
                                message: "НЕвірний емейл"
                            });
                        }
                        else {
                            res.status(500).json({
                                message: err
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
          message: 'Емейл підтверджен',
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
                message: 'Такого емейлу не існує'
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
            subject: 'Відновлення паролю',
            html: `<h1>Для відновлення паролю перейдіть по посиланню ніжче</h1>
                    <p>Якщо ви не хочете змінювати пароль на сайті, проігноруйте це повідомлення<p>                                       
                    <h2>
                    <a href="http://localhost:3000/reset-password/${token}">
                    http://localhost:3000/reset-password/${token}
                    </a>
                    </h2>     
            `, 
        }
        nodemail(message);
        res.status(201).json({
            message: "Перевірте емейл"
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
    if(!req.body.newPassword.match(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{6,})/)) {
        return res.status(409).json({
            message: "У паролі має бути як мінімум: 6 сімволів, одна цифра, маленькая та велика літера"
        });
    }
    if(req.body.newPasswordConfirm !== req.body.newPassword) {
        return res.status(409).json({
            message: "Паролні не співпадають"
        });
    }
    const salt = bcrypt.genSaltSync(10)
    const newPassword = bcrypt.hashSync(req.body.newPassword, salt)
    const newConfPassword = bcrypt.hashSync(req.body.newPasswordConfirm, salt)
    await User.updateMany({_id: decoded.userId}, { $set: { "password": newPassword, "confirmPassword": newConfPassword} })
    .exec()
    .then(result => {
      res.status(200).json({
          message: 'Пароль відновлен!',
          request: {
              type: 'POST',
              url: 'http://localhost:3000/auth/login'
          }
      });
    });
});

router.get("/check-token/:token", async (req, res, next) => {
    const token = req.params.token;
    try {
        const decoded = jwt.verify(token, process.env.JWT_KEY);
        req.userData = decoded;
        if (Date.now() - decoded.expiresIn > 0) {
            res.status(200).json({text: false})
        } else {
            await User.findById(req.userData.userId)
            .select('role')
            .exec()
            .then(role => {
                res.status(200).json({text: true,userRole: role.role})
            });
            
        }
        next();
    }
    catch(error) {
        return res.status(401).json({
            text: false
        });
    }
});




module.exports = router;

