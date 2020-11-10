const axios = require('axios');

const makerVersion = "1.1.3";

const fetchMakerAddresses = async (version = makerVersion, params = {}) => {
    const url = `https://changelog.makerdao.com/releases/mainnet/${version}/contracts.json`;

    const res = await axios.get(url, params);

    return res.data;
};

const getVaultsForUser = async (user, makerAddresses) => {
    const GetCdps = await 
    hre.ethers.getContractAt("IGetCdps", makerAddresses["GET_CDPS"]);

    const vaults = await GetCdps.getCdpsAsc(makerAddresses['CDP_MANAGER'], user);

    return vaults;
};


module.exports = {
    fetchMakerAddresses,
    getVaultsForUser
};