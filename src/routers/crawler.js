const express = require('express');
const validateCrawlReqData = require('../middleware/requestValidation');
const { doesQueueExist, getQueueUrl, createQueue, sendMessageToQueue } = require('../middleware/sqs');
const {
    deleteKeysInRedis,
    setHashInRedis,
    appendElementsToListInRedis,
    removeElementFromListInRedis,
    getHashValueFromRedis
} = require('../utils/redis');
const { deleteQueue } = require('../utils/sqs');
const getAndUpdateCrawlTree = require('../utils/updateCrawlTree');

const router = new express.Router();

const redisQueueListKey = 'queue-url-list';

const getHashKeyForQueueUrl = (queueUrl) => {
    return `queue-workers:${queueUrl}`;
}
const getListKeyForQueueUrl = (queueUrl) => {
    return `pages-list:${queueUrl}`;
}

router.post('/start-scraping', validateCrawlReqData, doesQueueExist, createQueue, sendMessageToQueue, async (req, res) => {
    const queueUrl = req.queueUrl;
    const maxDepth = req.maxDepth;
    const maxPages = req.maxPages;

    const redisCrawlHashKey = getHashKeyForQueueUrl(queueUrl);
    const redisTreeListKey = getListKeyForQueueUrl(queueUrl);

    const crawlHash = {
        workersCounter: 0,
        isCrawlingDone: false,
        currentLevel: 0,
        pageCounter: 0,
        workersReachedNextLevelCounter: 0,
        tree: ''
    };

    if (!!maxDepth) crawlHash.maxDepth = maxDepth;
    if (!!maxPages) {
        crawlHash.maxPages = maxPages;
        crawlHash.pageCounter = 0;
    }

    try {
        // Deletes hash and list just in case, if they don't exist (probably won't) than it won't do anything (faster than checking first if they exist)
        let deleteKeysPromise = deleteKeysInRedis([redisCrawlHashKey, redisTreeListKey]);
        // Set the hash for this crawl that all the workers that would handle it will share
        let setHashPromise = setHashInRedis(redisCrawlHashKey, crawlHash);
        // Add queue to redis list so crawlers will find it and process it
        let appendToListPromise = appendElementsToListInRedis(redisQueueListKey, [queueUrl]);

        Promise.all([deleteKeysPromise, setHashPromise, appendToListPromise]).then((values) => {
            res.status(200).send(queueUrl);
        });
    } catch (err) {
        try {
            await removeElementFromListInRedis(redisQueueListKey, queueUrl);
        } catch (error) {
            console.log(error, '52');
            res.status(400).send(error.message);
        }

        console.log(err.message, '43');
        res.status(400).send(err.message);
    }
});

const deleteQueueSequence = async (queueUrl, redisCrawlHashKey = getHashKeyForQueueUrl(queueUrl), redisTreeListKey = getListKeyForQueueUrl(queueUrl)) => {
    let didDeletingInRedisSucceed = false;
    try {
        // Remove queue from redis list (removes all instances of the element unless specified differently)
        await removeElementFromListInRedis(redisQueueListKey, queueUrl);
        await deleteKeysInRedis([redisCrawlHashKey, redisTreeListKey]);
        didDeletingInRedisSucceed = true;
        await deleteQueue(queueUrl);
    } catch (err) {
        if (didDeletingInRedisSucceed) throw new Error('deleting queue in sqs failed');
        try {
            await deleteQueue(queueUrl);
            throw new Error('deleting related data in redis has failed');
        } catch (error) {
            throw new Error('failed to delete related data in redis, and to delete queue in sqs');
        }
    }
}

router.get('/get-tree', getQueueUrl, async (req, res) => {
    const redisCrawlHashKey = getHashKeyForQueueUrl(req.queueUrl);
    const redisTreeListKey = getListKeyForQueueUrl(req.queueUrl);

    try {
        const isCrawlingDone = await getHashValueFromRedis(redisCrawlHashKey, 'isCrawlingDone');
        // let [isCrawlingDone, treeJSON] = await getHashValuesFromRedis(redisCrawlHashKey, ['isCrawlingDone', 'tree']);

        const updatedTree = await getAndUpdateCrawlTree(redisCrawlHashKey, redisTreeListKey, 'tree');
        if (isCrawlingDone === 'true') {
            await deleteQueueSequence(req.queueUrl, redisCrawlHashKey, redisTreeListKey);
        }
        
        res.status(200).send({tree: updatedTree, isCrawlingDone});
    } catch (err) {
        console.log(err.message, '97');

        res.status(400).send({
            status: 400,
            message: err.message
        });
    }
});

router.delete('/delete-queue', getQueueUrl, async (req, res) => {
    try {
        await deleteQueueSequence(req.queueUrl);
        res.status(200).send();
    } catch (err) {
        console.log(err.message, '110');

        res.status(400).send({
            status: 400,
            message: err.message
        });
    }
});

module.exports = router;