const AWS = require('aws-sdk');

const sqs = new AWS.SQS({
    apiVersion: '2012-11-05',
    region: process.env.AWS_REGION
});

const sendMessageToQueue = async (QueueUrl, url, level, index) => {
    console.log(url);
    try {
        const { MessageId } = await sqs.sendMessage({
            QueueUrl,
            MessageAttributes: {
                'level': {
                    DataType: 'Number',
                    StringValue: `${level}`
                }
            },
            MessageBody: url,
            MessageDeduplicationId: `${level},${index}`,  // Required for FIFO queues
            MessageGroupId: `${level}`  // Required for FIFO queues
        }).promise();

        return MessageId;
    } catch (err) {
        console.log(err);
        throw new Error(err);
    }
}

const pollMessagesFromQueue = async (QueueUrl) => {
    try {
        const { Messages } = await sqs.receiveMessage({
            QueueUrl,
            MaxNumberOfMessages: 10,
            MessageAttributeNames: [
                "All"
            ],
            VisibilityTimeout: 30,
            WaitTimeSeconds: 10
        }).promise();

        return Messages || [];
    } catch (err) {
        console.log(err);
        throw new Error(err);
    }
}

module.exports = {
    sqs,
    sendMessageToQueue,
    pollMessagesFromQueue
};