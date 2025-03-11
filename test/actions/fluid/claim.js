const { expect } = require('chai');
const hre = require('hardhat');
const {
    resetForkToBlock,
    redeploy,
    impersonateAccount,
    sendEther,
    balanceOf,
    toBytes32,
    isNetworkFork,
    takeSnapshot,
    revertToSnapshot,
    getOwnerAddr,
} = require('../../utils/utils');
const { fluidClaim } = require('../../utils/actions');
const { topUp } = require('../../../scripts/utils/fork');

describe('Claim FLUID token rewards', function () {
    this.timeout(1000000);

    const safeMultisigAddr = '0xd211a02a0adde56bb7f9700f49d4ba832adc7ddf';
    const safeOwner = '0xb120f0286bD6B916BA189DF67CE292BcbB2E59c4';
    let snapshotId;
    let safe;

    before(async () => {
        const isFork = isNetworkFork();

        if (!isFork) {
            await resetForkToBlock(22018055);
        }

        if (isFork) {
            await topUp(getOwnerAddr());
            await topUp(safeOwner);
        } else {
            const zeroAddress = hre.ethers.constants.AddressZero;
            const zeroAcc = await hre.ethers.provider.getSigner(zeroAddress);
            await impersonateAccount(zeroAddress);
            await sendEther(zeroAcc, safeOwner, '5');
        }

        await redeploy('FluidClaim', isFork);

        if (!isFork) {
            await impersonateAccount(safeOwner);
        }

        const senderAcc = await hre.ethers.provider.getSigner(safeOwner);
        safe = await hre.ethers.getContractAt('ISafe', safeMultisigAddr);
        safe = safe.connect(senderAcc);

        // lower safe wallet threshold to 1
        const thresholdSlot = toBytes32(hre.ethers.utils.parseUnits('4', 0)).toString();
        const thresholdValue = toBytes32(hre.ethers.utils.parseUnits('1', 0)).toString();

        await hre.ethers.provider.send(
            isFork ? 'tenderly_setStorageAt' : 'hardhat_setStorageAt',
            [safeMultisigAddr, thresholdSlot, thresholdValue],
        );
    });

    beforeEach(async () => { snapshotId = await takeSnapshot(); });
    afterEach(async () => { await revertToSnapshot(snapshotId); });

    it('... should claim FLUID token from safe to eoa', async () => {
        const fluidMerkleDistributorAddr = '0x7060FE0Dd3E31be01EFAc6B28C8D38018fD163B0';
        const fluidToken = '0x6f40d4A6237C257fff2dB00FA0510DeEECd303eb';
        const cumulativeAmountWei = '380931207844236625217';
        const positionId = '0x9fb7b4477576fe5b32be4c1843afb1e55f251b33';
        const positionIdPadded = hre.ethers.utils.hexZeroPad(positionId, 32);
        const positionType = '1';
        const cycle = 265;
        const metadata = '0x';
        const merkleProof = [
            '0x169640cda75c35e12a13cab27f10c1423512bd1385452142ae563ab08b56a7c8',
            '0xc028340ad473b04a75e550dc9081f357f0aae2af839781bc9641991849ef6372',
            '0xfe8c5a3e310593cfe44d7a6e55cda1f680e047365b317052a8afeaae2138026f',
            '0xfd0a098e3268eda7ed84e95dbbdc6e9e2a83d620717678f43ec7efd05804898e',
            '0x8cc1c88634c1a492c4ed82480ea43b732c7964763cb68d7f9eae2d0b81b25cd8',
            '0x2645c97f360af245c4e90eff585f1592235afde9799a03de4cf1825b644e6823',
            '0x1b19c6c9ee83ac80402cd8e72b8d3dac36f24b2f26ff8a01600d50432505f4f7',
            '0xfb36d2967f68a5125e47404a2b039a6377a062660682bb47dc56c68686a355d3',
            '0x205ce71b0a0c5bbe89343b89999b620c250e4cfd30d0136871fea5e3ae491a79',
            '0xf8c3fc445730ef6ba10b859433a345e99fa16e9154e7b3f49264b151b6fe0b97',
            '0x9d4ad82c4d5a53f86259ff69e0f9aaed6bbee2e693b01fe4381d3285c0ea45e9',
            '0xb319069e7b54a0908258fb99e09730b2cec875d4f0239d0a66625ee821c99663',
            '0x5a7f0fb39d66264586c05c50a399a3e5114e3d2be77dd6381285330142df07a1',
        ];

        const balanceBefore = await balanceOf(fluidToken, safeOwner);
        await fluidClaim(
            safe,
            safeOwner,
            cumulativeAmountWei,
            positionIdPadded,
            positionType,
            cycle,
            merkleProof,
            metadata,
        );
        const balanceAfter = await balanceOf(fluidToken, safeOwner);

        const fluidMerkleDistributor = await hre.ethers.getContractAt('IFluidMerkleDistributor', fluidMerkleDistributorAddr);
        const alreadyClaimed = await fluidMerkleDistributor.claimed(safeOwner, positionIdPadded);
        const expectedAmountLeftToClaim = hre.ethers.BigNumber.from(cumulativeAmountWei)
            .sub(alreadyClaimed);

        const actualAmountClaimed = balanceAfter.sub(balanceBefore);

        console.log('Expected amount to claim:', expectedAmountLeftToClaim);
        console.log('Actual amount claimed:', actualAmountClaimed);
        expect(actualAmountClaimed).to.be.eq(expectedAmountLeftToClaim);
    });
});
