const axios = require('axios');
const hre = require('hardhat');

const makerVersion = '1.9.9';

const MCD_MANAGER_ADDR = '0x5ef30b9986345249bc32d8928B7ee64DE9435E39';
const CDP_REGISTRY = '0xBe0274664Ca7A68d6b5dF826FB3CcB7c620bADF3';
const CROPPER_ADDR = '0x8377CD01a5834a6EaD3b7efb482f678f2092b77e';
const LDO_ADDR = '0x5A98FcBEA516Cf06857215779Fd812CA3beF1B32';

// TODO: fetch from sdk later
const cropJoinIlks = [
    '0x435256563145544853544554482d410000000000000000000000000000000000',
];

const cropData = {
    ilk: '0x435256563145544853544554482d410000000000000000000000000000000000',
    joinAddr: '0x82D8bfDB61404C796385f251654F6d7e92092b5D',
    tokenAddr: '0x06325440D014e39736583c165C2963BA99fAf14E',
};

const canGenerateDebt = async (ilkInfo) => {
    const vat = await
    hre.ethers.getContractAt('IVat', '0x35D1b3F3D7966A1DFe207aa4514C12a259A0492B');

    const ilkData = await vat.ilks(ilkInfo.ilkBytes);
    const debtCeiling = Math.round(ilkData.line / 1e45);
    const debt = (ilkData.Art / 1e18) * (ilkData.rate / 1e27);

    return debtCeiling > (debt + 50000);
};

const fetchMakerAddresses = async (version = makerVersion, params = {}) => {
    const url = `https://changelog.makerdao.com/releases/mainnet/${version}/contracts.json`;

    const res = await axios.get(url, params);

    return res.data;
};

const getVaultsForUser = async (user, makerAddresses) => {
    const GetCdps = await
    hre.ethers.getContractAt('IGetCdps', makerAddresses.GET_CDPS);

    const vaults = await GetCdps.getCdpsAsc(makerAddresses.CDP_MANAGER, user);

    return vaults;
};

const getCropJoinVaultIds = async (user) => {
    const cdpRegistry = await hre.ethers.getContractAt('ICdpRegistry', CDP_REGISTRY);
    const cropJoinPromises = cropJoinIlks.map((ilk) => cdpRegistry.cdps(ilk, user));

    let cropJoinVaults = await Promise.all(cropJoinPromises);
    cropJoinVaults = cropJoinVaults.filter((id) => id.toString() !== '0');

    return cropJoinVaults;
};

const getCropJoinVaultId = async (user, ilk) => {
    const cdpRegistry = await hre.ethers.getContractAt('ICdpRegistry', CDP_REGISTRY);
    const id = await cdpRegistry.cdps(ilk, user);

    return id;
};

const getRatio = async (mcdView, vaultId, mcdManager = MCD_MANAGER_ADDR) => {
    const ratio = await mcdView.getRatio(mcdManager, vaultId);

    return ratio / 1e16;
};

const getVaultInfoRaw = async (mcdView, vaultId, ilk, mcdManager = MCD_MANAGER_ADDR) => {
    const info = await mcdView.getVaultInfo(mcdManager, vaultId, ilk);
    return {
        coll: info[0].toString(),
        debt: info[1].toString(),
    };
};

const getVaultInfo = async (mcdView, vaultId, ilk, mcdManager = MCD_MANAGER_ADDR) => {
    const info = await mcdView.getVaultInfo(mcdManager, vaultId, ilk);
    return {
        coll: parseFloat(hre.ethers.utils.formatUnits(info[0].toString(), 18).toString()),
        debt: parseFloat(hre.ethers.utils.formatUnits(info[1].toString(), 18).toString()),
    };
};

const castSpell = async (spellAddr) => {
    const dssSpell = await hre.ethers.getContractAt('IDssSpell', spellAddr);

    // is spell executed
    const done = await dssSpell.done();
    if (done) return;

    // get execution timestamp
    const castTime = await dssSpell.nextCastTime();

    await hre.network.provider.send('evm_setNextBlockTimestamp', [parseFloat(castTime.toString())]);

    // cast spell
    await dssSpell.cast({ gasLimit: 3_000_000 });

    const pip = await hre.ethers.getContractAt('IPipInterface', '0x70098F537EE8D0E00882585b7B02C45cd6AB3186');

    const HOUR_IN_MILISECONDS = (60 * 60 * 1000);
    await pip.poke({ gasLimit: 3_000_000 });
    await hre.network.provider.send('evm_setNextBlockTimestamp', [parseFloat(castTime.toString()) + HOUR_IN_MILISECONDS]);

    await pip.poke({ gasLimit: 3_000_000 });

    await hre.network.provider.send('evm_setNextBlockTimestamp', [parseFloat(castTime.toString()) + HOUR_IN_MILISECONDS * 2]);

    await pip.poke({ gasLimit: 3_000_000 });
};

module.exports = {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
    getVaultInfoRaw,
    getVaultInfo,
    canGenerateDebt,
    getCropJoinVaultIds,
    getCropJoinVaultId,
    castSpell,
    cropData,
    MCD_MANAGER_ADDR,
    CROPPER_ADDR,
    LDO_ADDR,
    cropJoinIlks,
};
