const expect = require("chai").expect;
const sinon = require("sinon");
const FeedController = require("../controllers/feed");
const User = require("../models/user");
const Post = require("../models/posts");
const mongoose = require("mongoose");

const {
  DB_USERNAME,
  DB_PASSWORD,
  DB_HOSTNAME,
  DB_DOMAINNAME,
  PORT,
} = require("../config");

const MONGODBURI = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOSTNAME}.${DB_DOMAINNAME}/test-messages?retryWrites=true&w=majority`;

describe("Feed Controller", function () {
  before(function (done) {
    mongoose
      .connect(MONGODBURI)
      .then((result) => {
        const user = new User({
          email: "test@test.com",
          password: "password1",
          name: "Test",
          posts: [],
          _id: "5c0f66b979af55031b34728a",
        });
        return user.save();
      })
      .then(() => {
        done();
      });
  });

  it("should add a created post to the posts of the creator", function (done) {
    const req = {
      body: {
        title: "Test Post",
        content: "A Test Post",
      },
      file: {
        path: "abc",
      },
      userId: "5c0f66b979af55031b34728a",
    };
    const res = {
      status: function () {
        return this;
      },
      json: function () {},
    };
    FeedController.createPost(req, res, () => {}).then((savedUser) => {
      expect(savedUser).to.have.property("posts");
      expect(savedUser.posts).to.have.length(1);
      done();
    });
  });

  after(function (done) {
    User.deleteMany({})
      .then(() => {
        return mongoose.disconnect();
      })
      .then(() => {
        done();
      });
  });
});
