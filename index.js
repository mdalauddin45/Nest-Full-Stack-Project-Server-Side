const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const SSLCommerzPayment = require("sslcommerz-lts");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWORD;
const is_live = false; //true for live, false for sandbox

app.use(cors());
app.use(express.json());

// Decode JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    // console.log(decoded);
    req.decoded = decoded;
    next();
  });
}

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
    const productsCollection = client.db("khudalagcy").collection("products");
    const usersCollection = client.db("khudalagcy").collection("users");
    const ordersCollection = client.db("khudalagcy").collection("orders");
    const wishlistCollection = client.db("khudalagcy").collection("wishlist");
    const shopsCollection = client.db("khudalagcy").collection("shops");
    const checkoutCollection = client.db("khudalagcy").collection("checkout");
    const confirmorderCollection = client
      .db("khudalagcy")
      .collection("confirmorder");

    // Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      // console.log("Admin true");
      next();
    };

    // Save user email & generate JWT
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;

      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      // console.log(result);
      res.send({ result, token });
    });

    // Get All User
    app.get("/users", async (req, res) => {
      const users = await usersCollection.find({}).toArray();
      res.send(users);
    });

    // Get A Single User
    app.get("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    // delet a user
    app.delete("/users/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    // update a user
    app.patch("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;

      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ result, token });
    });

    // get all products
    app.get("/products", async (req, res) => {
      const product = await productsCollection.find({}).toArray();
      res.send(product);
    });

    // Get All products for host
    app.get("/products/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {
        "seller.email": email,
      };
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    // Post A Product
    app.post("/products", verifyJWT, async (req, res) => {
      const product = req.body;
      // console.log(product);
      const result = await productsCollection.insertOne(product);
      res.send(result);
    });

    // Update A product
    app.patch("/product/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const product = req.body;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: product,
      };
      const result = await productsCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Delete a product
    app.delete("/product/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await productsCollection.deleteOne(query);
      res.send(result);
    });

    // Get Single product
    app.get("/product/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const product = await productsCollection.findOne(query);
      res.send(product);
    });

    // get Orders
    app.get("/orders", async (req, res) => {
      let query = {};

      if (req?.query?.email) {
        query = {
          email: req?.query?.email,
        };
      }
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });
    // get orders by email
    app.get("/orders/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {
        email: email,
      };
      const cursor = ordersCollection.find(query);
      const orders = await cursor.toArray();
      res.send(orders);
    });

    //orders api
    app.post("/orders", verifyJWT, async (req, res) => {
      const order = req.body;
      const result = ordersCollection.insertOne(order);
      res.send(result);
    });

    //delet order id
    app.delete("/orders/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await ordersCollection.deleteOne(query);
      res.send(result);
    });
    // get wishlist
    app.get("/wishlist", async (req, res) => {
      let query = {};

      if (req?.query?.email) {
        query = {
          email: req?.query?.email,
        };
      }
      const cursor = wishlistCollection.find(query);
      const wishlist = await cursor.toArray();
      res.send(wishlist);
    });
    // get wishlist by email
    app.get("/wishlist/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {
        email: email,
      };
      const cursor = wishlistCollection.find(query);
      const wishlist = await cursor.toArray();
      res.send(wishlist);
    });
    //wishlist api
    app.post("/wishlist", verifyJWT, async (req, res) => {
      const wishlist = req.body;
      const result = wishlistCollection.insertOne(wishlist);
      res.send(result);
    });
    // delet wishlist id
    app.delete("/wishlist/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await wishlistCollection.deleteOne(query);
      res.send(result);
    });

    // get data in shop name wise
    app.get("/shop/:shop", async (req, res) => {
      const shop = req.params.shop;
      const query = {
        shop: shop,
      };
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    // create a shop
    app.post("/shops", verifyJWT, async (req, res) => {
      const shop = req.body;
      const result = await shopsCollection.insertOne(shop);
      res.send(result);
    });

    //update shop
    app.patch("/shops/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const shop = req.body;
      const query = {
        email: email,
      };
      const options = { upsert: true };
      const updateDoc = {
        $set: shop,
      };
      const result = await shopsCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // get all shops
    app.get("/shops", async (req, res) => {
      const cursor = shopsCollection.find();
      const shops = await cursor.toArray();
      res.send(shops);
    });
    // get data in shop name wise
    app.get("/shops/:shop", async (req, res) => {
      const shop = req.params.shop;
      const query = {
        shopname: shop,
      };
      const cursor = shopsCollection.find(query);
      const details = await cursor.toArray();
      res.send(details);
    });

    // get data in shop category wise
    app.get("/category/:category", async (req, res) => {
      const category = req.params.category;
      const query = {
        category: category,
      };
      const cursor = productsCollection.find(query);
      const products = await cursor.toArray();
      res.send(products);
    });

    // post in checkout
    app.post("/checkout", verifyJWT, async (req, res) => {
      const checkout = req.body;
      const result = await checkoutCollection.insertOne(checkout);
      res.send(result);
    });
    // get checkout by email
    app.get("/checkout/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {
        email: email,
      };
      const cursor = checkoutCollection.find(query);
      const checkout = await cursor.toArray();
      res.send(checkout);
    });
    // patch checkout by email
    app.patch("/checkout/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const checkout = req.body;
      const query = {
        email: email,
      };
      const options = { upsert: true };
      const updateDoc = {
        $set: checkout,
      };
      const result = await checkoutCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });
    // Delete a checkout
    app.delete("/checkout/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await checkoutCollection.deleteOne(query);
      res.send(result);
    });

    // post in confirm order
    app.post("/confirmorder", verifyJWT, async (req, res) => {
      const order = req.body;
      const { orderItems, email } = order;

      if (!email || !orderItems) {
        return res.send({ error: "Please provide all the information" });
      }

      const orderedService = await checkoutCollection.findOne({
        _id: ObjectId(order.service),
      });

      console.log(orderedService);
      const transactionId = new ObjectId().toString();
      // cosole.log(transactionId);
      const data = {
        total_amount: orderedService.total,
        currency: "BDT",
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: `${process.env.SERVER_URL}/payment/success?transactionId=${transactionId}`,
        fail_url: `${process.env.SERVER_URL}/payment/fail?transactionId=${transactionId}`,
        cancel_url: `${process.env.SERVER_URL}/payment/cancel`,
        ipn_url: "https://nest-server-side.vercel.app/ipn",
        shipping_method: order.paymetMethod,
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: order.name,
        cus_email: order.email,
        cus_add1: order.address,
        cus_add2: "Dhaka",
        cus_city: order.city,
        cus_state: "Dhaka",
        cus_postcode: order.postalCode,
        cus_country: order.country,
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: order.name,
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: order.postalCode,
        ship_country: "Bangladesh",
      };
      // console.log(data);
      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) => {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        console.log(apiResponse);
        confirmorderCollection.insertOne({
          ...order,
          price: orderedService.total,
          transactionId,
          paid: false,
        });
        res.send({ url: GatewayPageURL });
      });
    });

    // payment success
    app.post("/payment/success", async (req, res) => {
      const { transactionId } = req.query;
      console.log(transactionId);

      if (!transactionId) {
        return res.redirect(`${process.env.CLIENT_URL}/payment/fail`);
      }

      const result = await confirmorderCollection.updateOne(
        { transactionId },

        { $set: { paid: true, paidAt: new Date() } }
      );
      console.log(result);
      if (result.modifiedCount) {
        res.redirect(
          `${process.env.CLIENT_URL}/payment/success?transactionId=${transactionId}`
        );
      }
    });

    // payment fail
    app.post("/payment/fail", async (req, res) => {
      const { transactionId } = req.query;
      if (!transactionId) {
        return res.redirect(`${process.env.CLIENT_URL}/payment/fail`);
      }
      const result = await confirmorderCollection.deleteOne({ transactionId });
      if (result.deletedCount) {
        res.redirect(`${process.env.CLIENT_URL}/payment/fail`);
      }
    });

    // get confrim payment data
    app.get("/confirmorder/by-transaction-id/:id", async (req, res) => {
      const { id } = req.params;
      const order = await confirmorderCollection.findOne({ transactionId: id });
      console.log(id, order);
      res.send(order);
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
