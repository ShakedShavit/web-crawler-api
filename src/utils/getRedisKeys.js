const crawlListKey = "crawl-name-list";
const getHashKeyForCrawl = (queueName) => `workers:${queueName}`;
const getPagesListKeyForCrawl = (queueName) => `pages-list:${queueName}`;
const getBfsUrlsListKeyForCrawl = (queueName) => `urls-bfs-list:${queueName}`;

module.exports = {
    crawlListKey,
    getHashKeyForCrawl,
    getPagesListKeyForCrawl,
    getBfsUrlsListKeyForCrawl,
};
