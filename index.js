const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId, } = require('mongodb');
const app = express()
const port = 5000;
require('dotenv').config()

app.use(express.json())
app.use(cors())

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization
    if (!authHeader) {
        return res.status(401).send({
            message: 'UnAuthorized access'
        })
    }
    const token = authHeader.split(' ')[1]
    // verify a token symmetric
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {

        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' })
        }
        req.decoded = decoded
    });

    next()
}

const uri = `mongodb+srv://${process.env.USER_DB}:${process.env.PASSWORD_DB}@cluster0.gx2cijq.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

// https://dubai-online-shop.onrender.com
async function run() {
    try {
        await client.connect();
        const productCollection = client.db('Dubai_shop').collection('product')
        const usersCollection = client.db('Dubai_shop').collection('users')


        app.get('/product', async (req, res) => {
            const product = await productCollection.find().toArray()
            res.send(product)
        })
        app.get('/user', verifyJWT, async (req, res) => {
            const users = await usersCollection.find().toArray()
            res.send(users)
        })
        app.get('/product/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const product = await productCollection.findOne(filter)
            res.send(product)
        })
        app.get('/admin/:email', async (req, res) => {
            const { email } = req.params
            const user = await usersCollection.findOne({ email: email })
            // res.send(user)
            const notAdmin = user === null
            const isAdmin = user?.role === 'admin'

            if (isAdmin) {
                res.send({ admin: isAdmin })
            }
            else if (notAdmin) {
                res.send({ notAdmin: notAdmin })
            }

            else {
                res.status(403).send({ message: 'Forbidden' })
            }
        })

        app.post('/product', async (req, res,) => {
            const product = await productCollection.insertOne(req.body)
            res.send(product)
        })
        app.put('/editProduct/:id', async (req, res) => {
            const id = req.params
            const product = req.body
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true }
            const updateDoc = {
                $set: product
            }
            const result = await productCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })


        app.put('/user/:email', async (req, res) => {
            const email = req.params.email
            const user = req.body
            const filter = { email: email }
            const options = { upsert: true }
            const updateDoc = {
                $set: user
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET)
            res.send({ result, token })
        })

        app.put('/user/admin/:email', verifyJWT, async (req, res) => {

            const email = req.params.email
            const requester = req.decoded.email
            const requesterAccount = await usersCollection.findOne({ email: requester })
            if (requesterAccount.role === 'admin') {
                const filter = { email: email }
                const updateDoc = {
                    $set: { role: 'admin' }
                }
                const result = await usersCollection.updateOne(filter, updateDoc)
                res.send(result)
            }
            else {
                res.status(403).send({ message: 'Forbidden' })
            }

        })
        app.get('/comment/:id', async (req, res) => {
            const id = req.params
            const filter = { _id: ObjectId(id) }
            const comment = req.body
            const requester = await productCollection.findOne(filter)
            const options = { upsert: true }
            const updateDoc = {
                $set: comment
            }
            const result = await productCollection.updateOne(updateDoc, options)
            res.send(result)

        })

        app.delete('/delete/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })
        app.delete('/product/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const result = await productCollection.deleteOne(filter)
            res.send(result)
        })
        app.get('/editDetails/:id', async (req, res) => {
            const { id } = req.params
            const filter = { _id: ObjectId(id) }
            const result = await productCollection.findOne(filter)
            res.send(result)
        })


    }
    catch (err) {
        res.send({
            error: err.message
        })
    }
}

run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})