const expect = require("chai").expect;
const sinon = require("sinon");
const User = require("../models/user");
const AuthController = require("../controllers/auth");
const user = require("../models/user");
const mongoose = require("mongoose");

const {
  DB_USERNAME,
  DB_PASSWORD,
  DB_HOSTNAME,
  DB_DOMAINNAME,
  PORT,
} = require("../config");

const MONGODBURI = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOSTNAME}.${DB_DOMAINNAME}/test-messages?retryWrites=true&w=majority`;

describe("Auth Controller - Login", function () {
  it("should throw an error with code 500 if accessing the database fails", function (done) {
    sinon.stub(User, "findOne");
    User.findOne.throws();

    const req = {
      body: {
        email: "test@email.com",
        password: "password",
      },
    };

    AuthController.login(req, {}, () => {}).then((result) => {
      expect(result).to.be.an("error");
      expect(result).to.have.property("statusCode", 500);
      done();
    });

    user.findOne.restore();
  });

  it("should send a response with a valid user status for an existing user", function (done) {
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
        const req = {
          userId: "5c0f66b979af55031b34728a",
        };
        const res = {
          statusCode: 500,
          userStatus: null,
          status: function (code) {
            this.statusCode = code;
            return this;
          },
          json: function (data) {
            this.userStatus = data.status;
          },
        };
        AuthController.getUserStatus(req, res, () => {}).then(() => {
          expect(res.statusCode).to.be.equal(200);
          expect(res.userStatus).to.be.equal("I am new!");
          done();
        });
      })
      .catch((err) => console.log(err));
  });
});
