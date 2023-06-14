const express = require('express');
const app = express();
const cors = require('cors');
const jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe=require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// medileware
app.use(cors());
app.use(express.json());


const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({
      error: true, message: 'Unauthorized access'
    })
  }
  // bearer token
  const token = authorization.split(' ')[1];
  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.send.status(403).send({ error: true, message: 'Unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}

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
    const paymentCollection = client.db('summerDB').collection('payments')


    // JWT token api
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
      res.send({ token })
    })

    // verify Admin api
    const verifyAdmin= async(req,res,next)=>{
      const email=req.decoded.email;
      const query={email: email};
      const user=await userCollection.findOne(query);
      if(user?.role !== 'admin'){
        return res.status(403).send({error: true, message: 'Forbidden Access'})
      }
      next();
    }

    // All users api
    app.get('/users', verifyJWT,verifyAdmin, async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'User already exists' })
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.delete('/users/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await userCollection.deleteOne(query);
      res.send(result);
    })
    // Admin User api

    app.get('/users/admin/:email',verifyJWT, async(req, res)=>{
      const email=req.params.email;
      if(req.decoded.email !== email){
       return res.send({admin: false})
      }
      const query={email: email};
      const user=await userCollection.findOne(query);
      const result={admin: user?.role ==='admin'};
      res.send(result);
    })

    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

    // Instructor user api
    app.get('/users/instructors/:email', async(req, res)=>{
      const email=req.params.email;
      // if(req.decoded.email !== email){
      //  return res.send({instructor: false})
      // }
      const query={email: email};
      const user=await userCollection.findOne(query);
      const result={instructor: user?.role ==='instructor'};
      res.send(result);
    })

    app.patch('/users/instructors/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          role: 'instructor'
        },
      };
      const result = await userCollection.updateOne(filter, updateDoc);
      res.send(result);
    })

   

    // Booking class Api
    app.get('/bookings', async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
      
      // TODO: when use verifyJWT token then push it

      // const decodedEmail=req.decoded.email;
      // if(email !== decodedEmail){
      //   return res.status(403).send({error:true, message: 'Forbidden access'});
      // }

      const query = { email: email };
      const result = await bookingCollection.find(query).toArray();
      res.send(result);
    })

    app.post('/bookings', async (req, res) => {
      const booking = req.body;
      const result = await bookingCollection.insertOne(booking);
      res.send(result);
    })

    app.delete('/bookings/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookingCollection.deleteOne(query);
      res.send(result);
    })

    // Classes API
    app.get('/classes', async (req, res) => {
      const query={available_seats: {$lte: 15}}
      const cursor=classCollection.find(query)
      const result = await cursor.toArray();
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

    // Payment intent api
    app.post('/create-payment-intent',verifyJWT, async(req, res)=>{
      const {price}=req.body;
      const amount=price*100;
      const paymentIntent=await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card'] 
      })
      res.send({
        clientSecret: paymentIntent.client_secret,
      })
    })

    // payment related api
    app.post('/payments', verifyJWT, async(req, res)=>{
      const payment=req.body;
      const insertResult=await paymentCollection.insertOne(payment);
      // TODO: Delete One
      // const query = { _id: new ObjectId(id) };
      // const deleteResult=await bookingCollection.deleteOne(query);
      // const query={_id: {$in: payment.bookingitems.map(id=>new ObjectId(id))}}
      // const deleteResult=await bookingCollection.deleteMany(query)

      res.send(insertResult);
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