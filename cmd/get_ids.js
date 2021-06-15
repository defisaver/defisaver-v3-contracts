/* eslint-disable import/no-extraneous-dependencies */
const ethers = require('ethers');

// const { actionAddresses } = require('@defisaver/sdk')

// const actionNames = Object.keys(actionAddresses);
// const actionAddr = Object.values(actionAddresses);

// actionNames.forEach((action, i) => {
//     const id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(action));

//     console.log(action, " : ", id, " : ", actionAddr[i]);
// });

const id = ethers.utils.keccak256(ethers.utils.toUtf8Bytes('LiquityClose'));

console.log(id);
