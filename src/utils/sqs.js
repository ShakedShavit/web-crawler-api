const AWS = require("aws-sdk");

const sqs = new AWS.SQS({
    apiVersion: "2012-11-05",
    region: process.env.AWS_REGION,
});

const getFifoQueueUrl = async (QueueName) => {
    if (QueueName.slice(QueueName.length - 5) !== ".fifo") QueueName += ".fifo";
    try {
        return sqs.getQueueUrl({ QueueName }).promise();
    } catch (err) {
        throw {
            message: err.message,
            code: err.code,
        };
    }
};

const deleteQueue = async (QueueUrl) => {
    try {
        return sqs.deleteQueue({ QueueUrl }).promise();
    } catch (err) {
        throw new Error(err.message);
    }
};

module.exports = { sqs, getFifoQueueUrl, deleteQueue };
