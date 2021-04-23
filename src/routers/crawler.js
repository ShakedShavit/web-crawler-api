const express = require('express');
const validateCrawlReqData = require('../middleware/requestValidation');
const { createQueue, sendMessageToQueue } = require('../middleware/sqs');
const {
    deleteKeysInRedis,
    setHashInRedis,
    appendElementsToListInRedis,
    removeElementFromListInRedis
} = require('utils/redis');
const deleteQueue = require('../utils/sqs');

const router = new express.Router();

const redisQueueListKey = 'queue-url-list';

const getHashKeyForQueueUrl = (queueUrl) => {
    return `queue-workers:${queueUrl}`;
}

router.post('/start-scraping', validateCrawlReqData, createQueue, sendMessageToQueue, async (req, res) => {
    const queueUrl = req.queueUrl;
    const maxDepth = req.maxDepth;
    const maxPages = req.maxPages;

    const redisCrawlHashKey = getHashKeyForQueueUrl(queueUrl);

    const crawlHash = {
        workersCounter: 0,
        isCrawlingDone: false,
        currentLevel: 0,
        pageCounter: 0,
        workersReachedNextLevelCounter: 0,
    };

    if (!!maxDepth) crawlHash.maxDepth = maxDepth;
    if (!!maxPages) {
        crawlHash.maxPages = maxPages;
        crawlHash.pageCounter = 0;
    }

    try {
        // Deletes hash and list just in case, if they don't exist (probably won't) than it won't do anything (faster than checking first if they exist)
        await deleteKeysInRedis(redisCrawlHashKey);
        // Set the hash for this crawl that all the workers that would handle it will share
        await setHashInRedis(redisCrawlHashKey, crawlHash);
        // Add queue to redis list so crawlers will find it and process it
        await appendElementsToListInRedis(redisQueueListKey, [queueUrl]);

        res.status(200).send(queueUrl);
    } catch (err) {
        try {
            await removeElementFromListInRedis(redisQueueListKey, redisCrawlHashKey);
        } catch (error) {
            console.log(error, '52');
            res.status(400).send(error.message);
        }

        console.log(err.message, '43');
        res.status(400).send(err.message);
    }
});

const deleteQueueSequence = async (queueUrl) => {
    const redisCrawlHashKey = getHashKeyForQueueUrl(queueUrl);
    let didDeleteQueueInRedisList = false;
    try {
        // Remove queue from redis list (removes all instances of the element unless specified differently)
        await removeElementFromListInRedis(redisQueueListKey, redisCrawlHashKey);
        didDeleteQueueInRedisList = true;
        await deleteQueue(queueUrl);
    } catch (err) {
        if (didDeleteQueueInRedisList) throw new Error('deleting queue in sqs failed');
        try {
            await deleteQueue(queueUrl);
            throw new Error('removing queue from queue list in redis has failed');
        } catch (error) {
            throw new Error('failed to delete queue from redis list and in sqs');
        }
    }
}

router.get('/get-tree', async (req, res) => {
    const queueUrl = req.body.queueUrl;
    const redisCrawlHashKey = getHashKeyForQueueUrl(queueUrl);

    try {
        if (!queueUrl) throw new Error('missing queue url in the request');
        
        const [isCrawlingDone, treeJSON] = await getHashValuesFromRedis(redisCrawlHashKey, ['isCrawlingDone', 'tree']);

        if (isCrawlingDone) {
            await deleteQueueSequence(queueUrl);
        }

        res.status(200).send({tree: treeJSON, isCrawlingDone});
    } catch (err) {
        console.log(err.message, '97');

        res.status(400).send({
            status: 400,
            message: error.message
        });
    }
});

router.delete('/delete-queue', async (req, res) => {
    const queueUrl = req.body.queueUrl;
    try {
        if (!queueUrl) throw new Error('missing queue url in the request');
        await deleteQueueSequence(queueUrl);
    } catch (err) {
        console.log(err.message, '110');

        res.status(400).send({
            status: 400,
            message: error.message
        });
    }
});

module.exports = router;