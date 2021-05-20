const redisClient = require('../db/redis');

const deleteKeysInRedis = async (keysArr) => {
    try {
        await redisClient.delAsync(...keysArr);
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

const doesKeyExistInRedis = async (key) => {
    try {
        const doesKeyExist = await redisClient.existsAsync(key);
        return doesKeyExist;
    } catch (err) {
        throw new Error(err.message);
    }
}

const setHashStrValInRedis = async (hashKey, field, value) => {
    try {
        const doesKeyExist = await doesKeyExistInRedis(hashKey);
        if (!doesKeyExist) throw new Error('key does not exist in redis');

        if (typeof value !== 'string') throw new Error(`value's type must be string. value (${value}) input is of type ${typeof value}`);

        await redisClient.hsetAsync(hashKey, field, value);
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

const getElementsFromListInRedis = async (key, start = 0, end = -1) => {
    try {
        return await redisClient.lrangeAsync(key, start, end);
    } catch (err) {
        throw new Error(err.message);
    }
}

const trimListInRedis = async (key, start = 0, end = -1) => {
    try {
        await redisClient.ltrimAsync(key, start, end);
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

const getHashValueFromRedis = async (hashKey, field) => {
    try {
        return await redisClient.hgetAsync(hashKey, field);
    } catch (err) {
        throw new Error(err.message);
    }
}

const getHashValuesFromRedis = async (hashKey, fieldsArr) => {
    try {
        return await redisClient.hmgetAsync(hashKey, ...fieldsArr);
    } catch (err) {
        throw new Error(err.message);
    }
}

module.exports = {
    deleteKeysInRedis,
    setHashInRedis,
    setHashStrValInRedis,
    appendElementsToListInRedis,
    getElementsFromListInRedis,
    trimListInRedis,
    removeElementFromListInRedis,
    getHashValueFromRedis
}