const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();
const jwt = require("jsonwebtoken");

const app = express();
const port = process.env.PORT || 5000;
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Hasib's Photography Server is Running");
});

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.pkcv1zd.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(
  uri,
  { useUnifiedTopology: true },
  { useNewUrlParser: true }
);

function verifyJWT(req, res, next) {
  const authTokenHeader = req.headers["authorization"];
  if (!authTokenHeader) {
    return res.status(401).send({
      success: false,
      error: "Unauthorized Access!",
    });
  }
  const token = authTokenHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      res.json({ success: false, error: "You failed to authenticate!" });
    } else {
      req.decoded = decoded;
      next();
    }
  });
}

async function run() {
  try {
    await client.connect();
    console.log("Database connected!");
  } catch (error) {
    console.log("Connection error!", error.name, error.message);
  }
}
run().catch((err) => console.log(err));

// JWT Sign In
app.post("/jwt", (req, res) => {
  const user = req.body;
  const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "1d",
  });
  res.send({ token });
});

// Database on MongoDB
const db = client.db(`${process.env.DB_NAME}`);

// Blog Collection on MongoDB (GET)
const Blogs = db.collection("blogs");
const BlogAuthor = db.collection("blogAuthor");
const BlogCategory = db.collection("blogCategory");

// All Blogs Data Send (GET)
app.get("/blogs", async (req, res) => {
  try {
    if (req.query.page && req.query.limit) {
      const page = Number(req.query.page);
      const limit = Number(req.query.limit);
      const skip = (page - 1) * limit;
      const cursor = Blogs.find({}).skip(skip).limit(limit);
      const data = await cursor.toArray();
      if (data.length === 0) {
        res.send({
          success: false,
          error: "No Blog Founds!",
          data: [],
        });
        return;
      }
      res.send({
        success: true,
        data: data,
      });
    } else {
      const cursor = Blogs.find({});
      const data = await cursor.toArray();
      if (data.length === 0) {
        res.send({
          success: false,
          error: "No Blog Founds!",
          data: [],
        });
        return;
      }
      res.send({
        success: true,
        data: data,
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Blog Data Update - Needed Data From Mongo (GET)
app.get("/blog-count", async (req, res) => {
  try {
    const count = await Blogs.estimatedDocumentCount();
    res.send({
      success: true,
      data: count,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Send Single Blog Data (GET)
app.get("/single-blog/:cat_slug/:slug", async (req, res) => {
  const { slug, cat_slug } = req.params;
  try {
    const query = { slug: `${cat_slug}/${slug}` };

    const data = await Blogs.findOne(query);
    if (!data) {
      res.send({
        success: false,
        error: "No Blog Founds!",
        data: {},
      });
      return;
    }

    const option = { upsert: true };
    const updateDocs = {
      $set: {
        viewCount: data.viewCount + 1,
      },
    };
    const result = await Blogs.updateOne(query, updateDocs, option);

    res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Send Single Blog Data by ID (GET)
app.get("/get-single-blog/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const data = await Blogs.findOne({ _id: ObjectId(id) });
    if (!data) {
      res.send({
        success: false,
        error: "Blog not found",
        data: {},
      });
      return;
    }
    res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Update Post Info (PUT)
app.put("/update-blog/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const query = { _id: ObjectId(id) };
    const option = { upsert: true };
    const newData = {
      $set: data,
    };

    const result = await Blogs.updateOne(query, newData, option);

    if (result.acknowledged && result.modifiedCount > 0) {
      res.send({
        success: true,
        message: "Successfully Updated!",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Delete Blog (DELETE)
app.delete("/delete-blog/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Blogs.deleteOne({ _id: ObjectId(id) });
    if (result.acknowledged) {
      res.send({
        success: true,
        message: "Successfully Deleted Blog",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// All Author Data Send (GET)
app.get("/authors", async (req, res) => {
  try {
    const cursor = BlogAuthor.find({});
    const data = await cursor.toArray();
    res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Add New Blog Author (POST)
app.post("/add-author", async (req, res) => {
  try {
    const data = req.body;

    const result = await BlogAuthor.insertOne(data);

    if (result.acknowledged) {
      res.send({
        success: true,
        message: "Successfully Added Author",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Author Data Send by ID (GET)
app.get("/author/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const data = await BlogAuthor.findOne({ _id: ObjectId(id) });
    if (!data) {
      res.send({
        success: false,
        error: "Author not found",
        data: {},
      });
      return;
    }
    res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Update Author Info (PUT)
app.put("/update-author/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const query = { _id: ObjectId(id) };
    const option = { upsert: true };
    const newData = {
      $set: data,
    };

    const result = await BlogAuthor.updateOne(query, newData, option);

    if (result.acknowledged && result.modifiedCount > 0) {
      res.send({
        success: true,
        message: "Successfully Updated!",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Delete Author (DELETE)
app.delete("/delete-author/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await BlogAuthor.deleteOne({ _id: ObjectId(id) });
    if (result.acknowledged) {
      res.send({
        success: true,
        message: "Successfully Deleted Author",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// All Category Data Send (GET)
app.get("/blog-categories", async (req, res) => {
  try {
    const cursor = BlogCategory.find({});
    const data = await cursor.toArray();
    res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Category Data Send by ID (GET)
app.get("/blog-category/:id", async (req, res) => {
  const id = req.params.id;
  try {
    const data = await BlogCategory.findOne({ _id: ObjectId(id) });
    if (!data) {
      res.send({
        success: false,
        error: "Category not found",
        data: {},
      });
      return;
    }
    res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Add New Blog Category (POST)
app.post("/add-blog-category", async (req, res) => {
  try {
    const data = req.body;

    const result = await BlogCategory.insertOne(data);

    if (result.acknowledged) {
      res.send({
        success: true,
        message: "Successfully Added Blog Category",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Update Blog Category Info (PUT)
app.put("/update-blog-category/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = req.body;

    const query = { _id: ObjectId(id) };
    const option = { upsert: true };
    const newData = {
      $set: data,
    };

    const result = await BlogCategory.updateOne(query, newData, option);

    if (result.acknowledged && result.modifiedCount > 0) {
      res.send({
        success: true,
        message: "Successfully Updated!",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Delete Blog Category (DELETE)
app.delete("/delete-blog-category/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await BlogCategory.deleteOne({ _id: ObjectId(id) });
    if (result.acknowledged) {
      res.send({
        success: true,
        message: "Successfully Deleted Category",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Add Single Blog (POST)
app.post("/add-new-blog", async (req, res) => {
  try {
    const result = await Blogs.insertOne(req.body);

    if (result.acknowledged) {
      res.send({
        success: true,
        message: "Successfully Added Blog",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Service Collection on MongoDB
const Services = db.collection("services");

// Service Data Send (GET)
app.get("/services", async (req, res) => {
  try {
    if (req.query.page && req.query.limit) {
      const page = Number(req.query.page);
      const limit = Number(req.query.limit);
      const skip = (page - 1) * limit;
      const cursor = Services.find({})
        .sort({ _id: -1 })
        .skip(skip)
        .limit(limit);
      const data = await cursor.toArray();
      if (data.length === 0) {
        res.send({
          success: false,
          error: "No Service found",
          data: [],
        });
        return;
      }
      res.send({
        success: true,
        data: data,
      });
    } else {
      const cursor = Services.find({});
      const data = await cursor.toArray();
      if (data.length === 0) {
        res.send({
          success: false,
          error: "No Service found",
          data: [],
        });
        return;
      }
      res.send({
        success: true,
        data: data,
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Service Data Update - Needed Data From Mongo (GET)
app.get("/service-count", async (req, res) => {
  try {
    const count = await Services.estimatedDocumentCount();
    res.send({
      success: true,
      data: count,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Service Data Update (PUT)
app.put("/service-update/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };

  const newServices = {
    $set: req.body,
  };

  const option = { upsert: true };

  const result = await Services.updateOne(query, newServices, option);

  if (result.acknowledged && result.modifiedCount > 0) {
    res.send({
      success: true,
      message: "Successfully Update!",
    });
  } else {
    res.send({
      success: false,
      error: "Something went wrong!",
    });
  }
});

// Single Service Details Data Send (GET)
app.get("/service/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const data = await Services.findOne({ _id: ObjectId(id) });
    if (!data) {
      res.send({
        success: false,
        error: "No Service found",
        data: {},
      });
      return;
    }
    res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Add Single Service (POST)
app.post("/add-new-service", async (req, res) => {
  try {
    const result = await Services.insertOne(req.body);
    if (result.acknowledged && result.insertedId) {
      res.send({
        success: true,
        message: "Successfully Added Service",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Delete a service (DELETE)
app.delete("/delete-service/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const result = await Services.deleteOne({ _id: ObjectId(id) });

    if (result.acknowledged && result.deletedCount > 0) {
      res.send({
        success: true,
        message: "Successfully deleted service.",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Contact Form Data (POST)
const ContactForm = db.collection("contactForm");
app.post("/contact-form", async (req, res) => {
  try {
    const { name, email, subject, message } = req.body;
    const newData = {
      name,
      email,
      subject,
      message,
      date: new Date(),
      resolved: false,
    };

    const result = await ContactForm.insertOne(newData);
    if (result.acknowledged && result.insertedId) {
      res.send({
        success: true,
        message: "We received your message. We will contact you soon.",
      });
    } else {
      res.send({
        success: false,
        error: "Message not sent, please try again later.",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// All Contact Form Data (GET)
app.get("/contact-form", async (req, res) => {
  try {
    const cursor = ContactForm.find({});
    const data = await cursor.toArray();
    if (data.length > 0) {
      res.send({
        success: true,
        data: data,
      });
    } else {
      res.send({
        success: false,
        error: "No data found",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Single Contact Form Data (GET)
app.get("/contact-form/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await ContactForm.findOne({ _id: ObjectId(id) });
    if (data) {
      res.send({
        success: true,
        data: data,
      });
    } else {
      res.send({
        success: false,
        error: "No data found",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Marks as Solved Contact (Patch)
app.patch("/solved-contact/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const option = { upsert: true };
    const newData = {
      $set: { resolved: true },
    };
    const result = await ContactForm.updateOne(query, newData, option);
    if (result.acknowledged && result.modifiedCount > 0) {
      res.send({
        success: true,
        message: "Successfully Marked as Solved",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Contact Data Update - Needed Data From Mongo (GET)
app.get("/message-count", async (req, res) => {
  try {
    const count = await ContactForm.estimatedDocumentCount();
    res.send({
      success: true,
      data: count,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Booking Form Data (POST)
const bookForm = db.collection("bookingForm");
app.post("/booking-form", async (req, res) => {
  try {
    const newData = {
      ...req.body,
      bookingDate: new Date(),
      resolved: false,
    };

    const result = await bookForm.insertOne(newData);
    if (result.acknowledged && result.insertedId) {
      res.send({
        success: true,
        message:
          "We received your booking information. We will contact you soon.",
      });
    } else {
      res.send({
        success: false,
        error: "Message mail sent, please try again later.",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Service Data Update - Needed Data From Mongo (GET)
app.get("/booking-count", async (req, res) => {
  try {
    const count = await bookForm.estimatedDocumentCount();
    res.send({
      success: true,
      data: count,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// All Contact Form Data (GET)
app.get("/booking-form", async (req, res) => {
  try {
    const cursor = bookForm.find({});
    const data = await cursor.toArray();
    if (data.length > 0) {
      res.send({
        success: true,
        data: data,
      });
    } else {
      res.send({
        success: false,
        error: "No data found",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Single Contact Form Data (GET)
app.get("/booking-form/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await bookForm.findOne({ _id: ObjectId(id) });
    if (data) {
      res.send({
        success: true,
        data: data,
      });
    } else {
      res.send({
        success: false,
        error: "No data found",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Marks as Solved Contact (Patch)
app.patch("/solved-booking/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const option = { upsert: true };
    const newData = {
      $set: { resolved: true },
    };
    const result = await bookForm.updateOne(query, newData, option);
    if (result.acknowledged && result.modifiedCount > 0) {
      res.send({
        success: true,
        message: "Successfully Marked as Solved",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Review Collection
const Reviews = db.collection("reviews");
// All Review Data Send (GET)
app.get("/reviews", async (req, res) => {
  try {
    if (req.query.sort === "desc") {
      const cursor = Reviews.find({}).sort({ reviewTime: -1 });
      const data = await cursor.toArray();
      if (data.length > 0) {
        res.send({
          success: true,
          data: data,
        });
      } else {
        res.send({
          success: false,
          error: "No data found",
        });
      }
      return;
    }

    const cursor = Reviews.find({});
    const data = await cursor.toArray();
    if (data.length > 0) {
      res.send({
        success: true,
        data: data,
      });
    } else {
      res.send({
        success: false,
        error: "No data found",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Get Single Review Data (GET)
app.get("/reviews/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const data = await Reviews.findOne({ _id: ObjectId(id) });
    if (data) {
      res.send({
        success: true,
        data: data,
      });
    } else {
      res.send({
        success: false,
        error: "No data found",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Add New Review (POST)
app.post("/add-review", async (req, res) => {
  try {
    const data = req.body;
    const result = await Reviews.insertOne(data);

    if (result.acknowledged && result.insertedId) {
      res.send({
        success: true,
        message: "Successfully Added Review",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Review Count (GET) - Needed Data From Mongo by Service ID
app.get("/average-rating/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const count = await Reviews.countDocuments({ serviceId: id });
    const data = await Reviews.find({ serviceId: id }).toArray();
    let totalRating = 0;
    data.forEach((item) => {
      totalRating += item.rating;
    });
    const averageRating = parseFloat((totalRating / count).toFixed(1));

    res.send({
      success: true,
      data: averageRating,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Get Review Data by Service ID (GET)
app.get("/get-reviews/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const cursor = Reviews.find({ serviceId: id });

    if (req.query.sort === "desc" && req.query.limit && req.query.page) {
      const limit = Number(req.query.limit);
      const page = Number(req.query.page);
      const skip = (page - 1) * limit;

      const sorted = cursor.sort({ reviewTime: -1 }).limit(limit).skip(skip);
      const data = await sorted.toArray();
      if (data.length > 0) {
        res.send({
          success: true,
          data: data,
        });
      } else {
        res.send({
          success: false,
          error: "No data found",
        });
      }
      return;
    }

    if (req.query.sort === "desc") {
      const sorted = cursor.sort({ reviewTime: -1 });
      const data = await sorted.toArray();
      if (data.length > 0) {
        res.send({
          success: true,
          data: data,
        });
      } else {
        res.send({
          success: false,
          error: "No data found",
        });
      }
      return;
    }

    const data = await cursor.toArray();
    if (data.length > 0) {
      res.send({
        success: true,
        data: data,
      });
    } else {
      res.send({
        success: false,
        error: "No data found",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Review Count (GET) - Needed Data From Mongo by Service ID
app.get("/review-count", async (req, res) => {
  try {
    const count = await Reviews.estimatedDocumentCount();
    res.send({
      success: true,
      data: count,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Review Count (GET) - Needed Data From Mongo by Service ID
app.get("/review-count/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const count = await Reviews.find({
      serviceId: id,
    }).toArray();
    const data = count.length;
    res.send({
      success: true,
      data: data,
    });
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// My Review (GET) - by User ID
app.get("/my-reviews", verifyJWT, async (req, res) => {
  try {
    const decoded = req.decoded;
    if (decoded.uid !== req.query.uid) {
      res.status(403).send({
        success: false,
        error: "You are not authorized to access this data",
      });
    }

    const uid = req.query.uid;
    const cursor = Reviews.find({ uid: uid }).sort({ reviewTime: -1 });

    if (req.query.limit && req.query.page && uid) {
      const limit = Number(req.query.limit);
      const page = Number(req.query.page);
      const skip = (page - 1) * limit;
      const sorted = cursor.limit(limit).skip(skip);
      const data = await sorted.toArray();
      if (data.length > 0) {
        res.send({
          success: true,
          data: data,
        });
      } else {
        res.send({
          success: false,
          error: "No data found",
        });
      }
      return;
    }

    const data = await cursor.toArray();
    if (data.length > 0) {
      res.send({
        success: true,
        data: data,
      });
    } else {
      res.send({
        success: false,
        error: "No data found",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Delete Review by UID (DELETE)
app.delete("/delete-review/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Reviews.deleteOne({ _id: ObjectId(id) });
    if (result.deletedCount > 0) {
      res.send({
        success: true,
        message: "Successfully Deleted Review",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

// Update Review by reviewID (Patch)
app.patch("/update-review/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const result = await Reviews.updateOne(
      { _id: ObjectId(id) },
      {
        $set: {
          rating: req.body.rating,
          review: req.body.review,
        },
      }
    );
    if (result.modifiedCount > 0) {
      res.send({
        success: true,
        message: "Successfully Updated Review",
      });
    } else {
      res.send({
        success: false,
        error: "Something went wrong!",
      });
    }
  } catch (error) {
    res.send({
      success: false,
      error: error.message,
    });
  }
});

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
