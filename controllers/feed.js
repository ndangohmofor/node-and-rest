const { validationResult } = require("express-validator");
const Post = require("../models/posts");
const fs = require("fs");
const path = require("path");
const User = require("../models/user");
const io = require("../socket");

exports.getPosts = async (req, res, next) => {
  const currentPage = req.query.page || 1;
  const perPage = 2;
  // let totalItems;
  // Post.find()
  //   .countDocuments()
  //   .then((count) => {
  //     totalItems = count;
  //     return Post.find()
  //       .skip((currentPage - 1) * perPage)
  //       .limit(perPage);
  //   })
  //   .then((posts) => {
  //     res.status(200).json({
  //       message: "Fetched posts successfully!",
  //       posts: posts,
  //       totalItems: totalItems,
  //     });
  //   })
  //   .catch((err) => {
  //     if (!err.statusCode) {
  //       err.statusCode = 500;
  //     }
  //     next(err);
  //   });
  try {
    const totalItems = await Post.find().countDocuments();
    const posts = await Post.find()
      .populate("creator")
      .sort({ createdAt: -1 })
      .skip((currentPage - 1) * perPage)
      .limit(perPage);
    res.status(200).json({
      message: "Fetched posts successfully!",
      posts: posts,
      totalItems: totalItems,
    });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.createPost = async (req, res, next) => {
  // console.log(req.body);
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed. Entered data is incorrect");
    error.statusCode = 422;
    throw error;
  }
  if (!req.file) {
    const error = new Error("No Image Provided");
    error.statusCode = 422;
    throw error;
  }
  const imageUrl = req.file.path.replace("\\", "/");
  const title = req.body.title;
  const content = req.body.content;
  // let creator;
  // console.log(title, content);
  //Create a post in the db
  const post = new Post({
    title: title,
    content: content,
    imageUrl: imageUrl,
    creator: req.userId,
  });
  // post
  //   .save()
  //   .then((result) => {
  //     return User.findById(req.userId);
  //   })
  //   .then((user) => {
  //     creator = user;
  //     user.posts.push(post);
  //     return user.save();
  //   })
  //   .then((result) => {
  //     res.status(201).json({
  //       message: "Post created successfully",
  //       post: post,
  //       creator: { _id: creator._id, name: creator.name },
  //     });
  //   })
  //   .catch((err) => {
  //     if (!err.statusCode) {
  //       err.statusCode = 500;
  //     }
  //     next(err);
  //   });
  try {
    await post.save();
    const user = await User.findById(req.userId);
    user.posts.push(post);
    const savedUser = await user.save();
    io.getIO().emit("posts", {
      action: "create",
      post: { ...post._doc, creator: { _id: req.userId, name: user.name } },
    });
    res.status(201).json({
      message: "Post created successfully",
      post: post,
      creator: { _id: user._id, name: user.name },
    });
    return savedUser;
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.getPost = async (req, res, next) => {
  const postId = req.params.postId;
  // Post.findById(postId)
  //   .then((post) => {
  //     if (!post) {
  //       const error = new Error("No Post found");
  //       error.statusCode = 404;
  //       throw error;
  //     }
  //     res.status(200).json({ message: "Post fetched!", post: post });
  //   })
  //   .catch((err) => {
  //     if (!err.statusCode) {
  //       err.statusCode = 500;
  //     }
  //     next(err);
  //   });
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("No Post found");
      error.statusCode = 404;
      throw error;
    }
    res.status(200).json({ message: "Post fetched!", post: post });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.updatePost = async (req, res, next) => {
  const postId = req.params.postId;
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const error = new Error("Validation failed. Entered data is incorrect");
    error.statusCode = 422;
    throw error;
  }
  const title = req.body.title;
  const content = req.body.content;
  let imageUrl = req.body.image;
  if (req.file) {
    imageUrl = req.file.path.replace("\\", "/");
  }
  if (!imageUrl) {
    const error = new Error("No File Added");
    error.statusCode = 422;
    throw error;
  }
  // Post.findById(postId)
  //   .then((post) => {
  //     if (!post) {
  //       const error = new Error("No Post found");
  //       error.statusCode = 404;
  //       throw error;
  //     }
  //     if (post.creator.toString() !== req.userId) {
  //       const error = new Error("Not authorized");
  //       error.statusCode = 403;
  //       throw error;
  //     }
  //     if (imageUrl !== post.imageUrl) {
  //       clearImage(post.imageUrl);
  //     }
  //     post.title = title;
  //     post.imageUrl = imageUrl;
  //     post.content = content;
  //     return post.save();
  //   })
  //   .then((result) => {
  //     res.status(200).json({ message: "Post update!", post: result });
  //   })
  //   .catch((err) => {
  //     if (!err.statusCode) {
  //       err.statusCode = 500;
  //     }
  //     next(err);
  //   });
  try {
    const post = await Post.findById(postId).populate("creator");
    if (!post) {
      const error = new Error("No Post found");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator._id.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }
    if (imageUrl !== post.imageUrl) {
      clearImage(post.imageUrl);
    }
    post.title = title;
    post.imageUrl = imageUrl;
    post.content = content;
    const result = await post.save();
    io.getIO().emit("posts", {
      action: "update",
      post: result,
    });
    res.status(200).json({ message: "Post update!", post: result });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

exports.deletePost = async (req, res, next) => {
  const postId = req.params.postId;
  // Post.findById(postId)
  //   .then((post) => {
  //     if (!post) {
  //       const error = new Error("No Post found");
  //       error.statusCode = 404;
  //       throw error;
  //     }
  //     //Check logged in user
  //     if (post.creator.toString() !== req.userId) {
  //       const error = new Error("Not authorized");
  //       error.statusCode = 403;
  //       throw error;
  //     }
  //     clearImage(post.imageUrl);
  //     return Post.findByIdAndRemove(postId);
  //   })
  //   .then((result) => {
  //     return User.findById(req.userId);
  //   })
  //   .then((user) => {
  //     user.posts.pull(postId);
  //     return user.save();
  //   })
  //   .then((result) => {
  //     res.status(200).json({ message: "Deleted Post" });
  //   })
  //   .catch((err) => {
  //     if (!err.statusCode) {
  //       err.statusCode = 500;
  //     }
  //     next(err);
  //   });
  try {
    const post = await Post.findById(postId);
    if (!post) {
      const error = new Error("No Post found");
      error.statusCode = 404;
      throw error;
    }
    if (post.creator.toString() !== req.userId) {
      const error = new Error("Not authorized");
      error.statusCode = 403;
      throw error;
    }
    clearImage(post.imageUrl);
    await Post.findByIdAndRemove(postId);
    const user = await User.findById(req.userId);
    user.posts.pull(postId);
    await user.save();
    io.getIO().emit("posts", { action: "delete", post: postId });
    res.status(200).json({ message: "Deleted Post" });
  } catch (err) {
    if (!err.statusCode) {
      err.statusCode = 500;
    }
    next(err);
  }
};

const clearImage = (filePath) => {
  filePath = path.join(__dirname, "..", filePath);
  fs.unlink(filePath, (err) => console.log(err));
};
