const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const port = process.env.PORT || 5000;

// medileware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.YOGA_USER}:${process.env.YOGA_PASS}@cluster0.xj518fd.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const userCollection = client.db('summerDB').collection('users');
    const classCollection = client.db('summerDB').collection('classes');
    const instructorCollection = client.db('summerDB').collection('instructors')
    const bookingCollection = client.db('summerDB').collection('bookings')


    // JWT token api
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token })
    })
    // users api
    app.get('/users', async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    // Booking class Api
    app.get('/bookings', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })

    app.delete('/bookings/:id', async(req, res)=>{
      const id=req.params.id;
      const query={_id: new ObjectId(id)};
      const result=await bookingCollection.deleteOne(query);
      res.send(result);
    })

    // Classes API
    app.get('/classes', async (req, res) => {
      const result = await classCollection.find().toArray();
      res.send(result);
    })

    app.get('/classes/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { class_name: 1, price: 1, image: 1, instructor_name: 1, available_seats: 1, class_Details: 1 }
      }
      const result = await classCollection.findOne(query, options);
      res.send(result);
    })

    // Instructor API
    app.get('/instructors', async (req, res) => {
      const result = await instructorCollection.find().toArray();
      res.send(result);
    })

    app.get('/instructors/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = {
        projection: { name: 1, image_url: 1, email: 1, classes_taken: 1, details_info: 1, position: 1 }
      }
      const result = await instructorCollection.findOne(query, options);
      res.send(result);
    })




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res) => {
  res.send('Summer yoga is running..')
})
app.listen(port, () => {
  console.log(`Yoga is running on port ${port}`);
})