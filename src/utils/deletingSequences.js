const {
    getHashKeyForCrawl,
    getPagesListKeyForCrawl,
    getBfsUrlsListKeyForCrawl
} = require('./getRedisKeys');
const {
    deleteKeysInRedis,
    getHashValuesFromRedis
} = require('./redis');
const {
    deleteQueue
} = require('./sqs');

const deleteCrawlSequence = async (queueName) => {
    // Remove queue from redis list (removes all instances of the element unless specified differently)
    let [currQueueUrl, nextQueueUrl] = await getHashValuesFromRedis(getHashKeyForCrawl(queueName), ['currQueueUrl', 'nextQueueUrl']);
    const promise1 = deleteQueue(currQueueUrl);
    if (!!nextQueueUrl) await deleteQueue(nextQueueUrl);
    let keysToDeleteArr = [getHashKeyForCrawl(queueName), getPagesListKeyForCrawl(queueName), getBfsUrlsListKeyForCrawl(queueName)];
    const promise2 = deleteKeysInRedis(keysToDeleteArr);
    await Promise.allSettled([promise1, promise2]);
    console.log('crawl deleted');
}

module.exports = deleteCrawlSequence;