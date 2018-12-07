const express    = require("express"),
      router     = express.Router(),
      Restaurant = require("../models/restaurant"),
      middleware = require("../middleware"), // automatically looks for index.js
      NodeGeocoder = require("node-geocoder"),
      multer     = require('multer'),
      cloudinary = require('cloudinary');
      var options = {
        provider: 'google',
        httpAdapter: 'https',
        apiKey : 'AIzaSyDVYIBhNLih48SxKGguGNMC_GIMwHjMYKA',
        formatter:null
      }
      var geocoder = NodeGeocoder(options);

// =========== Image Upload Configuration =============
//multer config
const storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
const imageFilter = (req, file, cb) => {
    // accept image files only
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
const upload = multer({ storage: storage, fileFilter: imageFilter});

// cloudinary config
cloudinary.config({ 
  cloud_name: 'paramppatel', 
  api_key: 866195422747955, 
  api_secret: 'AHgupdmq8eHZ2DIKjj8og2DuGjw',
});

// ============= ROUTES ==============
// Define escapeRegex function to avoid regex DDoS attack
const escapeRegex = text => text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");

// INDEX -show all Restaurants
router.get("/", (req, res) => {
  let noMatch = null;
  if (req.query.search) {
    const regex = new RegExp(escapeRegex(req.query.search), 'gi');
    Restaurant.find({name: regex}, function(err, allRestaurants) {
      if (err) { console.log(err); }
      else {
        if (allRestaurants.length < 1) {
          noMatch = "No restaurant found, please try again.";
          
        }
        res.render("restaurants/index", { restaurants : allRestaurants, page: "restaurants", noMatch: noMatch });  
      }
    });
  } else {
    // Get all Restaurants from DB
    Restaurant.find({}, function(err, allRestaurants) {
      if (err) { console.log(err); }
      else {

        res.render("restaurants/index", { restaurants: allRestaurants, page: "restaurants", noMatch: noMatch });  
      }
    }); 
  }
});

// CREATE - add new Restaurants to DB
router.post("/", middleware.isLoggedIn, upload.single('image'), (req, res) => {
  // cloudinary
  cloudinary.uploader.upload(req.file.path, (result) => {
     // get data from the form
    let { name, image, description, author } = { 
      name: req.body.name,
      image: {
        // add cloudinary public_id for the image to the Restaurants object under image property
        id: result.public_id,
        // add cloudinary url for the image to the Restaurants object under image property
        url: result.secure_url
      },
      description: req.body.description,
      // get data from the currenly login user
      author: {
        id: req.user._id,
        username: req.user.username
      }
    };
  
    // geocoder for Google Maps
   
    geocoder.geocode(req.body.location, (err, data) => {
      if (err) throw err;
      let lat = data[0].latitude,
          lng = data[0].longitude,
          location = data[0].formattedAddress;
      let newRestaurant = { name, image, description, author, location, lat, lng,rating};
    
      // create a new Restaurants and save to DB
      Restaurant.create(newRestaurant, (err, newlyCreated) => {
        if (err) { console.log(err); }
        else {
          // redirect back to restaurants page
          res.redirect("/restaurants");
        }
      });
    });
  });
});

// NEW
router.get("/new", middleware.isLoggedIn, (req, res) => res.render("restaurants/new"));

// SHOW - shows more info about one Restaurants
router.get("/:id", (req, res) => {
  //find the restaurants with provided id in DB
  Restaurant.findById(req.params.id).populate("comments").exec((err, foundRestaurant) => {
    if (err || !foundRestaurant) {
      req.flash("error", "restaurant not found");
      res.redirect("back");
    } else {
      foundRestaurant.rating = restaurantRating(foundRestaurant);
      res.render("restaurants/show", { restaurants: foundRestaurant });
    }
  });
});

// edit restaurants route
// store original image id and url
let imageId, imageUrl;
router.get("/:id/edit", middleware.checkRestaurantOwenership, (req, res) => {
  Restaurant.findById(req.params.id, (err, foundRestaurant) => {
    imageId = foundRestaurant.image.id;
    imageUrl = foundRestaurant.image.url;
    if (err) { res.redirect("/restaurants") }
    else { res.render("restaurants/edit", { restaurants: foundRestaurant }); } 
  });
});

// update restaurants route
router.put("/:id", middleware.checkRestaurantOwenership, upload.single('image'), (req, res) => {
  // if no new image to upload
  if (!req.file) {
    let { name, image, description, author } = { 
      name: req.body.restaurants.name,
      image: {
        // add cloudinary public_id for the image to the restaurants object under image property
        id: imageId,
        // add cloudinary url for the image to the restaurants object under image property
        url: imageUrl
      },
      description: req.body.restaurants.description,
      // get data from the currenly login user
      author: {
        id: req.user._id,
        username: req.user.username
      }
    };
    geocoder.geocode(req.body.restaurants.location, (err, data) => {
      if (err) throw err;
      let lat = data[0].latitude,
          lng = data[0].longitude,
          location = data[0].formattedAddress;
      let newData = { name, image, description, author, location, lat, lng, rating };
      
      //find and update the correct restaurants
      Restaurant.findByIdAndUpdate(req.params.id, {$set: newData}, (err, updatedRestaurants) => {
        if (err) {
          req.flash("error", err.message);
          res.redirect("/restaurants");
        } else {
          //redirect somewhere(show page)
          req.flash("success","Restaurants Updated!");
          res.redirect("/restaurants/" + req.params.id);
        }
      });
    });
  } else {
    // cloudinary
    cloudinary.uploader.upload(req.file.path, (result) => {
      let { name, image, description, author } = { 
        name: req.body.restaurants.name,
        image: {
          // add cloudinary public_id for the image to the restaurants object under image property
          id: result.public_id,
          // add cloudinary url for the image to the restaurants object under image property
          url: result.secure_url
        },
        description: req.body.restaurants.description,
        // get data from the currenly login user
        author: {
          id: req.user._id,
          username: req.user.username
        }
      };
      
      // remove original/old restaurants image on cloudinary
      cloudinary.uploader.destroy(imageId, (result) => { console.log(result) });
      
      geocoder.geocode(req.body.restaurants.location, (err, data) => {
        if (err) throw err;
        let lat = data[0].latitude,
            lng = data[0].longitude,
            location = data[0].formattedAddress;
        let newData = { name, image, description, author, location, lat, lng };
        
        //find and update the correct restaurants
        Restaurant.findByIdAndUpdate(req.params.id, {$set: newData}, (err, updatedRestaurants) => {
          if (err) {
            req.flash("error", err.message);
            res.redirect("/restaurants");
          } else {
            //redirect somewhere(show page)
            req.flash("success","restaurants Updated!");
            res.redirect("/restaurants/" + req.params.id);
          }
        });
      });
    });
  }
});

// destroy restaurants route
router.delete("/:id", middleware.checkRestaurantOwenership, (req, res) => {
  Restaurant.findByIdAndRemove(req.params.id, err => {
    if (err) { res.redirect("/restaurants"); }
    else {
      req.flash("success", "restaurants removed!");
      res.redirect("/restaurants"); }
  });
});

var restaurantRating = function(restaurants)
{
  var netRating = [];
  restaurants.comments.forEach(comment=>
  netRating.push(comment.rating));
  var rating = 0;
  netRating.forEach(crat =>
  rating = rating +crat);
  rating = rating/netRating.length;
  if(rating>=1 && rating<=1.5){return 1;}
  else if(rating<=2 && rating>1.5){return 2;}
  else if(rating<=3&& rating>2){return 3;}
  else if(rating<=4 && rating>3) {return 4;}
  else if(rating<=5 && rating>4) {return 5;}
  
}
module.exports = router;
