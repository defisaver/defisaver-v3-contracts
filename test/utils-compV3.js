const COMET_ADDR = '0xc3d688B66703497DAA19211EEdff47f25384cdc3';

const getSupportedAssets = async (compV3View) => {
    const assets = await compV3View.getAssets();
    return assets;
};

module.exports = {
    getSupportedAssets,
    COMET_ADDR,
};
