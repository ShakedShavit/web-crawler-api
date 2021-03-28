const express = require('express');
const Site = require('../utils/site');
const { createQueue } = require('../middleware/sqs');
const { sqs, sendMessageToQueue, pollMessagesFromQueue } = require('../utils/sqs');
const cheerio = require('cheerio');
const fetch = require('node-fetch');
const urlJoin = require('url-join');

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

let queueUrl = 'https://sqs.eu-west-1.amazonaws.com/268570152715/queue5.fifo';
let handleMessagesInSqsInterval;

const handleMessagesFromQueue = async () => {
    try {
        const messages = await pollMessagesFromQueue(queueUrl);

        for (message of messages) {
            const res = await fetch(message.Body);
            const html = await res.text();
            const $ = cheerio.load(html);
    
            const links = [];
            $('a').each((index, element) => {
                let hrefVal = $(element).attr('href');
                if (!!hrefVal && (hrefVal[0] === '/' || hrefVal.slice(0, 2) === './')) {
                    hrefVal = urlJoin(this.url, hrefVal);
                    hrefVal = hrefVal.replace('/./', '/');
                    hrefVal = hrefVal.replace('./', '/');
                }
                else if (hrefVal == undefined || hrefVal.slice(0, 4) !== 'http') return;
    
                links.push(hrefVal);
            });
    
            for (let i = 0; i < links.length; i++) {
                await sendMessageToQueue(queueUrl, links[i], parseInt(message.MessageAttributes.level.StringValue) + 1, i);
            }
        }

        // Deleting the messages
        const messagesDeletionFuncs = messages.map((message) => {
            return sqs.deleteMessage({
                QueueUrl: queueUrl,
                ReceiptHandle: message.ReceiptHandle
            }).promise();
        });
        Promise.allSettled(messagesDeletionFuncs)
            .then(data => console.log(data));
// For some reason it does not seem to be working
    } catch (err) {
console.log(err);
    }
}

router.post('/start-scraping', async (req, res) => {
    try {
        // const maxPages = req.body.maxPages ? parseInt(req.body.maxPages) + 1 : Infinity;
    
        // queueUrl = req.queueUrl;

        await sendMessageToQueue(queueUrl, req.body.startUrl, 0, 0);

        // handleMessagesInSqsInterval = setInterval(async () => {
        //     try {
        //         await handleMessagesFromQueue();
        //     } catch (err) {
        //         console.log(err);
        //     }
        // }, 2000);
        await handleMessagesFromQueue();
        
        res.send();
    } catch (err) {
        console.log(err);
        res.status(400).send(err);
    }
});

module.exports = router;