const getSupportedAssets = async (compV3View) => {
    const assets = await compV3View.getAssets();
    return assets;
};

module.exports = {
    getSupportedAssets,
};
