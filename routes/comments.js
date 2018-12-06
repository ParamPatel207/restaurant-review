const express    = require("express"),
      router     = express.Router({ mergeParams: true }),
      Restaurant = require("../models/restaurant"),
      Comment    = require("../models/comment"),
      middleware = require("../middleware");

// comments Create
router.post("/", middleware.isLoggedIn, (req, res) => {
  //lookup restaurant using id
  Restaurant.findById(req.params.id, (err, restaurant) => {
    if (err) { 
      console.log(err);
      res.redirect("/restaurants");
    }
    else {
      //create new comment
      Comment.create(req.body.comment, (err, comment) => {
        if (err) {
          req.flash("error", "Something went wrong.");
          console.log(err);
        } else {
          console.log(comment);
          //add username and id to comments
          comment.author.id = req.user._id;
          comment.author.username = req.user.username;
          console.log(comment.rating);
          //save comment
          comment.save();
          //connect new comment to restaurant
          restaurant.comments.push(comment);
          restaurant.save();
          //redirect to restaurant show page
          req.flash("success", "Successfully added comment");
          res.redirect("/restaurants/" + restaurant._id);
        }
      });
    }
  });
});

// commnet Update
router.put("/:comment_id", middleware.checkCommentOwenership, (req, res) => {
  Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, (err, updatedComment) => {
    if (err) { res.redirect("back"); }
    else { res.redirect("/restaurants/" + req.params.id); }
  });
});

// comment Destroy
router.delete("/:comment_id", middleware.checkCommentOwenership, (req, res) => {
  //findByIdAndRemove
  Comment.findByIdAndRemove(req.params.comment_id, err => {
    if (err) { res.redirect("back"); }
    else {
      req.flash("success", "Comment deleted");
      res.redirect("/restaurants/" + req.params.id);
    }
  });
});

module.exports = router;
