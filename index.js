const express = require('express')
const app = express()
const cors = require('cors')
const port = process.env.PORT || 5000;
require('dotenv').config();

const jwt = require('jsonwebtoken');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);


app.use(cors());
app.use(express.json());


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.uhmti.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJWT(req, res, next) {
  const authHeaders = req.headers.authorization;
  if (!authHeaders) {
    return res.status(401).send({ message: 'UnAuthorized Access' })
  }
  const token = authHeaders.split(' ')[1];
  // console.log(token, 'token verify jwt')
  jwt.verify(token, process.env.ACCESS_TOKEN_KEY, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: 'Forbidden accessSS' })
    }
    req.decoded = decoded;
    next();
    // console.log(decoded)
  });
}

async function run() {
  try {
    await client.connect();
    const partsCollection = client.db("manufactureable_parts").collection('allparts');
    const userCollection = client.db("manufactureable_parts").collection('allUsers');
    const purchaseCollection = client.db("manufactureable_parts").collection('purchases');
    const paymentCollection = client.db("manufactureable_parts").collection('payments');
    const reviewCollection = client.db("manufactureable_parts").collection('reviews');
    const profileCollection = client.db("manufactureable_parts").collection('profile');


    /* Stripe Payment Intent */
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const service = req.body;
      const price = service.price;
      const amount = price * 100;
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({ clientSecret: paymentIntent.client_secret })
    });

    /*  */
    app.patch('/purchase/:id', async (req, res) => {
      const id = req.params.id;
      const payment = req.body;
      const filter = { _id: ObjectId(id) };
      const updateDoc = {
        $set: {
          paid: true,
          transactionId: payment.transactionId,
        }
      }
      const updateBooking = await purchaseCollection.updateOne(filter, updateDoc);
      const result = await paymentCollection.insertOne(payment);
      res.status(401).send({ updateBooking, result })

    })

    /* Add a Review */
    app.post('/addReview', async (req, res) => {
      const data = req.body;
      const result = await reviewCollection.insertOne(data);
      res.send(result);
      console.log(result)
    })

    /* get all reviews */
    app.get('/reviews', async (req, res) => {
      const review = await reviewCollection.find().toArray();
      res.send(review);
    })



    // /* create user profil */
    // app.post('/createProfile', async (req, res) => {
    //   const data = req.body;
    //   const result = await profileCollection.insertOne(data);
    //   res.send(result);
    //   console.log(result)
    // })

    app.put('/createProfile/:email', async (req, res)=>{
      const email = req.params.email;
      console.log(email)
      const user = req.body;
      const filter = {email: email};
      const options = { upsert: true };
      const updateDoc = {
        $set: user
      };
      const result =await profileCollection.updateOne(filter, updateDoc, options);
      res.status(200).send( result)
      console.log(result);
    })

    app.get('/userProfile/:email', async (req, res) => {
      const email = req.params.email;
      console.log(email, 'user profile')
      const query = {email};
      const Result = await profileCollection.findOne(query);
      res.send(Result);
    })

    /* get the user is =! admin */
    app.get('/admin/:email', async (req, res) => {
      const email = req.params.email;
      const user = await userCollection.findOne({ email: email });
      const isAdmin = user.role === 'admin';
      res.send({ admin: isAdmin })
    })

    // /* get the only loged user orders */
    app.get('/orders', verifyJWT, async (req, res) => {
      const userEmail = req.query.userEmail;
      const authorization = req.headers.authorization;
      const decodedEmail = req.decoded.email;
      if (userEmail === decodedEmail) {
        // console.log('auth header', authorization);
        const query = { userEmail: userEmail };
        const bookings = await purchaseCollection.find(query).toArray();
        return res.send(bookings)
      }
      else {
        return res.status(403).send({ message: 'Forbidden Access' });
      }
    })

    /* get single purchase by id */
    app.get('/purchase/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id, 'spbi')
      const query = { _id: ObjectId(id) };
      const Result = await purchaseCollection.findOne(query);
      res.send(Result);
    })




    /* delet orders when user not paid */
    app.delete('/orders/:id', async (req, res) => {
      const id = req.params.id;
      // console.log(id , 'purcheses using id')
      const filter = { _id: ObjectId(id) };
      const result = await purchaseCollection.deleteOne(filter);
      res.send(result);
    })

    // /* Delet a Users Products */
    // app.delete('/order/:id',async(req,res)=>{
    //   const id = req.params.id;
    //   console.log(id);
    //   const filter = { _id: ObjectId(id) };
    //   const result = await purchaseCollection.deleteOne(filter);
    //   res.send(result);
    // })

    // app.get('/part/:id', async (req, res) => {
    //   const id = req.params.id;
    //   const query = { _id: ObjectId(id) };
    //   const booking = await partsCollection.findOne(query);
    //   res.send(booking);
    // })








    /* put Method When user login */
    app.put('/user/:email', async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const option = { upsert: true };
      const updateDoc = {
        $set: user
      };
      const result = await userCollection.updateOne(filter, updateDoc, option);
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_KEY, { expiresIn: '2h' })
      // console.log(token, 'when user login');
      res.status(200).send({ token, result });


    })

    /* add New Parts */
    app.post('/addParts', async (req, res) => {
      const parts = req.body;
      console.log(parts);
      const result = partsCollection.insertOne(parts);
      res.send(result);
    })
    /* get all parts */
    app.get('/allParts', async (req, res) => {
      const parts = await partsCollection.find().toArray();
      res.send(parts);
    })
    /* get single parts by id */
    app.get('/part/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await partsCollection.findOne(query);
      res.send(booking);
    })

    /* purchease a booking or post a booking */
    app.post('/purchase', async (req, res) => {
      const purchase = req.body;
      //   const query = {email: purchase.email};
      //   const exist = await booking
      const result = await purchaseCollection.insertOne(purchase);
      console.log(result)
      return res.send({ success: true, result });
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