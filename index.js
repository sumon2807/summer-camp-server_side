const express = require('express');
const app = express();
const cors=require('cors');
const jwt=require('jsonwebtoken');
require('dotenv').config()
const port=process.env.PORT || 5000;

// medileware
app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion } = require('mongodb');
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

    const userCollection=client.db('summerDB').collection('users');

    // JWT token api
    app.post('/jwt', (req, res)=>{
      const user=req.body;
      const token=jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1h'});
      res.send({token})
    })
    // users api
    app.get('/users', async(req, res)=>{
      const result=await userCollection.find().toArray();
      res.send(result);
    })

    app.post('/users', async(req, res)=>{
      const user=req.body;
      const query={email: user.email};
      const existingUser=await userCollection.findOne(query);
      if(existingUser){
        return res.send({message: 'user already exists'})
      }
      const result=await userCollection.insertOne(user);
      res.send(result);
    });




    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);




app.get('/', (req, res)=>{
    res.send('Yoga is running..')
})
app.listen(port, ()=>{
    console.log(`Yoga is running on port ${port}`);
})