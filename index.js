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

/* Verify JWT */
function verifyJWT(req, res, next) {
    const authHeaders = req.headers.authorization;
    if(!authHeaders){
        return res.status(401).send({message: 'UnAuthorized Access' })
    }
    const token = authHeaders.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_KEY, function(err, decoded){
        if(err){
            return res.status(403).send({message:'Forbidden Access'})
        }
        decoded = req.decoded;
        console.log(decoded, 'from jwt');
        next();

    })
}


async function run() {
    try {
      await client.connect();
      const partsCollection = client.db("manufactureable_parts").collection('allparts');
      const userCollection = client.db("manufactureable_parts").collection('allUsers');
      /* put Method When user login */
      app.put('/user/:email', async(req,res)=>{
          const email = req.params.email;
          const user = req.body;
          const filter = {email:email};
          const option = {upsert: true};
          const updateDoc = {
              $set: user
          };
          const result = await userCollection.updateOne(filter, updateDoc, option);
          const token = jwt.sign({email:email}, process.env.ACCESS_TOKEN_KEY, {expiresIn: '2h' } )
          console.log(token);
          res.status(200).send({token, result});


      })

      /* add New Parts */
      app.post('/addParts', async(req, res)=>{
          const parts = req.body;
          console.log(parts);
          const result = partsCollection.insertOne(parts);
          res.send(result);
      })
      /* get all parts */
      app.get('/allParts', async(req,res)=>{
          const parts = await partsCollection.find().toArray();
          res.send(parts);
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