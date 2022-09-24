const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const Category = require("../models/category");
const Post = require("../models/post");
const User = require("../models/user");
const Like = require("../models/like");
const Comment = require("../models/comment");
const checkAuth = require("../middleware/check-auth")

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

router.get("/", checkAuth, async (req,res,next) => {
    // pagination
    const pageNumber = parseInt(req.query.pageNumber) || 0;
    const limit = parseInt(req.query.limit) || 12;
    const result = {};
    let totalPosts = 0;
    await Post.find()
    .exec()
    .then(async docs => {
        const response = {
            count: docs.length,
        }
        totalPosts = response.count;
    });
    let startIndex = pageNumber * limit;
    const endIndex = (pageNumber + 1) * limit;
    result.totalPosts = totalPosts;
    if (startIndex > 0) {
      result.previous = {
        pageNumber: pageNumber - 1,
        limit: limit,
      };
    }

    if (endIndex < totalPosts) {
      result.next = {
        pageNumber: pageNumber + 1,
        limit: limit,
      };
    }

    let sort = req.query.sort || "likes";

    let toFilterCatergories = req.query.categories;
    let toFilterDate = req.query.publishDate;
    let toFilterStatus = req.query.status;


    await Post.find()
    .select("author title publishDate content categories _id")
    .skip(startIndex)
    .limit(limit)
    .sort(sort)
    .where("categories")
    .in(toFilterCatergories)
    .where("publishDate")
    .in(toFilterDate)
    .where("status")
    .in(toFilterStatus)
    .exec()
    .then(async docs => {
        const response = {
            count: docs.length,
            posts: docs.map(doc => {
                return {
                    author: doc.author,
                    title: doc.title,
                    content: doc.content,
                    publishDate: doc.publishDate,
                    categories: doc.categories,
                    status: doc.status,
                    likes: checkLikes(doc._id),
                    _id: doc._id
                };
            })
        };
        res.status(200).json(response);
    })
    .catch(err => {
        res.status(500).json({
            error: err
        });
    });
});

router.post("/", checkAuth,  async (req,res,next) => {
    await Category.find({title: req.body.categories})
    .exec()
    .then(categor => {
        if(categor.length >= 1) {
            const post = new Post({
                _id: new mongoose.Types.ObjectId(),
                author: req.userData.userId,
                title: req.body.title,
                content: req.body.content,
                categories: req.body.categories,
            });
            post
            .save()
            .then(result => {
                console.log(result);
                res.status(201).json({
                message: "The post has been created",
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
                message: "Such category does not exist"
            });
        }
    });
});


router.get("/:postId", async (req, res, next) => {
    const id = req.params.postId;
    await Post.findById(id)
      .select('author title publishDate status content categories _id"')
      .exec()
      .then(doc => {
        if (doc) {
          res.status(200).json({
              post: doc,
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

router.get("/:postId/comments", async (req,res,next) => {
    const id = req.params.postId;
    await Comment.find({"post_id": id})
    .select("content publishDate")
    .exec()
    .then(async docs => {
        if(docs) {
            const response = {
                count: docs.length,
                post_id: id,
                comments: docs.map(doc => {
                    return {
                        content: doc.content,
                        author: doc.author,
                        publishDate: doc.publishDate,
                        id: doc._id
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

router.post("/:postId/comments", checkAuth, async (req,res,next) => {
    const id = req.params.postId;
    const authorId = req.userData.userId;
    await Post.find({"post_id": id})
    .exec()
    .then(docs => {
        if(docs) {
            const comment = new Comment({
                _id: new mongoose.Types.ObjectId(),
                author: authorId,
                post_id: id,
                content: req.body.content

            });
            comment
            .save()
            .then(result => {
                res.status(201).json({
                message: "The comment has been created",
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


router.get("/:postId/like", async (req,res,next) => {
    const id = req.params.postId;
    let countLikes = 0;
    let countDislikes = 0;
    await Like.find({"post_id": id})
    .select("type")
    .exec()
    .then(async docs => {
        if(docs) {
            let tempDocs = docs;
            tempDocs.map(docType => {
                console.log(docType.type);
                if(docType.type === "Like") countLikes++;
                if(docType.type === "Dislike") countDislikes++;
            });

            const response = {
                post_id: id,
                likes: {
                    Likes: countLikes,
                    Dislikes: countDislikes
                }
                
            };
            res.status(200).json(response);    
            
        }
        else {
            res.status(404).json({ message: "not found id" });
        }
    })
    .catch(err => {
        console.log(err);
        res.status(500).json({
            error: err
        });
    });
});

router.post("/:postId/like", checkAuth, async (req,res,next) => {
    const id = req.params.postId;
    const authorId = req.userData.userId;
    const type = req.body.type;
    await Post.find({"post_id": id})
    .exec()
    .then(docs => {
        if(docs) {
            const like = new Like({
                _id: new mongoose.Types.ObjectId(),
                author: authorId,
                post_id: id,
                type: type
            });
            like
            .save()
            .then(result => {
                res.status(201).json({
                message: `You set the ${type}`,
                createdCategory: {
                    post_id: result.post_id,
                    publishDate: result.publishDate,
                    type: req.body.type,
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


router.patch("/:postId", checkAuth, async (req, res, next) => {
    const id = req.params.postId;
    await Post.findById(id)
    .select("author")
    .exec()
    .then(doc => {
        if(req.userData.userId === doc.author.toString()) {
            Post.updateMany({_id: id}, {$set: req.body})
            .exec()
            .then(result => {
              res.status(200).json({
                  message: 'Post is edited',
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


router.delete("/:postId", checkAuth, async (req,res,next) => {
    let isAuthorOfPost = false;
    const id = req.params.postId;
    await Post.findById(id)
    .select("author")
    .exec()
    .then(doc => {
        if(req.userData.userId === doc.author.toString()) {
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
                 message: 'Post deleted'
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

router.delete("/:postId/like", checkAuth, async (req,res,next) => {
    let isAuthorOfPost = false;
    const id = req.params.postId;
    await Like.find({"post_id": id})
    .select("author")
    .exec()
    .then(doc => {
        if(req.userData.userId === doc.author) {
            isAuthorOfPost = true;
        }
    });
    await User.findById(req.userData.userId)
     .select('role')
     .exec()
     .then(doc => {
       if(doc.role === 'admin' || isAuthorOfPost === true) {
         Like.remove({ _id: id })
           .exec()
           .then(result => {
             res.status(200).json({
                 message: 'Like deleted'
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

module.exports = router;

