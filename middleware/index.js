const Restaurant = require("../models/restaurant"),
      Comment    = require("../models/comment");

// all middleware goes here
const middlewareObj = {};

middlewareObj.isLoggedIn = function(req, res, next) {
  if (req.isAuthenticated()) { return next(); }
  req.session.redirectTo = req.originalUrl;
  req.flash("error", "You need to be logged in first"); // add a one-time message before redirect
  res.redirect("/login");
};

middlewareObj.checkRestaurantOwenership = function(req, res, next) {
  if (req.isAuthenticated()) {
    Restaurant.findById(req.params.id, (err, foundRestaurant) => {
      if (err || !foundRestaurant) {
        req.flash("error", "Restaurant not found");
        res.redirect("back");
      } else {
        // does the user own the Restaurant
        if (foundRestaurant.author.id.equals(req.user._id) || req.user.isAdmin) { next(); }
        else {
          req.flash("error", "You don't have permission to do that");
          res.redirect("back");
        }
      }
    });
  }
  else {
    req.flash("error", "You need to be logged in to do that");
    res.redirect("/login");
  }
};

middlewareObj.checkCommentOwenership = function(req, res, next) {
  if (req.isAuthenticated()) {
    Comment.findById(req.params.comment_id, (err, foundComment) => {
      if (err || !foundComment) {
        req.flash("error", "Comment not found");
        res.redirect("back");
        
      } else {
        // does the user own the comment
        if (foundComment.author.id.equals(req.user._id) || req.user.isAdmin) { next(); }
        else {
          req.flash("error", "You don't have permission to do that");
          res.redirect("back");
        }
      }
    });
  }
  else {
    req.flash("error", "You need to be logged in first");
    res.redirect("/login");
  }
};
  
module.exports = middlewareObj;