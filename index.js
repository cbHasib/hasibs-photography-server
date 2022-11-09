const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");
require("dotenv").config();

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

async function run() {
  try {
    await client.connect();
    console.log("Database connected!");
  } catch (error) {
    console.log("Connection error!", error.name, error.message);
  }
}
run().catch((err) => console.log(err));

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

app.listen(port, () => {
  console.log(`Server running on port: ${port}`);
});
