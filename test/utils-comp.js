const COMP_ADDR = '0xc00e94Cb662C3520282E6f5717214004A7f26888';

const getBorrowBalance = async (compView, user, cTokenAddr) => {
    const tokenInfo = await compView.getTokenBalances(user, [cTokenAddr]);

    return tokenInfo[1][0];
};

const getSupplyBalance = async (compView, user, cTokenAddr) => {
    const tokenInfo = await compView.getTokenBalances(user, [cTokenAddr]);

    return tokenInfo[0][0];
};

const getCompRatio = async (compView, user) => {
    const ratio = await compView.getRatio(user);

    return ratio;
};

module.exports = {
    getBorrowBalance,
    getSupplyBalance,
    getCompRatio,
    COMP_ADDR,
};
