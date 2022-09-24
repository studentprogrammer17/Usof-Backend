const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const Category = require("../models/category");
const Post = require("../models/post");
const User = require("../models/user");
const Like = require("../models/like");
const Comment = require("../models/comment");
const checkAuth = require("../middleware/check-auth")

router.get("/:commentId", async (req, res, next) => {
    const id = req.params.commentId;
    await Comment.findById(id)
      .select('author content publishDate post_id _id"')
      .exec()
      .then(doc => {
        if (doc) {
          res.status(200).json({
              comment: doc,
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


router.get("/:commentId/like", async (req,res,next) => {
    const id = req.params.commentId;
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
                comment_id: id,
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


router.post("/:commentId/like", checkAuth, async (req,res,next) => {
    const id = req.params.commentId;
    const authorId = req.userData.userId;
    const type = req.body.type;
    await Comment.find({"_id": id})
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
                    comment_id: result._id,
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


router.patch("/:commentId", checkAuth, async (req, res, next) => {
    const id = req.params.commentId;
    await Comment.findById(id)
    .select("author")
    .exec()
    .then(doc => {
        if(req.userData.userId === doc.author.toString()) {
            Comment.updateMany({_id: id}, {$set: req.body})
            .exec()
            .then(result => {
              res.status(200).json({
                  message: 'Comment is edited',
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


router.delete("/:commentId", checkAuth, async (req,res,next) => {
    let isAuthorOfPost = false;
    const id = req.params.commentId;
    await Comment.findById(id)
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
         Comment.remove({ _id: id })
           .exec()
           .then(result => {
             res.status(200).json({
                 message: 'Comment deleted'
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



router.delete("/:commentId/like", checkAuth, async (req,res,next) => {
    let isAuthorOfPost = false;
    const id = req.params.commentId;
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

