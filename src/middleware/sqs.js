const { sqs, getFifoQueueUrl, deleteQueue } = require("../utils/sqs");

const doesQueueExist = async (req, res, next) => {
    try {
        const promise1 = getFifoQueueUrl(req.queueName + "0");
        const promise2 = getFifoQueueUrl(req.queueName + "1");

        const values = await Promise.allSettled([promise1, promise2]);
        if (values[0].status === "fulfilled" || values[0].status === "fulfilled")
            throw new Error("queue name already taken");

        next(); // If queue does not exist
    } catch (err) {
        return res.status(400).send({
            status: 400,
            message: err.message,
        });
    }
};

const createQueue = async (req, res, next) => {
    try {
        let promise1 = sqs
            .createQueue({
                QueueName: `${req.queueName}0.fifo`,
                Attributes: {
                    FifoQueue: "true",
                    // ContentBasedDeduplication: 'true'
                },
            })
            .promise();
        let promise2 = sqs
            .createQueue({
                QueueName: `${req.queueName}1.fifo`,
                Attributes: {
                    FifoQueue: "true",
                    // ContentBasedDeduplication: 'true'
                },
            })
            .promise();

        const values = await Promise.allSettled([promise1, promise2]);
        const isFirstQueueRejected = values[0].status === "rejected";
        const isSecondQueueRejected = values[1].status === "rejected";

        if (isFirstQueueRejected && !isSecondQueueRejected) {
            deleteQueue(values[1].value.QueueUrl);
            throw new Error(values[0].reason);
        } else if (!isFirstQueueRejected && isSecondQueueRejected) {
            deleteQueue(values[0].value.QueueUrl);
            throw new Error(values[0].reason);
        } else if (isFirstQueueRejected && isSecondQueueRejected) throw new Error(values[0].reason);

        req.currQueueUrl = values[0].value.QueueUrl;
        req.nextQueueUrl = values[1].value.QueueUrl;
        next();
    } catch (err) {
        if (!!req.currQueueUrl) await deleteQueue(req.currQueueUrl);

        res.status(400).send({
            status: 400,
            message: err.message,
        });
    }
};

const sendMessageToQueue = async (req, res, next) => {
    try {
        await sqs
            .sendMessage({
                QueueUrl: req.currQueueUrl,
                MessageAttributes: {
                    level: {
                        DataType: "Number",
                        StringValue: "0",
                    },
                    parentUrl: {
                        DataType: "String",
                        StringValue: "0",
                    },
                },
                MessageBody: req.rootUrl,
                MessageGroupId: "0", // Every message should have the same group ID
                MessageDeduplicationId: "0",
            })
            .promise();

        next();
    } catch (err) {
        res.status(400).send({
            status: 400,
            message: err.message,
        });
    }
};

module.exports = {
    doesQueueExist,
    createQueue,
    sendMessageToQueue,
};
