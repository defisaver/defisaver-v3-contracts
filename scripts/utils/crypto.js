const crypto = require('crypto');

const algorithm = 'aes-256-cbc';
/** @notice Encrypt a deployment private key for storage as a hex string. */
const encrypt = (privateKey, secretKey) => {
    const hash = crypto.createHmac('sha256', secretKey).digest('hex');

    // The stored format derives both the IV and key from the password hash.
    const initVector = Buffer.from(hash).slice(0, 16);

    const securityKey = Buffer.from(hash).slice(16, 48);

    const cipher = crypto.createCipheriv(algorithm, securityKey, initVector);

    let encryptedData = cipher.update(privateKey, 'utf-8', 'hex');

    encryptedData += cipher.final('hex');
    return encryptedData;
};

/** @notice Recover the deployment private key from its encrypted hex string using the same password. */
const decrypt = (encryptedPrivateKey, secretKey) => {
    const hash = crypto.createHmac('sha256', secretKey).digest('hex');

    const initVector = Buffer.from(hash).slice(0, 16);

    const securityKey = Buffer.from(hash).slice(16, 48);

    const decipher = crypto.createDecipheriv(algorithm, securityKey, initVector);

    let decryptedData = decipher.update(encryptedPrivateKey, 'hex', 'utf-8');

    decryptedData += decipher.final('utf8');
    return decryptedData;
};

module.exports = {
    encrypt,
    decrypt,
};
