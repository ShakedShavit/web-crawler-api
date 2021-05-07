const { sqs, getFifoQueueUrl } = require('../utils/sqs');

const doesQueueExist = async (req, res, next) => {
    try {
        await getFifoQueueUrl(req.queueName);

        throw new Error('queue already exists');
    } catch (err) {
        if (err.code !== 'AWS.SimpleQueueService.NonExistentQueue') {
            console.log(err.message, '14');
            return res.status(400).send({
                status: 400,
                message: err.message
            });
        }
        else next(); // If queue does not exist
    }
}

const getQueueUrl = async (req, res, next) => {
    const queueName = req.query.queueName;
    try {
        if (!queueName) throw new Error('missing queue name in the request');
        req.queueName = queueName;
        req.queueUrl = await getFifoQueueUrl(queueName);
        next();
    } catch (err) {
        let errMessage = err.message;
        if (err.code === 'AWS.SimpleQueueService.NonExistentQueue') errMessage = 'queue does not exist';
        console.log(err, '32');
        res.status(400).send({
            status: 400,
            message: errMessage
        });
    }
}

const createQueue = async (req, res, next) => {
    try {
        const data = await sqs.createQueue({
            QueueName: `${req.queueName}.fifo`,
            Attributes: {
                FifoQueue: 'true',
                // ContentBasedDeduplication: 'true'
            }
        }).promise();
        req.queueUrl = data.QueueUrl; // Do this in redis

        next();
    } catch (err) {
        console.log(err.message);
        res.status(400).send({
            status: 400,
            message: err.message
        });
    }
}

const sendMessageToQueue = async (req, res, next) => {
    let MessageDeduplicationId = `${req.rootUrl},0,0`;
    deduplicationLength = MessageDeduplicationId.length;
    if (deduplicationLength > 128) MessageDeduplicationId = MessageDeduplicationId.slice(deduplicationLength - 128);
    try {
        await sqs.sendMessage({
            QueueUrl: req.queueUrl,
            MessageAttributes: {
                'level': {
                    DataType: 'Number',
                    StringValue: '0'
                },
                'parentUrl': {
                    DataType: 'String',
                    StringValue: '0'
                }
            },
            MessageBody: req.rootUrl,
            MessageDeduplicationId,
            MessageGroupId: '0' // Root url level is 0
        }).promise();

        next();
    } catch (err) {
        console.log(err);
        res.status(400).send({
            status: 400,
            message: err.message
        });
    }
}

module.exports = {
    doesQueueExist,
    getQueueUrl,
    createQueue,
    sendMessageToQueue
};