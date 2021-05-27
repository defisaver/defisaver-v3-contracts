const hre = require('hardhat');

const web3 = require('web3');

const ethSigUtil = require('eth-sig-util');

const { addBotCaller } = require('../utils-strategies.js');

const { getProxy, redeploy, send } = require('../utils');

describe('Limit-Order', function () {
    this.timeout(80000);

    let senderAcc;
    let botAcc;
    let proxy;
    let strategyExecutor;

    before(async () => {
        // await redeploy('ProxyAuth');
        // await redeploy('Subscriptions');
        // await redeploy('SubscriptionProxy');
        // await redeploy('TaskExecutor');
        // strategyExecutor = await redeploy('StrategyExecutor');

        senderAcc = (await hre.ethers.getSigners())[0];
        botAcc = (await hre.ethers.getSigners())[1];

        await addBotCaller(botAcc.address);

        proxy = await getProxy(senderAcc.address);
    });

    it('... should make a new one time limit order strategy', async () => {
        const typedData = {
            types: {
                EIP712Domain: [
                    { name: 'name', type: 'string' },
                    { name: 'version', type: 'string' },
                    { name: 'chainId', type: 'uint256' },
                    { name: 'verifyingContract', type: 'address' },
                ],
                Person: [
                    { name: 'name', type: 'string' },
                    { name: 'mother', type: 'Person' },
                    { name: 'father', type: 'Person' },
                ],
            },
            domain: {
                name: 'Family Tree',
                version: '1',
                chainId: 1,
                verifyingContract: '0xCcCCccccCCCCcCCCCCCcCcCccCcCCCcCcccccccC',
            },
            message: {
                name: 'Jon',
                mother: {
                    name: 'Lyanna',
                    father: {
                        name: 'Rickard',
                    },
                },
                father: {
                    name: 'Rhaegar',
                    father: {
                        name: 'Aeris II',
                    },
                },
            },
        };

        const privKeyHex = 'ac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';
        const privateKeyBuffer = Buffer.from(privKeyHex, 'hex');

        console.log(privateKeyBuffer);

        const signature = ethSigUtil.signTypedMessage(privKeyHex, { data: typedData }, 'V2');

        console.log(signature);

        // await strategyExecutor.executeOneTime(strategyDataHash, signedData, senderAcc.address);
    });
});
