const redisClient = require('../db/redis');

const deleteKeysInRedis = async () => {
    try {
        await redisClient.delAsync(...arguments);
    } catch (err) {
        throw new Error(err.message);
    }
}

const setHashInRedis = async (key, hash) => {
    const hashArray = [];
    for (let [k, v] of Object.entries(hash)) {
        hashArray.push(k);
        hashArray.push(v);
    }

    try {
        await redisClient.hmsetAsync(key, hashArray);
    } catch (err) {
        throw new Error(err.message);
    }
}

const appendElementsToListInRedis = async (key, elementsArr) => {
    try {
        await redisClient.rpushAsync(key, ...elementsArr);
    } catch (err) {
        throw new Error(err.message);
    }
}

const removeElementFromListInRedis = async (key, element, count = 0) => {
    try {
        await redisClient.lremAsync(key, count, element);
    } catch (err) {
        throw new Error(err.message);
    }
}

const getHashValuesFromRedis = async (hashKey, fieldsArr) => {
    try {
        const values = await redisClient.hmgetAsync(hashKey, ...fieldsArr);
        console.log(values, '9');
        return values;
    } catch (err) {
        console.log(err.message, '12');
        throw new Error(err.message);
    }
}

module.exports = {
    deleteKeysInRedis,
    setHashInRedis,
    appendElementsToListInRedis,
    removeElementFromListInRedis,
    getHashValuesFromRedis
}