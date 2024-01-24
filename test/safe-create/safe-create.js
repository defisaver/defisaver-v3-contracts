/* eslint-disable max-len */
const { expect } = require('chai');
const { ethers } = require('hardhat');
const {
    predictSafeAddress,
    SAFE_MASTER_COPY_VERSIONS,
    SAFE_CONSTANTS,
    deploySafe,
    getSafeCreationArgs,
} = require('../utils-safe');
const { nullAddress } = require('../utils');

describe('Safe-Create-Test', () => {
    let deployedSafes;

    it('... should predict address and deploy Safe', async () => {
        const [signer] = await ethers.getSigners();
        const setupArgs = [
            [signer.address], // _owners - List of Safe owners.
            1, // _threshold - Number of required confirmations for a Safe transaction.
            nullAddress, // to - Contract address for optional delegate call.
            '0x', // data - Data payload for optional delegate call.
            nullAddress, // fallbackHandler - Handler for fallback calls to this contract.
            nullAddress, // paymentToken - Token that should be used for the payment (0 is ETH)
            0, // payment - Value that should be paid.
            nullAddress, // paymentReceiver - Address that should receive the payment (or 0 if tx.origin)
        ];

        const saltNonce = '0';

        deployedSafes = await Promise.all(
            Object.keys(SAFE_MASTER_COPY_VERSIONS).map(async (version) => {
                const masterCopyAddress = SAFE_MASTER_COPY_VERSIONS[version];

                const predictedAddress = await predictSafeAddress(
                    masterCopyAddress,
                    setupArgs,
                    saltNonce,
                ).then((e) => e.toLowerCase());

                const tx = await deploySafe(masterCopyAddress, setupArgs, saltNonce);

                const deployedSafe = `0x${tx.logs.find(
                    (log) => log.topics.includes(SAFE_CONSTANTS.PROXY_CREATED_TOPIC_0),
                ).topics[1].slice(26)}`;

                expect(deployedSafe).to.be.eq(predictedAddress);
                const owners = await ethers.getContractAt('ISafe', predictedAddress).then((e) => e.getOwners());
                expect(owners.length).to.be.eq(1);
                expect(owners[0]).to.be.eq(signer.address);

                return predictedAddress;
            }),
        );
    });

    it('... should fail to copy Safe deployment  the same chain', async () => {
        await Promise.all(deployedSafes.map(async (safeAddress) => {
            const { masterCopyAddress, setupArgs, saltNonce } = await getSafeCreationArgs(safeAddress);
            return expect(
                deploySafe(masterCopyAddress, setupArgs, saltNonce),
            ).to.be.reverted;
        }));
    });
});
