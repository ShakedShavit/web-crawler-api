const { sqs } = require('../utils/sqs');

const getQueueUrl = async (req, res, next) => {
    const QueueName = req.body.queueName;
    try {
        if (!QueueName) {
            throw new Error('Missing queue name in the request');
        }

        const data = await sqs.getQueueUrl({
            QueueName
        }).promise();

        throw new Error('Queue already exists');
    } catch (err) {
        // If it fails it means the queue does not exist (which is what you want)
        if (err.code === 'AWS.SimpleQueueService.NonExistentQueue') next();
        else {
            console.log(err.message);
            res.status(400).send({
                message: err.message
            });
        }
    }
}

const createQueue = async (req, res, next) => {
    try {
        const data = await sqs.createQueue({
            QueueName: `${req.queueName}.fifo`,
            Attributes: {
                FifoQueue: 'true',
                ContentBasedDeduplication: 'true'
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
    try {
        await sqs.sendMessage({
            QueueUrl: req.queueUrl,
            // MessageAttributes: {
            //     'level': {
            //         DataType: 'Number',
            //         StringValue: `${level}`
            //     }
            // },
            MessageBody: req.rootUrl,
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
    getQueueUrl,
    createQueue,
    sendMessageToQueue
};