/* eslint-disable array-callback-return */
/* eslint-disable max-len */
const hre = require('hardhat');
const { expect } = require('chai');
const { getNetwork, addrs, nullAddress } = require('./utils');

const getSparkReserveData = async (dataProvider, tokenAddr) => {
    const tokens = await dataProvider.getReserveData(tokenAddr);
    return tokens;
};

const getSparkPositionInfo = async (user, sparkView) => {
    const market = addrs[getNetwork()].SPARK_MARKET;
    const pool = await hre.ethers.getContractAt('IPoolAddressesProvider', market).then((c) => hre.ethers.getContractAt('IPoolV3', c.getPool()));
    const {
        eMode: emodeCategoryId,
        collAddr,
        enabledAsColl,
        borrowAddr,
    } = await sparkView.getLoanData(market, user);

    const collTokenAddresses = collAddr.filter((e) => e !== nullAddress);
    const useAsCollateralFlags = enabledAsColl.slice(0, collTokenAddresses.length);
    const debtTokenAddresses = borrowAddr.filter((e) => e !== nullAddress);

    const {
        collAssetIds,
        collATokenAddresses,
    } = await Promise.all(
        collTokenAddresses.map(async (c) => getSparkReserveData(pool, c)),
    ).then((arr) => arr.reduce((acc, { id, aTokenAddress }) => ({
        collAssetIds: [...acc.collAssetIds, id],
        collATokenAddresses: [...acc.collATokenAddresses, aTokenAddress],
    }), ({
        collAssetIds: [],
        collATokenAddresses: [],
    })));

    const {
        debtAssetIds,
    } = await Promise.all(
        debtTokenAddresses.map(async (c) => getSparkReserveData(pool, c)),
    ).then((arr) => arr.reduce((acc, { id }) => ({
        debtAssetIds: [...acc.debtAssetIds, id],
    }), ({
        debtAssetIds: [],
    })));

    const debtAmounts = await sparkView.getTokenBalances(
        market,
        user,
        debtTokenAddresses,
    ).then((r) => r.map(({ borrowsVariable }) => borrowsVariable));

    const collAmounts = await sparkView.getTokenBalances(
        market,
        user,
        collTokenAddresses,
    ).then((r) => r.map(({ balance }) => balance));

    return {
        collAssetIds,
        collATokenAddresses,
        useAsCollateralFlags,
        collAmounts,

        emodeCategoryId,
        debtTokenAddresses,
        debtAssetIds,
        debtAmounts,
    };
};

const expectTwoSparkPositionsToBeEqual = (oldPosition, newPosition) => {
    expect(oldPosition.emodeCategoryId).to.be.eq(newPosition.emodeCategoryId);
    oldPosition.collAssetIds.map((e, i) => expect(e).to.be.eq(newPosition.collAssetIds[i]));
    oldPosition.collATokenAddresses.map((e, i) => expect(e).to.be.eq(newPosition.collATokenAddresses[i]));
    oldPosition.useAsCollateralFlags.map((e, i) => expect(e).to.be.eq(newPosition.useAsCollateralFlags[i]));
    oldPosition.debtTokenAddresses.map((e, i) => expect(e).to.be.eq(newPosition.debtTokenAddresses[i]));
    oldPosition.debtAssetIds.map((e, i) => expect(e).to.be.eq(newPosition.debtAssetIds[i]));

    oldPosition.collAmounts.map((e, i) => {
        expect(newPosition.collAmounts[i]).to.be.gte(e);
        expect(newPosition.collAmounts[i].sub(e)).to.be.lte(e.div(1000));
    });
    oldPosition.debtAmounts.map((e, i) => {
        expect(newPosition.debtAmounts[i]).to.be.gte(e);
        expect(newPosition.debtAmounts[i].sub(e)).to.be.lte(e.div(1000));
    });
};

module.exports = {
    getSparkPositionInfo,
    expectTwoSparkPositionsToBeEqual,
};
