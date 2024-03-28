const hre = require('hardhat');
const { expect } = require('chai');
const {
    takeSnapshot, revertToSnapshot, getProxy, redeploy,
} = require('../../utils');
const {
    MORPHO_BLUE_ADDRESS,
} = require('../utils');
const { morphoBlueSetAuthWithSig } = require('../../actions');
const { chainIds } = require('../../../scripts/utils/fork');

describe('Morpho-Blue-SetAuthWithSig', function () {
    this.timeout(80000);

    let senderAcc; let proxy; let snapshot;

    before(async () => {
        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
        snapshot = await takeSnapshot();
        await redeploy('MorphoBlueSetAuthWithSig');
    });
    beforeEach(async () => {
        snapshot = await takeSnapshot();
    });
    afterEach(async () => {
        await revertToSnapshot(snapshot);
    });
    it('should change auth setup with signature', async () => {
        const morphoBlue = await hre.ethers.getContractAt('IMorphoBlue', MORPHO_BLUE_ADDRESS);
        const nonce = await morphoBlue.nonce(senderAcc.address);
        const network = hre.network.config.name;
        const chainId = chainIds[network];
        const deadline = '2015495230';
        const signature = hre.ethers.utils.splitSignature(
            // @dev - _signTypedData will be renamed to signTypedData in future ethers versions
            // eslint-disable-next-line no-underscore-dangle
            await senderAcc._signTypedData(
                {
                    chainId,
                    verifyingContract: morphoBlue.address,
                },
                {
                    Authorization: [
                        {
                            name: 'authorizer',
                            type: 'address',
                        },
                        {
                            name: 'authorized',
                            type: 'address',
                        },
                        {
                            name: 'isAuthorized',
                            type: 'bool',
                        },
                        {
                            name: 'nonce',
                            type: 'uint256',
                        },
                        {
                            name: 'deadline',
                            type: 'uint256',
                        },
                    ],
                },
                {
                    authorizer: senderAcc.address,
                    authorized: proxy.address,
                    isAuthorized: true,
                    nonce,
                    deadline,
                },
            ),
        );
        expect(await morphoBlue.isAuthorized(senderAcc.address, proxy.address)).to.be.eq(false);
        await morphoBlueSetAuthWithSig(
            proxy,
            senderAcc.address,
            proxy.address,
            true,
            nonce,
            deadline,
            signature.v,
            signature.r,
            signature.s,
        );
        expect(await morphoBlue.isAuthorized(senderAcc.address, proxy.address)).to.be.eq(true);
    });
});
