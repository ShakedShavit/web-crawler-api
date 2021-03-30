const AWS = require('aws-sdk');
const getAllLinksInPage = require('./cheerio');

const sqs = new AWS.SQS({
    apiVersion: '2012-11-05',
    region: process.env.AWS_REGION
});

const sendMessageToQueue = async (QueueUrl, url, level) => {
    console.log(url, level);
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
            // MessageDeduplicationId: `${url}`,  // Required for FIFO queues
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
            // AttributeNames: [
            //     "All"
            // ],
            VisibilityTimeout: 30,
            WaitTimeSeconds: 10
        }).promise();

        return Messages || [];
    } catch (err) {
        console.log(err);
        throw new Error(err);
    }
}

const deleteMessagesFromQueue = async (QueueUrl, messages) => {
    try {
        const messagesDeletionFuncs = messages.map((message) => {
            return sqs.deleteMessage({
                QueueUrl,
                ReceiptHandle: message.ReceiptHandle
            }).promise();
        });
        Promise.allSettled(messagesDeletionFuncs)
            .then(data => console.log(data))
            .catch(err => { throw new Error(err) });
    } catch (err) {
        console.log(err);
        throw new Error(err);
    }
}


let receiveMessagesProcessResolved = { isTrue: true };

const handleMessagesFromQueue = async (queueUrl, maxDepth, searchInterval) => {
    receiveMessagesProcessResolved.isTrue = false;
    try {
        const messages = await pollMessagesFromQueue(queueUrl);

        if (messages.length === 0) {
            clearInterval(searchInterval);
            console.log('Search Complete');
            return;
        }

        console.log('new poll batch');

        for (let message of messages) {
            console.log();
            console.log('message');
            let currentMessageLevel = parseInt(message.MessageAttributes.level.StringValue);
            if (currentMessageLevel >= maxDepth) break;

            let links = await getAllLinksInPage(message.Body);

            for (let link of links) {
                await sendMessageToQueue(queueUrl, link, currentMessageLevel + 1);
            }
        }

        await deleteMessagesFromQueue(queueUrl, messages);

        receiveMessagesProcessResolved.isTrue = true;

        return false;
    } catch (err) {
        console.log(err);
        receiveMessagesProcessResolved.isTrue = true;
    }
}

module.exports = {
    sqs,
    sendMessageToQueue,
    handleMessagesFromQueue,
    receiveMessagesProcessResolved
};