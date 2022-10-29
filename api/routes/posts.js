const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const multer = require("multer");
const Category = require("../models/category");
const Post = require("../models/post");
const User = require("../models/user");
const Like = require("../models/like");
const Dislike = require("../models/dislike");
const Comment = require("../models/comment");
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

 async function checkLikes(id, res) {
    let countLikes = 0;
    await Like.find({"post_id": id})
    .select("type")
    .exec()
    .then(async docs => {
        if(docs) {
            let tempDocs = docs;
            tempDocs.map(docType => {
                if(docType.type === "Like") countLikes++;
            });
        }
    })
    return countLikes
}
  

router.get("/", async (req,res,next) => {
    // pagination
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skipIndex = (page - 1) * limit;

    let sort = req.query.sort || "likes";

    let toFilterCatergories = req.query.categories || 'All';


    toFilterCatergories !== 'All' ? 
    await Post.find()
    .select("author title publishDate content categories postPhoto status _id")
    .limit(limit)
    .skip(skipIndex)
    .sort(sort)
    .where('categories')
    .in(toFilterCatergories)
    .exec()
    .then(async docs => {
        const response = 
            docs.map(doc => {
                return {
                    countPosts: docs.length,
                    status: docs.status,
                    author: doc.author,
                    title: doc.title,
                    content: doc.content,
                    publishDate: doc.publishDate,
                    categories: doc.categories,
                    status: doc.status,
                    postPhoto: doc.postPhoto,
                    likes: checkLikes(doc._id),
                    _id: doc._id
                };
            })
        res.status(200).json(response);
    })
    .catch(err => {
        res.status(500).json({
            error: err
        });
    })
    :
    await Post.find()
    .select("author title publishDate content categories postPhoto status _id")
    .limit(limit)
    .skip(skipIndex)
    .sort(sort)
    .exec()
    .then(async docs => {
        const response = 
            docs.map(doc => {
                return {
                    countPosts: docs.length,
                    status: docs.status,
                    author: doc.author,
                    title: doc.title,
                    content: doc.content,
                    publishDate: doc.publishDate,
                    categories: doc.categories,
                    status: doc.status,
                    postPhoto: doc.postPhoto,
                    likes: checkLikes(doc._id),
                    _id: doc._id
                };
            })
        res.status(200).json(response);
    })
    .catch(err => {
        res.status(500).json({
            error: err
        });
    });
});

router.post("/", checkAuth,  async (req,res,next) => {
    let userLogin;
    await User.findById(req.userData.userId)
     .select('login')
     .exec()
     .then(doc => {
        userLogin = doc.login;
     });
    await Category.find({title: req.body.categories})
    .exec()
    .then(categor => {
        if(req.body.title.length >= 45 || req.body.title.length < 4) {
            return res.status(409).json({
                message: "Заголовок має бути не менше 4 символів і не більше 45"
            });
        }
        if(req.body.content >= 300 || req.body.content < 10) {
            return res.status(409).json({
                message: "Опис має бути не менше 10 символів і не більше 300"
            });
        }
        if(categor.length >= 1) {
            const post = new Post({
                _id: new mongoose.Types.ObjectId(),
                author: userLogin,
                title: req.body.title,
                content: req.body.content,
                categories: req.body.categories,
            });
            post
            .save()
            .then(result => {
                console.log(result);
                res.status(201).json({
                message: "Пост було створено!",
                createdCategory: {
                    title: result.title,
                    categories: result.categories,
                    author: result.author,
                    content: result.content,
                    publishDate: result.publishDate,
                    id: result._id,
                    }
                  });
                })
            .catch(err => {
                res.status(500).json({
                    error: err
                });
            });
        }
        else {
            return res.status(409).json({
                message: "Такої категорії не існує!"
            });
        }
    });
});



router.get("/:userLogin/posts", async(req,res,next) => {
    const page = parseInt(req.query.page);
    const limit = parseInt(req.query.limit);
    const skipIndex = (page - 1) * limit;

    const userLogin = req.params.userLogin;
    let sort = req.query.sort || "publishDate";
    await Post.find({"author": userLogin})
    .select('author title publishDate status content categories postPhoto _id"')
    .limit(limit)
    .skip(skipIndex)
    .sort(sort)
    .exec()
    .then(async doc => {
        if (doc) {
            const response = 
            doc.map(doc1 => {
                
                
                return {
                    countPosts: doc.length,
                    author: doc1.author,
                    title: doc1.title,
                    content: doc1.content,
                    publishDate: doc1.publishDate,
                    categories: doc1.categories,
                    postPhoto: doc1.postPhoto,
                    status: doc1.status,
                    _id: doc1._id
                };
            })
        res.status(200).json(response);
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


router.get("/:postId", async (req, res, next) => {
    const id = req.params.postId;
    let sort = req.query.sort || "publishDate";
    await Post.find({"_id":id})
      .select('author title publishDate status content categories postPhoto _id"')
      .sort(sort)
      .exec()
      .then(async doc => {
        if (doc) {
            const response = 
            doc.map(doc1 => {
                return {
                    author: doc1.author,
                    title: doc1.title,
                    content: doc1.content,
                    publishDate: doc1.publishDate,
                    categories: doc1.categories,
                    postPhoto: doc1.postPhoto,
                    status: doc1.status,
                    likes: checkLikes(doc1._id),
                    _id: doc1._id
                };
            })
        res.status(200).json(response);
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

router.get("/:postId/comments", async (req,res,next) => {
    const id = req.params.postId;
    let sort = req.query.sort || "publishDate";
    await Comment.find({"post_id": id})
    .select("content publishDate author userPhoto edited")
    .sort(sort)
    .exec()
    .then(docs => {
        if(docs) {
            const response = 
                docs.map(doc => {
                    return {
                        content: doc.content,
                        author: doc.author,
                        publishDate: doc.publishDate,
                        userPhoto: doc.userPhoto,
                        id: doc._id,
                        edited: doc.edited
                    };
                })
            
            res.status(200).json(response);
        }
        else {
            res.status(404).json({ message: "No valid entry found for provided ID" });
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
});

router.post("/:postId/comments", checkAuth, async (req,res,next) => {
    const id = req.params.postId;
    const authorId = req.userData.userId;
    await Post.find({"post_id": id})
    .exec()
    .then(async docs => {
        if(docs) {
            await User.findById(authorId)
            .select('login userPhoto')
            .exec()
            .then(doc => {
               userLogin = doc.login;
               userPhoto = doc.userPhoto
            });
            console.log(userPhoto)
            const comment = new Comment({
                _id: new mongoose.Types.ObjectId(),
                author: userLogin,
                post_id: id,
                content: req.body.content,
                userPhoto: userPhoto,
                edited: false
            });
            comment
            .save()
            .then(result => {
                res.status(201).json({
                message: "Коментар створено",
                createdCategory: {
                    publishDate: result.publishDate,
                    comment: req.body.content,
                    }
                  });
                })
            .catch(err => {
                res.status(500).json({
                    error: err
                });
            });
        }
        else {
            res.status(404).json({ message: "No valid entry found for provided ID" });
        }
    })
    .catch(err => {
        res.status(500).json({
            error: err
        });
    });
});

router.get("/:postId/categories", async (req,res,next) => {
    const id = req.params.postId;
    await Post.find({"_id": id})
    .select("categories")
    .exec()
    .then(async docs => {
        if(docs) {
            const response = {
                count: docs.length,
                post_id: id,
                products: docs.map(doc => {
                    return {
                        categories: doc.categories
                    };
                })
            };
            res.status(200).json(response);
        }
        else {
            res.status(404).json({ message: "No valid entry found for provided ID" });
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
});


router.post("/getLikes", (req, res) => {

    let variable = {}
    if (req.body.postId) {
        variable = { postId: req.body.postId }
    } else {
        variable = { commentId: req.body.commentId }
    }

    Like.find(variable)
        .exec((err, likes) => {
            if (err) return res.status(400).send(err);
            res.status(200).json({ success: true, likes })
    })


})


router.post("/getDislikes", (req, res) => {
    let variable = {}
    if (req.body.postId) {
        variable = { postId: req.body.postId }
    } else {
        variable = { commentId: req.body.commentId }
    }

    Dislike.find(variable)
        .exec((err, dislikes) => {
            if (err) return res.status(400).send(err);
            res.status(200).json({ success: true, dislikes })
    })
})


router.post("/upLike", async (req, res) => {

    let variable = {}
    if (req.body.postId) {
        variable = { postId: req.body.postId}
    } else {
        variable = { commentId: req.body.commentId}
    }

    let isLiked = false;
    Like.find(variable)
    .select("userLogin")
    .exec()
    .then(async docs => {
        docs.map(doc => {
            if(doc.userLogin === req.body.userId) {
                isLiked = true;
                Like.findOneAndDelete(variable)
                .exec((err, result) => {
                   return 1;
                })
            }
            })
            if(isLiked === false) {
                let like;
                req.body.postId ? 
                (like = new Like({
                    _id: new mongoose.Types.ObjectId(),
                    userLogin: req.body.userId,
                    postId: req.body.postId,
                }))
                :
                (like = new Like({
                    _id: new mongoose.Types.ObjectId(),
                    userLogin: req.body.userId,
                    commentId: req.body.commentId,
                }))
            
                like.save((err, likeResult) => {
                    if (err) return res.json({ success: false, err });
                    Dislike.findOneAndDelete(variable)
                        .exec((err, disLikeResult) => {
                            if (err) return res.status(400).json({ success: false, err });
                            res.status(200).json({ success: true })
                        })
                })
            }
        
    })
})




router.post("/unLike", (req, res) => {

    let variable = {}
    if (req.body.postId) {
        variable = { postId: req.body.postId, userId: req.body.userId }
    } else {
        variable = { commentId: req.body.commentId , userId: req.body.userId }
    }

    Like.findOneAndDelete(variable)
        .exec((err, result) => {
            if (err) return res.status(400).json({ success: false, err })
            res.status(200).json({ success: true })
    })

})


router.post("/unDisLike", (req, res) => {

    let variable = {}
    if (req.body.postId) {
        variable = { postId: req.body.postId, userId: req.body.userId }
    } else {
        variable = { commentId: req.body.commentId , userId: req.body.userId }
    }

    Dislike.findOneAndDelete(variable)
    .exec((err, result) => {
        if (err) return res.status(400).json({ success: false, err })
        res.status(200).json({ success: true })
    })


})



router.post("/upDisLike", async (req, res) => {

    let variable = {}
    if (req.body.postId) {
        variable = { postId: req.body.postId, userId: req.body.userId }
    } else {
        variable = { commentId: req.body.commentId , userId: req.body.userId }
    }

    let isLiked = false;
    Dislike.find(variable)
    .select("userLogin")
    .exec()
    .then(async docs => {
        docs.map(doc => {
            if(doc.userLogin === req.body.userId) {
                isLiked = true;
                Dislike.findOneAndDelete(variable)
                .exec((err, result) => {
                   return 1;
                })
            }
            })
            if(isLiked === false) {
                let like;
                req.body.postId ? 
                (like = new Dislike({
                    _id: new mongoose.Types.ObjectId(),
                    userLogin: req.body.userId,
                    postId: req.body.postId,
                }))
                :
                (like = new Dislike({
                    _id: new mongoose.Types.ObjectId(),
                    userLogin: req.body.userId,
                    commentId: req.body.commentId,
                }))
            
                like.save((err, likeResult) => {
                    if (err) return res.json({ success: false, err });
                    Like.findOneAndDelete(variable)
                        .exec((err, disLikeResult) => {
                            if (err) return res.status(400).json({ success: false, err });
                            res.status(200).json({ success: true })
                        })
                })
            }
        
    })

})





router.patch("/postPhoto/:postId", upload.single('postPhoto'), checkAuth, async (req, res, next) => {
    const id = req.params.postId;
    await Post.updateOne({ _id: id }, { $set: {"postPhoto": req.file.path} })
    .exec()
    .then(result => {
      res.status(200).json({
          message: 'Фото посту створено!',
      });
    })
    .catch(err => {
      res.status(500).json({
        error: err
      });
    });
  });


router.patch("/:postId", checkAuth, async (req, res, next) => {
    const id = req.params.postId;
    await User.findById(req.userData.userId)
    .select('login role')
    .exec()
    .then(doc => {
       userLogin = doc.login;
       userRole = doc.role;
    });
    await Post.findById(id)
    .select("author")
    .exec()
    .then(doc => {
        if((userLogin === doc.author.toString()) || userRole === "admin") {
            Post.updateMany({_id: id}, {$set: {
                title: req.body.title,
                content: req.body.content,
                categories: req.body.categories,
                publishDate: Date()
            }})
            .exec()
            .then(result => {
              res.status(200).json({
                  message: 'Пост змінено',
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
                message: "you have no rights to change not your posts"
            })
        }
    });
});


router.patch("/:postId/inactive", checkAuth, async (req, res, next) => {
    const id = req.params.postId;
    await User.findById(req.userData.userId)
    .select('login role')
    .exec()
    .then(doc => {
       userLogin = doc.login;
       userRole = doc.role;
    });
    await Post.findById(id)
    .select("author")
    .exec()
    .then(doc => {
        if((userLogin === doc.author.toString()) || userRole === "admin") {
            Post.updateOne({_id: id}, {$set: {
                status: 'Inactive',
            }})
            .exec()
            .then(result => {
              res.status(200).json({
                  message: 'Пост неактивний!',
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
                message: "Нема прав це зробити"
            })
        }
    });
});

router.patch("/:postId/active", checkAuth, async (req, res, next) => {
    const id = req.params.postId;
    await User.findById(req.userData.userId)
    .select('login role')
    .exec()
    .then(doc => {
       userLogin = doc.login;
       userRole = doc.role;
    });
    await Post.findById(id)
    .select("author")
    .exec()
    .then(doc => {
        if((userLogin === doc.author.toString()) || userRole === "admin") {
            Post.updateOne({_id: id}, {$set: {
                status: 'Active',
            }})
            .exec()
            .then(result => {
              res.status(200).json({
                  message: 'Пост активний!',
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
                message: "Нема прав це зробити"
            })
        }
    });
});




router.delete("/:postId", checkAuth, async (req,res,next) => {
    let isAuthorOfPost = false;
    const id = req.params.postId;

    await User.findById(req.userData.userId)
    .select('login role')
    .exec()
    .then(doc => {
       userLogin = doc.login;
       userRole = doc.role;
    });

    await Post.findById(id)
    .select("author")
    .exec()
    .then(doc => {
        if((doc.author.toString() === userLogin) || userRole === 'admin') {
            isAuthorOfPost = true;
        }
    });
    await User.findById(req.userData.userId)
     .select('role')
     .exec()
     .then(doc => {
       if(doc.role === 'admin' || isAuthorOfPost === true) {
         Post.remove({ _id: id })
           .exec()
           .then(result => {
             res.status(200).json({
                 message: 'Пост видалено!'
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
             message: "you have no rights to delete post"
           })
         }
     });
});



router.get("/search/:PostN", async (req,res,next) => {
    let sort = req.query.sort || "publishDate";
    const PostN = req.params.PostN;
    console.log(PostN)
    let response = await Post.find(
        {
            "$or": [
                {"title":{$regex: PostN}},
                {"categories":{$regex: PostN}},
                {"author":{$regex: PostN}},
                {"content":{$regex: PostN}}
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


module.exports = router;

