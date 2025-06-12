const User = require("../models/User");
const Post = require("../models/Post");

const searchUsersAndPosts = async (req, res) => {
  try {
    const query = req.query.q;
    const currentUserId = req.userId; // ← use userId from middleware

    if (!query) return res.status(400).json({ error: "Search query required" });

    // 1. Load current user's friends list
    const currentUser = await User.findById(currentUserId)
      .select("friends")
      .lean();
    const friendsIds = (currentUser?.friends || []).map((id) => id.toString());

    // 2. Search Users (as before)
    const users = await User.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { email: { $regex: query, $options: "i" } },
        { bio: { $regex: query, $options: "i" } },
        { location: { $regex: query, $options: "i" } },
      ],
    }).select("name profilePic bio location");

    // 3. Search all matching posts
    const allPosts = await Post.find({
      text: { $regex: query, $options: "i" },
    })
      .populate("author", "name profilePic friends") // you may need friends on author for bidirectional logic
      .sort({ createdAt: -1 })
      .lean();

    // 4. Filter by privacy
    const filteredPosts = allPosts.filter((post) => {
      const authorId = post.author._id.toString();
      const isAuthor = authorId === currentUserId;
      const isFriend = friendsIds.includes(authorId);
      const privacy = post.privacy || "public"; // defaults to public

      if (privacy === "public") return true;
      if (privacy === "onlyMe") return isAuthor;
      if (privacy === "friends") return isAuthor || isFriend;
      return false;
    });

    return res.json({ users, posts: filteredPosts });
  } catch (err) {
    console.error("Search error:", err);
    return res.status(500).json({ error: "Server error" });
  }
};

module.exports = { searchUsersAndPosts };
