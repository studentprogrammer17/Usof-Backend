const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const bcrypt = require("bcrypt");
const User = require("../models/user");
const Post = require("../models/post");
const Like = require("../models/like");
const Dislike = require("../models/dislike");
const checkAuth = require("../middleware/check-auth")


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

router.get("/", checkAuth, async (req, res, next) => {
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);
  const skipIndex = (page - 1) * limit;
    await User.find()
        .select("_id login email fullName userPhoto rating role")
        .limit(limit)
        .skip(skipIndex)
        .exec()
        .then(docs => {
            const response = 
                docs.map(doc => {
                    return {
                        countUsers: docs.length,
                        _id: doc._id,
                        login: doc.login,
                        email: doc.email,
                        userPhoto: doc.userPhoto,
                        fullName: doc.fullName,
                        role: doc.role,
                        request: {
                            type: "GET",
                            url: "http://localhost:3000/users/" + doc._id
                        }
                    };
                })
            
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
                    message: "Емейл вже існує"
                });
            }
            else {
                User.find({login: req.body.login})
                .exec()
                .then(user => {
                    if(user.length >= 1) {
                        return res.status(409).json({
                            message: "Логін вже існує"
                        });
                    }
                    if(req.body.login.length < 4 || req.body.login.length > 20) {
                      return res.status(409).json({
                          message: "Логін має бути більш ні 4 символа та менш ніж 20"
                      });
                    }
                    if(req.body.fullName.length < 4 || req.body.fullName.length > 20) {
                      return res.status(409).json({
                          message: "Ім'я має бути більш ні 4 символа та менш ніж 20"
                      });
                    }
                    if(!req.body.password.match(/(?=.*[a-z])(?=.*[A-Z])(?=.*[0-9])(?=.{6,})/)) {
                      return res.status(409).json({
                          message: "У паролі має бути як мінімум: 6 сімволів, одна цифра, маленькая та велика літера"
                      });
                    }
                    else {
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
                          password: password,
                          confirmPassword: confirmPassword,
                          email: req.body.email,
                          role: req.body.role,
                          fullName: req.body.fullName,
                          isMailConfirmed: true
                        });
                        user
                        .save()
                        .then(result => {
                              console.log(result);
                              res.status(201).json({
                                  message: "Нового юзера було створено",
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
          message: 'Аватар завантажено',
      });
    })
    .catch(err => {
      res.status(500).json({
        error: err
      });
    });
});

router.patch("/avatar/:UserId", upload.single('userPhoto'), checkAuth, async (req, res, next) => {
  console.log("PROVERKAAAAA")
  const id = req.params.UserId;
  console.log(req.file.path)
  await User.updateOne({ _id: id }, { $set: {"userPhoto": req.file.path} })
  .exec()
  .then(result => {
    res.status(200).json({
        message: 'Аватар завантажено',
    });
  })
  .catch(err => {
    console.log("====================")
    console.log(err)
    console.log("====================")
    res.status(500).json({
      error: err
    });
  });
});

router.get("/:UserId", async (req, res, next) => {
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

router.get("/login/:userLogin", async (req, res, next) => {
  const userLogin = req.params.userLogin;
  await User.find({"login": userLogin})
    .select('login fullName email userPhoto rating role isMailConfirmed _id')
    .exec()
    .then(doc => {
      if (doc) {
        res.status(200).json(
            doc
        );
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
  await User.findById(req.userData.userId)
  .select('role')
  .exec()
  .then(async doc => {
    if(doc.role === 'admin' || String(req.params.UserId) === String(req.userData.userId)) {
  const id = req.params.UserId;
  await User.find({email: req.body.email})
  .exec()
  .then(user => {
      if(user.length >= 1) {
          return res.status(409).json({
              message: "Такий емейл вже існує"
          });
      }
    });
    await User.find({login: req.body.login})
      .exec()
      .then(user => {
          if(user.length >= 1) {
              return res.status(409).json({
                  message: "Такий логін вже існує"
              });
          }
        });
               
      await User.updateMany({_id: id}, {$set: req.body})
      .exec()
      .then(result => {
        res.status(200).json({
            message: 'Дані поновлені',
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
    }
  })      
});

router.delete("/:userId", checkAuth, async (req,res,next) => {
 await User.findById(req.userData.userId)
  .select('role')
  .exec()
  .then(doc => {
    if(doc.role === 'admin' || String(req.params.userId) === String(req.userData.userId)) {
      const id = req.params.userId;
      User.remove({ _id: id })
        .exec()
        .then(result => {
          res.status(200).json({
              message: 'Користувач видален'
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

router.get("/search/:UserN", async (req,res,next) => {
  const UserN = req.params.UserN;
  let response = await User.find(
      {
          "$or": [
              {"login":{$regex: UserN}},
              {"fullName":{$regex: UserN}},
              {"role":{$regex: UserN}},
              {"userPhoto":{$regex: UserN}}
          ]
      }
  )
  .exec()
  .then()
  .catch(message => {
    console.log(message)
    res.status(500).json({
      message: "Not found"
    });
  });
  res.status(200).json(response);
});



router.get("/:userLogin/getLikes", async(req,res,next) => {
  function getAllLikes(variable) {
      Like.find(variable)
      .exec((err, likes) => {
          if (err) return res.status(400).send(err);
          return likes.length;
      })
  }

  const userLogin = req.params.userLogin;
  
  await Post.find({"author": userLogin})
  .select('author title publishDate status content categories postPhoto _id')
  .exec()
  .then(async doc => {
      let totalLikes = 0;
      let totalDislikes = 0;
      let rating = 0;
      let i = 0;
      const PostsId = [];
      if (doc) {
          doc.map(doc1 => {
              PostsId[i] = doc1._id
              i++;
          })
          for(let j = 0; j < PostsId.length; j++) {
           await Like.find({"userLogin": userLogin, postId: PostsId[j]})
            .select('userLogin')
            .exec()
            .then(async doc => {
              doc.map(async doc2 => {
                totalLikes += doc.length
              })
            })
          }

          for(let j = 0; j < PostsId.length; j++) {
            await Dislike.find({"userLogin": userLogin, postId: PostsId[j]})
             .select('userLogin')
             .exec()
             .then(async doc => {
               doc.map(async doc2 => {
                 totalDislikes += doc.length
               })
             })
           }
           rating = totalLikes - totalDislikes;
          const response = {
            likes: totalLikes,
            dislikes: totalDislikes,
            rating: rating,
          }

          let a = []
          a.push(response);
          
          res.status(200).json(a);
      } 
      else {
        res
          .status(404)
          .json({ message: "No valid entry found for provided ID" });
      }
    })
    .catch(err => {
      console.log(err);
      res.status(500).json({ error: err });
    });

})


module.exports = router;