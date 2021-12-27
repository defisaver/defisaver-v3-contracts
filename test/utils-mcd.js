const axios = require('axios');
const hre = require('hardhat');

const makerVersion = '1.9.9';

const MCD_MANAGER_ADDR = '0x5ef30b9986345249bc32d8928B7ee64DE9435E39';

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

const getRatio = async (mcdView, vaultId) => {
    const ratio = await mcdView.getRatio(vaultId);

    return ratio / 1e16;
};

const getVaultInfoRaw = async (mcdView, vaultId, ilk) => {
    const info = await mcdView.getVaultInfo(vaultId, ilk);
    return {
        coll: info[0].toString(),
        debt: info[1].toString(),
    };
};

const getVaultInfo = async (mcdView, vaultId, ilk) => {
    const info = await mcdView.getVaultInfo(vaultId, ilk);
    return {
        coll: parseFloat(hre.ethers.utils.formatUnits(info[0].toString(), 18).toString()),
        debt: parseFloat(hre.ethers.utils.formatUnits(info[1].toString(), 18).toString()),
    };
};

module.exports = {
    fetchMakerAddresses,
    getVaultsForUser,
    getRatio,
    getVaultInfoRaw,
    getVaultInfo,
    canGenerateDebt,
    MCD_MANAGER_ADDR,
};
