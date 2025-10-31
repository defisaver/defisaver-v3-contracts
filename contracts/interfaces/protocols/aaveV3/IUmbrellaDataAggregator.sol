// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

interface IUmbrellaDataAggregator {
    enum TokenType {
        None,
        Token,
        AToken,
        StataToken
    }

    struct StakeTokenData {
        TokenData stakeTokenData;
        uint256 totalAssets;
        uint256 targetLiquidity;
        bool isStakeConfigured;
        RewardTokenData[] rewardsTokenData;
    }

    struct RewardTokenData {
        TokenData rewardTokenData;
        uint256 maxEmissionPerSecond;
        uint256 distributionEnd;
    }

    struct TokenRouteData {
        address stakeToken;
        TokenFromRoute[] tokensFromRoute;
    }

    struct TokenFromRoute {
        TokenType typeOfToken;
        TokenData tokenData;
    }

    struct TokenData {
        address token;
        uint256 price;
        string name;
        string symbol;
        uint8 decimals;
    }

    struct StakeTokenUserData {
        address stakeToken;
        uint256 stakeUserBalance;
        RewardTokenUserData[] rewardsTokenUserData;
    }

    struct RewardTokenUserData {
        address reward;
        uint256 currentReward;
    }

    struct TokenRouteBalances {
        address stakeToken;
        BalanceOfTokenFromRoute[] balancesOfRouteTokens;
    }

    struct BalanceOfTokenFromRoute {
        TokenType typeOfToken;
        address token;
        uint256 userBalance;
    }

    function getAllAggregatedData(address _umbrella, address _aaveOracle, address _user)
        external
        view
        returns (
            StakeTokenData[] memory,
            TokenRouteData[] memory,
            StakeTokenUserData[] memory,
            TokenRouteBalances[] memory
        );

    function getTokensAggregatedData(address _umbrella, address _aaveOracle)
        external
        view
        returns (StakeTokenData[] memory);

    function getUserAggregatedData(address _umbrella, address _user)
        external
        view
        returns (StakeTokenUserData[] memory);
}
