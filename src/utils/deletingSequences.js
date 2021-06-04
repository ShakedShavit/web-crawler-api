const {
    crawlListKey,
    getHashKeyForCrawl,
    getPagesListKeyForCrawl,
    getBfsUrlsListKeyForCrawl
} = require('./getRedisKeys');
const {
    deleteKeysInRedis,
    setHashValuesInRedis,
    getHashValuesFromRedis,
    removeElementFromListInRedis
} = require('./redis');
const {
    createQueue,
    deleteQueue
} = require('./sqs');

const deleteCrawlSequence = async (queueName) => {
    // Remove queue from redis list (removes all instances of the element unless specified differently)
    // const promise1 = removeElementFromListInRedis(crawlListKey, queueName);
    let [currQueueUrl, nextQueueUrl] = await getHashValuesFromRedis(getHashKeyForCrawl(queueName), ['currQueueUrl', 'nextQueueUrl']);
    const promise1 = deleteQueue(currQueueUrl);
    if (!!nextQueueUrl) await deleteQueue(nextQueueUrl);
    let keysToDeleteArr = [getHashKeyForCrawl(queueName), getPagesListKeyForCrawl(queueName), getBfsUrlsListKeyForCrawl(queueName)];
    const promise2 = deleteKeysInRedis(keysToDeleteArr);
    await Promise.allSettled([promise1, promise2]);
    console.log('crawl deleted');
}

const crawlReachedNextLevel = async (queueName) => {
    const crawlHashKey = getHashKeyForCrawl(queueName);
    let [currentLevel, currQueueUrl, nextQueueUrl, maxDepth, currLvlLinksLen, nextLvlLinksLen] = await getHashValuesFromRedis(crawlHashKey, ['currentLevel', 'currQueueUrl', 'nextQueueUrl', 'maxDepth', 'currLvlLinksLen', 'nextLvlLinksLen']);
    currentLevel = parseInt(currentLevel);
    currLvlLinksLen = parseInt(currLvlLinksLen);
    nextLvlLinksLen = parseInt(nextLvlLinksLen);
    console.log(currentLevel, currQueueUrl, nextQueueUrl, maxDepth, currLvlLinksLen, nextLvlLinksLen, '37\n\n');

    const newLevel = currentLevel + 1;
    let shouldCreateQueue = true;
    console.log(newLevel > parseInt(maxDepth), newLevel, parseInt(maxDepth), '41');
    if (!!maxDepth && maxDepth !== "null") {
        if (newLevel > parseInt(maxDepth)) {
            // await deleteCrawlSequence(queueName);
            return true;
        }
        if (newLevel === parseInt(maxDepth)) shouldCreateQueue = false;
    }

    deleteQueue(currQueueUrl);
    let newQueue = '';
    if (shouldCreateQueue) newQueue = await createQueue(queueName, newLevel + 1);
    await setHashValuesInRedis(crawlHashKey, ['currentLevel', newLevel, 'currQueueUrl', nextQueueUrl, 'nextQueueUrl', newQueue, 'currLvlLinksLen', nextLvlLinksLen, 'nextLvlLinksLen', 0]);

    return false;
}

module.exports = {
    deleteCrawlSequence,
    crawlReachedNextLevel
};