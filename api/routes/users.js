const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const checkAuth = require("../middleware/check-auth")


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

router.get("/", checkAuth, async (req, res, next) => {
    await User.find()
        .select("_id login email fullName userPhoto rating role")
        .exec()
        .then(docs => {
            const response = {
                count: docs.length,
                users: docs.map(doc => {
                    return {
                        _id: doc._id,
                        login: doc.login,
                        email: doc.email,
                        request: {
                            type: "GET",
                            url: "http://localhost:3000/users/" + doc._id
                        }
                    };
                })
            };
            res.status(200).json(response);
      })
      .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
      });
});

router.post("/", checkAuth, async (req, res, next) => {
  await User.findById(req.userData.userId)
  .select('role')
  .exec()
  .then(doc => {
      if(doc.role === 'admin') {

        User.find({email: req.body.email})
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
                          password: req.body.password,
                          confirmPassword: req.body.confirmPassword,
                          email: req.body.email,
                          role: req.body.role
                        });
                        user
                        .save()
                        .then(result => {
                              console.log(result);
                              res.status(201).json({
                                  message: "The new user has been created",
                              });
                        })
                        .catch(err => {
                          console.log(err);
                          res.status(500).json({
                            error: err
                          });
                        });
                      }
                    });
                  }
              });
            }
              else {
                res.status(401).json({
                message: "you have no rights to create new users"
              })
            }
              });
});

router.patch("/avatar", upload.single('userPhoto'), checkAuth, async (req, res, next) => {
    await User.updateOne({ _id: req.userData.userId }, { $set: {"userPhoto": req.file.path} })
    .exec()
    .then(result => {
      res.status(200).json({
          message: 'Avatar is uploaded',
      });
    })
    .catch(err => {
      res.status(500).json({
        error: err
      });
    });
});

router.get("/:UserId",checkAuth, async (req, res, next) => {
  const id = req.params.UserId;
  await User.findById(id)
    .select('login fullName email userPhoto rating role isMailConfirmed _id')
    .exec()
    .then(doc => {
      if (doc) {
        res.status(200).json({
            user: doc,
            request: {
                type: 'GET',
                url: 'http://localhost:3000/users'
            }
        });
      } else {
        res
          .status(404)
          .json({ message: "No valid entry found for provided ID" });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err });
    });
});


router.patch("/:UserId",checkAuth, async (req, res, next) => {
  const id = req.params.UserId;
  await User.updateMany({_id: id}, {$set: req.body})
    .exec()
    .then(result => {
      res.status(200).json({
          message: 'User info updated',
          request: {
              type: 'GET',
              url: 'http://localhost:3000/users/' + id
          }
      });
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({
        error: err
      });
    });
});

router.delete("/:userId", checkAuth, async (req,res,next) => {
 await User.findById(req.userData.userId)
  .select('role')
  .exec()
  .then(doc => {
    if(doc.role === 'admin') {
      const id = req.params.userId;
      User.remove({ _id: id })
        .exec()
        .then(result => {
          res.status(200).json({
              message: 'User deleted'
          });
        })
        .catch(err => {
          console.log(err);
          res.status(500).json({
            error: err
          });
        });
      }
      else {
        res.status(401).json({
          message: "you have no rights to delete users"
        })
      }
  });
});


module.exports = router;