const {
    getHashKeyForCrawl,
    getPagesListKeyForCrawl,
    getBfsUrlsListKeyForCrawl,
    crawlListKey,
} = require("./getRedisKeys");
const {
    deleteKeysInRedis,
    getHashValuesFromRedis,
    removeElementFromListInRedis,
} = require("./redis");
const { deleteQueue } = require("./sqs");

const deleteCrawlSequence = async (queueName) => {
    // Remove queue from redis list (removes all instances of the element unless specified differently)
    let [currQueueUrl, nextQueueUrl] = await getHashValuesFromRedis(getHashKeyForCrawl(queueName), [
        "currQueueUrl",
        "nextQueueUrl",
    ]);
    const promise1 = deleteQueue(currQueueUrl);
    if (!!nextQueueUrl) await deleteQueue(nextQueueUrl);
    let keysToDeleteArr = [
        getHashKeyForCrawl(queueName),
        getPagesListKeyForCrawl(queueName),
        getBfsUrlsListKeyForCrawl(queueName),
    ];
    const promise2 = deleteKeysInRedis(keysToDeleteArr);
    const promise3 = removeElementFromListInRedis(crawlListKey, queueName);
    await Promise.allSettled([promise1, promise2, promise3]);
    console.log("crawl deleted");
};

module.exports = deleteCrawlSequence;
