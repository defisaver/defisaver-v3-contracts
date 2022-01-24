const mUSD = '0xe2f2a5c287993345a840db3b0845fbc70f5935a5';
const imUSD = '0x30647a72Dc82d7Fbb1123EA74716aB8A317Eac19';
const imUSDVault = '0x78befca7de27d07dc6e71da295cc2946681a6c7b';
const MTA = '0xa3BeD4E1c75D00fa6f4E5E6922DB7261B5E9AcD2';

const AssetPair = {
    BASSET_MASSET: 0,
    BASSET_IMASSET: 1,
    BASSET_IMASSETVAULT: 2,
    MASSET_IMASSET: 3,
    MASSET_IMASSETVAULT: 4,
    IMASSET_IMASSETVAULT: 5,
};

module.exports = {
    mUSD,
    imUSD,
    imUSDVault,
    MTA,
    AssetPair,
};
