const express = require("express");
const { clearImage } = require("./util/clearFile");
// const feedRoutes = require("./routes/feed");
// const authRoutes = require("./routes/auth");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const path = require("path");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const { graphqlHTTP } = require("express-graphql");
const graphqlSchema = require("./grapghql/schema");
const graphqlResolver = require("./grapghql/resolvers");
const auth = require("./middleware/auth");
const {
  DB_USERNAME,
  DB_PASSWORD,
  DB_HOSTNAME,
  DB_DOMAINNAME,
  PORT,
} = require("./config");
const { error } = require("console");

const app = express();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4());
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpb" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

app.use(bodyParser.json()); //used for application/json
app.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
debugger;
app.use("/images", express.static(path.join(__dirname, "images")));
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "OPTIONS, GET, POST, PUT, PATCH, DELETE"
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

app.use(auth);

app.put("/post-image", (req, res, next) => {
  if (!req.isAuth) {
    throw new Error("Not Authenticated");
  }
  if (!req.file) {
    return res.status(200).json({ message: "No file provided!" });
  }
  if (req.body.oldPath) {
    try {
      clearImage(req.body.oldPath);
    } catch (error) {
      console.log(error);
    }
  }
  return res
    .status(201)
    .json({ message: "File stored", filePath: req.file.path });
});

// app.use("/feed", feedRoutes);
// app.use("/auth", authRoutes);

app.use(
  "/graphql",
  graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolver,
    graphiql: true,
    formatError(err) {
      if (!err.originalError) {
        return err;
      }
      const data = err.originalError.data;
      const message = err.message || "An error occurred";
      const code = err.originalError.code || 500;
      return { message: message, status: code, data: data };
    },
  })
);

app.use((error, req, res, next) => {
  console.log(error);
  const status = error.statusCode || 500;
  const message = error.message;
  const data = error.data;
  res.status(status).json({ message: message, data: data });
});

const MONGODBURI = `mongodb+srv://${DB_USERNAME}:${DB_PASSWORD}@${DB_HOSTNAME}.${DB_DOMAINNAME}/messages?retryWrites=true&w=majority`;

mongoose
  .connect(MONGODBURI)
  .then((result) => {
    app.listen(`${PORT}`);
    // const server = app.listen(`${PORT}`);
    // const io = require("./socket").init(server);
    // io.on("connection", (socket) => {
    //   console.log("Client connected");
    // });
  })
  .catch((err) => console.log(err));
