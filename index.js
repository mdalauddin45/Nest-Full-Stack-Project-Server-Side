const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

//MongoDb Add
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.teba24n.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Connect to MongoDb
async function run() {
  try {
    const categoryCollection = client.db("khudalagcy").collection("products");

    // get all products
    app.get("/products", async (req, res) => {
      const product = await categoryCollection.find({}).toArray();
      res.send(product);
    });
  } catch (error) {
    console.log(error);
  }
}

run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Khuda Lagcy Server is running...");
});

app.listen(port, () => {
  console.log(`Server is running...on ${port}`);
});
