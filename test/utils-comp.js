

const getBorrowBalance = async (compView, user, cTokenAddr) => {
    const tokenInfo = await compView.getTokenBalances(user, [cTokenAddr]);

    return tokenInfo[1][0];
};

const getCompRatio = async (compView, user) => {
    const ratio = await compView.getRatio(user);

    return ratio;
};

module.exports = {
    getBorrowBalance,
    getCompRatio,
};