const express = require('express');
const Site = require('../utils/site');
const { createQueue } = require('../middleware/sqs');
const {
    sqs,
    sendMessageToQueue,
    handleMessagesFromQueue,
    receiveMessagesProcessResolved
} = require('../utils/sqs');

const router = new express.Router();

// router.post('/start-scraping', async (req, res) => {
//     try {
//         const maxPages = req.body.maxPages ? parseInt(req.body.maxPages) + 1 : Infinity;
//         const rootSite = new Site(req.body.startUrl, 0);

//         let values = [rootSite];
//         let hasMaxPagesBeenReached = false;

//         while (values.length) {
//             console.log(values[0].level); //

//             // here send the url to sqs

//             await values[0].setTitle();

//             if (values[0].level < parseInt(req.body.maxDepth) && !hasMaxPagesBeenReached) {
//                 hasMaxPagesBeenReached = await values[0].setLinks(maxPages);

//                 values = values.concat(values[0].links)
//             }

//             values.shift();
//         }

//         console.log('Done');

//         res.send();
//     } catch (err) {
//         console.log(err);
//         res.status(400).send(err);
//     }
// });

let queueUrl = 'https://sqs.eu-west-1.amazonaws.com/268570152715/queue23.fifo'; // Do it in redis
let urlArr = []; // Do it in redis
let maxDepth; // Do it in redis

router.post('/start-scraping', createQueue, async (req, res) => {
    try {
        // const maxPages = req.body.maxPages ? parseInt(req.body.maxPages) + 1 : Infinity;
        queueUrl = req.queueUrl;
        maxDepth = req.body.maxDepth;

        await sendMessageToQueue(queueUrl, req.body.startUrl, 0);

        const handleMessagesQueue = setInterval(() => {
            if (receiveMessagesProcessResolved.isTrue) {
                handleMessagesFromQueue(queueUrl, maxDepth, handleMessagesQueue);
                // if (isSearchDone) {
                //     clearInterval(handleMessagesQueue);
                //     console.log('Search Complete');
                // }
            }
        }, 50);

        // res.send();
    } catch (err) {
        console.log(err);
        res.status(400).send(err);
    }
});

module.exports = router;