const hre = require('hardhat');
const {
    getContractFromRegistry,
    addrs,
    getNetwork,
} = require('./utils');

const CollActionType = { SUPPLY: 0, WITHDRAW: 1 };
const DebtActionType = { PAYBACK: 0, BORROW: 1 };

const getLiquityV2Hints = async (market, collIndex, interestRate, isFork = false) => {
    const marketContract = await hre.ethers.getContractAt('IAddressesRegistry', market);
    const sortedTrovesAddr = await marketContract.sortedTroves();
    const sortedTrovesContract = await hre.ethers.getContractAt('contracts/interfaces/liquityV2/ISortedTroves.sol:ISortedTroves', sortedTrovesAddr);
    const trovesSize = await sortedTrovesContract.getSize();
    if (trovesSize <= 2) {
        return { upperHint: 0, lowerHint: 0 };
    }
    const numTrials = Math.floor(15 * Math.sqrt(trovesSize));
    const seed = 42;

    const regAddr = addrs[getNetwork()].REGISTRY_ADDR;
    const viewContract = await getContractFromRegistry('LiquityV2View', regAddr, false, isFork);
    const { upperHint, lowerHint } = await viewContract.getInsertPosition(
        market,
        collIndex,
        interestRate,
        numTrials,
        seed,
    );

    return { upperHint, lowerHint };
};

const getLiquityV2MaxUpfrontFee = async (
    market,
    collIndex,
    borrowAmount,
    interestRate,
    batchManager = hre.ethers.constants.AddressZero,
) => {
    const marketContract = await hre.ethers.getContractAt('IAddressesRegistry', market);
    const hintHelpersAddr = await marketContract.hintHelpers();
    const hintHelpersContract = await hre.ethers.getContractAt('contracts/interfaces/liquityV2/IHintHelpers.sol:IHintHelpers', hintHelpersAddr);

    if (batchManager !== hre.ethers.constants.AddressZero) {
        const fee = await hintHelpersContract.predictOpenTroveAndJoinBatchUpfrontFee(
            collIndex,
            borrowAmount,
            batchManager,
        );
        return fee;
    }
    const fee = await hintHelpersContract.predictOpenTroveUpfrontFee(
        collIndex,
        borrowAmount,
        interestRate,
    );
    return fee;
};

const getLiquityV2AdjustBorrowMaxUpfrontFee = async (
    market,
    collIndex,
    troveId,
    debtIncrease,
) => {
    const marketContract = await hre.ethers.getContractAt('IAddressesRegistry', market);
    const hintHelpersAddr = await marketContract.hintHelpers();
    const hintHelpersContract = await hre.ethers.getContractAt('contracts/interfaces/liquityV2/IHintHelpers.sol:IHintHelpers', hintHelpersAddr);

    const fee = await hintHelpersContract.predictAdjustTroveUpfrontFee(
        collIndex,
        troveId,
        debtIncrease,
    );
    return fee;
};

const getLiquityV2TestPairs = async () => [
    {
        market: '0x7d2d2c79ec89c7f1d718ae1586363ad2c56ded9d',
        supplyTokenSymbol: 'WETH',
        collIndex: 0,
    },
    // {
    //     market: '0x83b74f12a2894fcf7a4864eff6090d7d8a060c6b',
    //     supplyTokenSymbol: 'wstETH',
    //     collIndex: 1,
    // },
];

module.exports = {
    getLiquityV2Hints,
    getLiquityV2MaxUpfrontFee,
    getLiquityV2AdjustBorrowMaxUpfrontFee,
    getLiquityV2TestPairs,
    CollActionType,
    DebtActionType,
};
