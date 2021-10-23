const { crawlListKey } = require("../utils/getRedisKeys");
const { getIndexOfElementInListInRedis } = require("../utils/redis");

const validateCrawlReqData = async (req, res, next) => {
    const queueName = req.body.queueName;
    let rootUrl = req.body.rootUrl;
    const maxDepth = req.body.maxDepth;
    const maxPages = req.body.maxPages;

    try {
        if (!queueName) throw new Error("missing queue name in the request");
        if (!rootUrl) throw new Error("missing message body in the request");
        if (!maxDepth && !maxPages)
            throw new Error(
                "must include either max pages or max depth in the request (both missing)"
            );

        const index = await getIndexOfElementInListInRedis(crawlListKey, queueName);
        if (index != null) throw new Error("queue name is taken");

        if (rootUrl[rootUrl.length - 1] === "/") rootUrl = rootUrl.slice(0, rootUrl.length - 1);
        req.queueName = queueName;
        req.rootUrl = rootUrl;
        req.maxDepth = maxDepth <= 0 ? null : maxDepth;
        req.maxPages = maxPages <= 0 ? null : maxPages;

        next();
    } catch (err) {
        res.status(400).send({
            status: 400,
            message: err.message,
        });
    }
};

module.exports = validateCrawlReqData;
