const { expect } = require('chai');
const hre = require('hardhat');
const dfs = require('@defisaver/sdk');

const {
    getAddrFromRegistry,
    getProxy,
    redeploy,
    balanceOf,
    setBalance,
    ADAI_ADDR,
    DAI_ADDR,
} = require('../utils');

describe('Pull-Token-Permit', function () {
    this.timeout(80000);

    let senderAcc; let proxy;

    before(async () => {
        await redeploy('PermitPullToken');

        senderAcc = (await hre.ethers.getSigners())[0];
        proxy = await getProxy(senderAcc.address);
    });
    it('... should pull 1000 aDAI with permit - direct action', async () => {
        const amount = hre.ethers.utils.parseUnits('1000', 18);
        // this will work for years, current timestamp = 1743034755
        const deadline = '91743034755';

        const domain = {
            name: 'Aave interest bearing DAI',
            version: '1',
            chainId: 1,
            verifyingContract: '0x028171bCA77440897B824Ca71D1c56caC55b68A3',
        };
        const types = {
            Permit: [
                { name: 'owner', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint256' },
            ],
        };
        const aDaiContract = await hre.ethers.getContractAt('IERC20WithPermit', ADAI_ADDR);
        // eslint-disable-next-line no-underscore-dangle
        const nonce = await aDaiContract._nonces(senderAcc.address);
        const value = {
            owner: senderAcc.address,
            spender: proxy.address,
            value: amount,
            nonce,
            deadline,
        };
        // eslint-disable-next-line no-underscore-dangle
        const rawSignature = await senderAcc._signer._signTypedData(domain, types, value);
        console.log(rawSignature.toString());
        const signatureSplitted = hre.ethers.utils.splitSignature(rawSignature);
        console.log(signatureSplitted);
        const r = signatureSplitted.r;
        const s = signatureSplitted.s;
        const v = signatureSplitted.v;
        await setBalance(ADAI_ADDR, senderAcc.address, amount);

        const pullTokenAddr = await getAddrFromRegistry('PermitPullToken');

        const proxyBalanceBefore = await balanceOf(ADAI_ADDR, proxy.address);
        const pullTokenAction = new dfs.actions.basic.PermitPullTokenAction(
            ADAI_ADDR, senderAcc.address, amount, deadline, v, r, s,
        );
        const pullTokenData = pullTokenAction.encodeForDsProxyCall()[1];

        await proxy['execute(address,bytes)'](pullTokenAddr, pullTokenData);
        const proxyBalanceAfter = await balanceOf(ADAI_ADDR, proxy.address);

        console.log(proxyBalanceBefore.toString());
        console.log(proxyBalanceAfter.toString());

        expect(proxyBalanceAfter).to.be.gt(proxyBalanceBefore);
    });
    it('... should pull 1000 DAI with permit - direct action', async () => {
        const amount = hre.ethers.utils.parseUnits('1000', 18);
        const deadline = 0;

        const domain = {
            name: 'Dai Stablecoin',
            version: '1',
            chainId: 1,
            verifyingContract: DAI_ADDR,
        };
        const types = {
            Permit: [
                { name: 'holder', type: 'address' },
                { name: 'spender', type: 'address' },
                { name: 'nonce', type: 'uint256' },
                { name: 'expiry', type: 'uint256' },
                { name: 'allowed', type: 'bool' },
            ],
        };
        const daiContract = await hre.ethers.getContractAt('IERC20WithPermit', DAI_ADDR);
        const nonce = await daiContract.nonces(senderAcc.address);
        const value = {
            holder: senderAcc.address,
            spender: proxy.address,
            nonce,
            expiry: deadline,
            allowed: true,
        };
        // eslint-disable-next-line no-underscore-dangle
        const rawSignature = await senderAcc._signer._signTypedData(domain, types, value);
        console.log(rawSignature.toString());
        const signatureSplitted = hre.ethers.utils.splitSignature(rawSignature);
        console.log(signatureSplitted);
        const r = signatureSplitted.r;
        const s = signatureSplitted.s;
        const v = signatureSplitted.v;
        await setBalance(DAI_ADDR, senderAcc.address, amount);

        const pullTokenAddr = await getAddrFromRegistry('PermitPullToken');

        const proxyBalanceBefore = await balanceOf(DAI_ADDR, proxy.address);
        const pullTokenAction = new dfs.actions.basic.PermitPullTokenAction(
            DAI_ADDR, senderAcc.address, amount, deadline, v, r, s,
        );
        const pullTokenData = pullTokenAction.encodeForDsProxyCall()[1];

        await proxy['execute(address,bytes)'](pullTokenAddr, pullTokenData);
        const proxyBalanceAfter = await balanceOf(DAI_ADDR, proxy.address);

        console.log(proxyBalanceBefore.toString());
        console.log(proxyBalanceAfter.toString());

        expect(proxyBalanceAfter).to.be.gt(proxyBalanceBefore);
    });
});
