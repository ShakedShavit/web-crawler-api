const express = require("express");
const validateCrawlReqData = require("../middleware/requestValidation");
const { doesQueueExist, createQueue, sendMessageToQueue } = require("../middleware/sqs");
const {
    deleteKeysInRedis,
    setHashInRedis,
    appendElementsToListInRedis,
    removeElementFromListInRedis,
    getHashValuesFromRedis,
} = require("../utils/redis");
const deleteCrawlSequence = require("../utils/deletingSequences");
const {
    crawlListKey,
    getHashKeyForCrawl,
    getPagesListKeyForCrawl,
    getBfsUrlsListKeyForCrawl,
} = require("../utils/getRedisKeys");

const router = new express.Router();

router.post(
    "/start-scraping",
    validateCrawlReqData,
    doesQueueExist,
    createQueue,
    sendMessageToQueue,
    async (req, res) => {
        const { currQueueUrl, nextQueueUrl, queueName, maxDepth, maxPages } = req;
        const redisCrawlHashKey = getHashKeyForCrawl(queueName);
        const redisTreeListKey = getPagesListKeyForCrawl(queueName);
        const redisBfsUrlsListKey = getBfsUrlsListKeyForCrawl(queueName);
        const crawlHash = {
            isCrawlingDone: false,
            currentLevel: 0,
            pageCounter: 0,
            lvlPageCounter: 0,
            currLvlLinksLen: 1,
            nextLvlLinksLen: 0,
            currQueueUrl,
            nextQueueUrl,
            tree: "",
        };
        if (!!maxDepth) crawlHash.maxDepth = maxDepth;
        if (!!maxPages) crawlHash.maxPages = maxPages;

        try {
            // Deletes hash and list just in case, if they don't exist (probably won't) than it won't do anything (faster than checking first if they exist)
            let deleteKeysPromise = deleteKeysInRedis([
                redisCrawlHashKey,
                redisTreeListKey,
                redisBfsUrlsListKey,
            ]);
            // Set the hash for this crawl that all the workers that would handle it will share
            let setHashPromise = setHashInRedis(redisCrawlHashKey, crawlHash);
            // Add queue to redis list so crawlers will find it and process it
            let appendToCrawlsListPromise = appendElementsToListInRedis(crawlListKey, [queueName]);
            // Add first parentUrl to urls bfs queue
            let appendToBfsListPromise = appendElementsToListInRedis(redisBfsUrlsListKey, [
                JSON.stringify({
                    url: "0",
                    linksLength: 1,
                    childrenCounter: 0,
                }),
            ]);

            await Promise.all([
                deleteKeysPromise,
                setHashPromise,
                appendToCrawlsListPromise,
                appendToBfsListPromise,
            ]).then((values) => {
                console.log(values[1]);
                res.status(200).send();
            });
        } catch (err) {
            try {
                await removeElementFromListInRedis(crawlListKey, queueName);
            } catch (error) {
                res.status(400).send(error.message);
            }
            res.status(400).send(err.message);
        }
    }
);

router.get("/get-tree", async (req, res) => {
    try {
        let hashKey = getHashKeyForCrawl(req.query.queueName);
        let [isCrawlingDone, tree] = await getHashValuesFromRedis(hashKey, [
            "isCrawlingDone",
            "tree",
        ]);
        isCrawlingDone = isCrawlingDone === "true";
        if (isCrawlingDone) await deleteCrawlSequence(req.query.queueName);

        res.status(200).send({
            tree,
            isCrawlingDone,
        });
    } catch (err) {
        res.status(400).send({
            status: 400,
            message: err.message,
        });
    }
});

router.delete("/delete-queue", async (req, res) => {
    try {
        await deleteCrawlSequence(req.query.queueName);
        res.status(200).send();
    } catch (err) {
        res.status(400).send({
            status: 400,
            message: err.message,
        });
    }
});

module.exports = router;
