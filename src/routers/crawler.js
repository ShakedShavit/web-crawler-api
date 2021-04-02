const express = require('express');
const Site = require('../utils/site');
const { getQueueUrl, createQueue } = require('../middleware/sqs');
const {
    sqs,
    sendMessageToQueue,
    deleteQueue,
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
let urlArr = []; // Do it in redis, maybe...

let handleMessagesQueue;

router.post('/start-scraping', getQueueUrl, createQueue, async (req, res) => {
    try {
        queueUrl = req.queueUrl;
        const maxDepth = req.body.maxDepth;
        const maxPages = req.body.maxPages ? parseInt(req.body.maxPages) : Infinity;

        await sendMessageToQueue(queueUrl, req.body.startUrl, 0);

        handleMessagesQueue = setInterval(() => {
            if (receiveMessagesProcessResolved.isTrue) {
                handleMessagesFromQueue(queueUrl, maxDepth, maxPages, clearSearchInterval);
            }
        }, 50);

        const clearSearchInterval = async () => {
            await deleteQueueSequence();
            // wait 1 sec before send so you will now everything is sent to the client (might be false sense it waits 10 sec to check that queue is in fact empty idk)
            res.send();
        }

        // res.send();
    } catch (err) {
        await deleteQueueSequence();
        res.status(400).send(err.message);
    }
});

router.get('/get-unfetched-sites', (req, res) => {
    let unFetchedSitesHolder = [ ...Site.unFetchedSites ];
    Site.unFetchedSites = [];
    res.send(unFetchedSitesHolder);
});

router.delete('/delete-queue', async (req, res) => {
    try {
        await deleteQueueSequence();
        res.send();
    } catch (err) {
        res.status(400).send(err.message);
    }
});

const deleteQueueSequence = async () => {
    clearInterval(handleMessagesQueue);
    receiveMessagesProcessResolved.isTrue = true;
    try {
        await deleteQueue(queueUrl);
    } catch (err) {
        throw new Error(err.message);
    }
}

module.exports = router;