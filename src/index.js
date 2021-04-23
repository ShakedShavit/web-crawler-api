const express = require('express');
const cors = require('cors');
const crawlerRouter = require('./routers/crawler');

const port = process.env.PORT || 5000;

const app = express();
app.use(cors());
app.use(express.json());

app.use(crawlerRouter);

// TODO: interval to check if crawling is finished, if so remove it from queueUrl and queueNames lists in redis

app.listen(port, () => {
    console.log('Server connected to port: ' + port);
});