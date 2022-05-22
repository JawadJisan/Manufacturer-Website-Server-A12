const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;
require('dotenv').config();

const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


app.use(cors());
app.use(express.json());

const { MongoClient, ServerApiVersion } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uhmti.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


async function run() {
    try {
      await client.connect();
      const partsCollection = client.db("manufactureable_parts").collection('allparts');

      /* add New Parts */
      app.post('/addParts', async(req, res)=>{
          const parts = req.body;
          console.log(parts);
          const result = partsCollection.insertOne(parts);
          res.send(result);
      })



    } 
    finally {

    }
  }
  run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello Manufacture Web Server!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})