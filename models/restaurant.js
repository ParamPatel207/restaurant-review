const mongoose = require("mongoose");

// Schema Setup
const RestaurantSchema = new mongoose.Schema({
  name: String,
  image: {
    id: String,
    url: String
  },
  description: String,
  location: String,
  lat: Number,
  lng: Number,
  rating: Number,
  createdAt: { type: Date, default: Date.now },
  author: {
    id: {
      type: String(mongoose.Schema.Types.ObjectId),
      ref: "User"
    },
    username: String
  },
  comments: [
    {
      type: String(mongoose.Schema.Types.ObjectId),
      ref: "Comment"
    }
  ]
});

module.exports = mongoose.model("Restaurant", RestaurantSchema);
