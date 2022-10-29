const express = require('express');
const router = express.Router();
const mongoose = require("mongoose");
const Category = require("../models/category");
const Post = require("../models/post");
const User = require("../models/user");
const checkAuth = require("../middleware/check-auth")


router.post("/", checkAuth,  async (req,res,next) => {
  let isAdmin = false;
  await User.findById(req.userData.userId)
  .select('role')
  .exec()
  .then(async doc => {
      if(doc.role === 'admin') {
        await Category.find({title: req.body.title})
        .exec()
        .then(categor => {
            if(categor.length >= 1) {
                return res.status(409).json({
                    message: "Такая категорія вже існує"
                });
            }
            else {
                const category = new Category({
                    _id: new mongoose.Types.ObjectId(),
                    title: req.body.title,
                    description: req.body.description
                });
                category
                .save()
                .then(result => {
                    console.log(result);
                    res.status(201).json({
                    message: "Категорія була створена",
                    createdCategory: {
                        title: result.title,
                        description: result.description,
                        }
                      });
                    })
                .catch(err => {
                    res.status(500).json({
                        error: err
                    });
                });
            }
            
        })
      }
    });
});

router.get("/", async (req, res, next) => {
  const page = parseInt(req.query.page);
  const limit = parseInt(req.query.limit);
  const skipIndex = (page - 1) * limit;
    await Category.find()
    .select("title description _id")
    .limit(limit)
    .skip(skipIndex)
    .exec()
    .then(async docs => {
      const response = 
          docs.map(doc => {
              return {
                countCategories: docs.length,
                title: doc.title,
                description: doc.description,
                _id: doc._id,
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

router.get("/:categoryId/posts", async (req, res, next) => {
    const id = req.params.categoryId;
    await Category.findById(id)
      .select('title')
      .exec()
      .then(async doc => {
        if (doc) {
            let title = doc.title;
            await Post.find({ 'categories': title })
            .select("author title publishDate content _id")
            .exec()
            .then(docs => {
                const response = {
                    count: docs.length,
                    categories: docs.map(docP => {
                        return {
                            author: docP.author,
                            title: docP.title,
                            publishDate: docP.publishDate,
                            content: docP.content,
                            _id: docP._id
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

router.get("/:categoryId", async (req, res, next) => {
    const id = req.params.categoryId;
    await Category.findById(id)
      .select('title description _id')
      .exec()
      .then(doc => {
        if (doc) {
          res.status(200).json({
              category: doc,
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


router.patch("/:categoryId", checkAuth, async (req, res, next) => {
    const id = req.params.categoryId;
    await User.findById(req.userData.userId)
    .select('role')
    .exec()
    .then(doc => {
        if(doc.role === 'admin') {
            Category.updateMany({_id: id}, {$set: {
              title: req.body.title,
              description: req.body.description,
            }})
            .exec()
            .then(result => {
              res.status(200).json({
                  message: 'Категорія змінена',
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


router.delete("/:categoryId", checkAuth, async (req,res,next) => {
    await User.findById(req.userData.userId)
     .select('role')
     .exec()
     .then(doc => {
       if(doc.role === 'admin') {
         const id = req.params.categoryId;
         Category.remove({ _id: id })
           .exec()
           .then(result => {
             res.status(200).json({
                 message: 'Категорія видалена'
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

router.get("/search/:categorN", async (req,res,next) => {
  const categorN = req.params.categorN;
  let response = await Category.find(
      {
          "$or": [
              {"title":{$regex: categorN}},
              {"description":{$regex: categorN}}
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

