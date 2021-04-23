const AWS = require('aws-sdk');

const sqs = new AWS.SQS({
    apiVersion: '2012-11-05',
    region: process.env.AWS_REGION
});

const deleteQueue = async (QueueUrl) => {
    try {
        await sqs.deleteQueue({ QueueUrl }).promise();
        console.log('deleted');
    } catch (err) {
        throw new Error(err.message);
    }
}

module.exports = deleteQueue;