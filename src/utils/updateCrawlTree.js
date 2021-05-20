const {
    getHashValueFromRedis,
    setHashStrValInRedis,
    getElementsFromListInRedis,
    trimListInRedis
} = require('./redis');

// Add new page obj directly to JSON formatted tree (without parsing it)
const getUpdatedJsonTree = (treeJSON, newPageObj, parentUrl) => {
    let newPageJSON = JSON.stringify(newPageObj);
    let searchString = `${parentUrl}","children":[`;
    let insertIndex = treeJSON.indexOf(searchString);
    if (insertIndex === -1) return newPageJSON; // If the tree is empty (first page insertion)
    insertIndex += searchString.length;
    if (treeJSON[insertIndex] === '{') newPageJSON += ',';
    return treeJSON.slice(0, insertIndex) + newPageJSON + treeJSON.slice(insertIndex);
}

const addNewPageToTree = (pageJSON, treeJSON) => {
    let pageObj = JSON.parse(pageJSON);
    if (pageObj.level === 3) console.log(pageObj);
    let isUrlInTree = treeJSON.includes(`,"url":"${pageObj.url}"`);
    if (isUrlInTree) delete pageObj.children;
    let parentUrl = pageObj.parentUrl;
    delete pageObj.parentUrl;

    return getUpdatedJsonTree(treeJSON, pageObj, parentUrl);
}

const getAndUpdateCrawlTree = async (queueRedisHashKey, redisTreeListKey, treeQueueField) => {
    return new Promise(async (resolve, reject) => {
        try {
            let getPagesPromise = getElementsFromListInRedis(redisTreeListKey, 0, -1);
            let getTreePromise = getHashValueFromRedis(queueRedisHashKey, treeQueueField);
            Promise.allSettled([getPagesPromise, getTreePromise]).then(async (results) => {
                let newPages = results[0].value;
                let treeJSON = results[1].value;

                const isPagesListEmpty = newPages.length === 0;
                let trimListPromise = trimListInRedis(redisTreeListKey, newPages.length, -1);

                for (page of newPages) {
                    treeJSON = addNewPageToTree(page, treeJSON);
                }

                if (!isPagesListEmpty) await setHashStrValInRedis(queueRedisHashKey, treeQueueField, treeJSON)

                trimListPromise.then(res => {
                    resolve(treeJSON);
                });
            });
        } catch (err) {
            console.log(err.message, '60');
            reject(err);
        }
    });
}

module.exports = getAndUpdateCrawlTree;