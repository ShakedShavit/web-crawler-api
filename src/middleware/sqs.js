const { sqs } = require('../utils/sqs');

const createQueue = async (req, res, next) => {
    const QueueName = 'queue5.fifo'; //
    try {
        const data = await sqs.createQueue({
            QueueName,
            Attributes: {
                FifoQueue: 'true'
            }
        }).promise();
        req.queueUrl = data.QueueUrl;

        next();
    } catch (err) {
        console.log(err);
    }
}

// const sendMessageToQueue = async (req, res, next) => {
//     const QueueUrl = req.body.queueUrl;
//     const MessageBody = req.body.messageBody;
//     const title = req.body.title;

//     try {
//         const { MessageId } = await sqs.sendMessage({
//             QueueUrl,
//             MessageAttributes: {
//                 'title': {
//                     DataType: 'String',
//                     StringValue: title
//                 }
//             },
//             MessageBody
//         }).promise();

//         req.messageId = MessageId;

//         next();
//     } catch (err) {
//         console.log(err);
//     }
// }

// const pollMessagesFromQueue = async (req, res, next) => {
//     const QueueUrl = req.body.queueUrl;

//     try {
//         const { Messages } = await sqs.receiveMessage({
//             QueueUrl,
//             MaxNumberOfMessages: 10,
//             MessageAttributeNames: [
//                 "All"
//             ],
//             VisibilityTimeout: 30,
//             WaitTimeSeconds: 10
//         }).promise();

//         req.messages = Messages || [];

//         next();

//         // Deleting the messages
//         if (Messages) {
//             const messagesDeletionFuncs = Messages.map((message) => {
//                 return sqs.deleteMessage({
//                     QueueUrl,
//                     ReceiptHandle: message.ReceiptHandle
//                 }).promise();
//             });

//             Promise.allSettled(messagesDeletionFuncs)
//                 .then(data => console.log(data));
//         }
//     } catch (err) {
//         console.log(err);
//     }
// }

const deleteQueue = async (req, res, next) => {
    const QueueUrl = req.body.queueUrl;

    try {
        await sqs.deleteQueue({ QueueUrl }).promise();
        next();
    } catch (err) {
        console.log(err);
    }
}

module.exports = {
    createQueue,
    deleteQueue
};