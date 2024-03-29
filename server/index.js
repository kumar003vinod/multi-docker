const keys = require('./keys');

// Express App Setup
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
app.use(bodyParser.json());
app.use(cors());

// Postgres Client Setup
const {Pool} = require('pg');
const pgClient = new Pool({
    host: keys.pgHost,
    port: keys.pgPort,
    user: keys.pgUser,
    password: keys.pgPassword,
    database: keys.pgDatabase
});
pgClient.on('error', () => console.log('Lost Pg Connection'));
pgClient.query('CREATE TABLE IF NOT EXISTS values (number INT)')
.catch(err => console.log(err));

// Redis Client Setup
const redis = require('redis');
const redisClient = redis.createClient({
    host: keys.redisHost,
    port: keys.redisPort,
    retry_strategy: () => 1000
});
const redisPublisher = redisClient.duplicate();

// Express Route Handlers
app.get('/', (req, res) => {
    console.log('aaaa');
    res.send('Hi');
});

app.get('/values/all', async(req, res) => {
    const values = await pgClient.query('SELECT * FROM values');
    res.send(values.rows)
});

app.get('/values/current', async(req, res) => {
    const values = redisClient.hgetall('values', (err, values) => {
        res.send(values);
    });
});

app.post('/values', async(req, res) => {
    const index = req.body.index;
    if(parseInt(index) > 40) {
        return res.status(422).send('Index too high');
    }
    redisClient.hset('values', index, 'Nothing yet');
    redisPublisher.publish('insert', index);
    pgClient.query('INSERT INTO values (number) VALUES ($1)', [index]);
    res.send("submitted");
});

app.listen(5000, () => {
    console.log('listening on 5000');
});
