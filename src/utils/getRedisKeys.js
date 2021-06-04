const crawlListKey = 'crawl-name-list';

const getHashKeyForCrawl = (queueName) => {
    return `workers:${queueName}`;
}
const getPagesListKeyForCrawl = (queueName) => {
    return `pages-list:${queueName}`;
}
const getBfsUrlsListKeyForCrawl = (queueName) => {
    return `urls-bfs-list:${queueName}`;
}

module.exports = {
    crawlListKey,
    getHashKeyForCrawl,
    getPagesListKeyForCrawl,
    getBfsUrlsListKeyForCrawl
};