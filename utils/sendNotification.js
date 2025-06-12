const Notification = require("../models/Notification");

const sendNotification = async ({ senderId, receiverId, type, postId, io }) => {
  if (senderId.toString() === receiverId.toString()) return; // prevent self notification

  // ✅ Check for duplicate (same sender, same type, same post)
  const existing = await Notification.findOne({
    senderId,
    receiverId,
    type,
    ...(postId ? { postId } : {}),
  });

  if (existing) return; // Don't send duplicate

  const newNotif = new Notification({
    senderId,
    receiverId,
    type,
    postId: postId || null,
  });

  await newNotif.save();
  const populated = await newNotif.populate("senderId", "name profilePic");

  io.to(receiverId.toString()).emit("receiveNotification", populated);
};

module.exports = sendNotification;
