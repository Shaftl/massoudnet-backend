const express = require("express");
const router = express.Router();
const { searchUsersAndPosts } = require("../controllers/searchController");
const authMiddleware = require("../middleware/authMiddleware");

router.get("/", authMiddleware, searchUsersAndPosts);

module.exports = router;
