// SPDX-License-Identifier: AGPL-3.0-only
pragma solidity =0.8.10;

import {Types} from "./MorphoTypesAaveV3.sol";

interface IMorphoGetters {
    function DOMAIN_SEPARATOR() external view returns (bytes32);
    function pool() external view returns (address);
    function addressesProvider() external view returns (address);
    function eModeCategoryId() external view returns (uint256);

    function market(address underlying) external view returns (Types.Market memory);
    function marketsCreated() external view returns (address[] memory);

    function scaledCollateralBalance(address underlying, address user) external view returns (uint256);
    function scaledP2PBorrowBalance(address underlying, address user) external view returns (uint256);
    function scaledP2PSupplyBalance(address underlying, address user) external view returns (uint256);
    function scaledPoolBorrowBalance(address underlying, address user) external view returns (uint256);
    function scaledPoolSupplyBalance(address underlying, address user) external view returns (uint256);

    function supplyBalance(address underlying, address user) external view returns (uint256);
    function borrowBalance(address underlying, address user) external view returns (uint256);
    function collateralBalance(address underlying, address user) external view returns (uint256);

    function userCollaterals(address user) external view returns (address[] memory);
    function userBorrows(address user) external view returns (address[] memory);

    function isManaging(address delegator, address manager) external view returns (bool);
    function userNonce(address user) external view returns (uint256);

    function defaultIterations() external view returns (Types.Iterations memory);
    function positionsManager() external view returns (address);
    function rewardsManager() external view returns (address);
    function treasuryVault() external view returns (address);

    function isClaimRewardsPaused() external view returns (bool);

    function updatedIndexes(address underlying) external view returns (Types.Indexes256 memory);
    function liquidityData(address user) external view returns (Types.LiquidityData memory);
    function getNext(address underlying, Types.Position position, address user) external view returns (address);
    function getBucketsMask(address underlying, Types.Position position) external view returns (uint256);
}

interface IMorphoSetters {
    function createMarket(address underlying, uint16 reserveFactor, uint16 p2pIndexCursor) external;
    function increaseP2PDeltas(address underlying, uint256 amount) external;
    function claimToTreasury(address[] calldata underlyings, uint256[] calldata amounts) external;

    function setPositionsManager(address positionsManager) external;
    function setRewardsManager(address rewardsManager) external;
    function setTreasuryVault(address treasuryVault) external;
    function setDefaultIterations(Types.Iterations memory defaultIterations) external;
    function setP2PIndexCursor(address underlying, uint16 p2pIndexCursor) external;
    function setReserveFactor(address underlying, uint16 newReserveFactor) external;

    function setIsClaimRewardsPaused(bool isPaused) external;
    function setIsPaused(address underlying, bool isPaused) external;
    function setIsPausedForAllMarkets(bool isPaused) external;
    function setIsSupplyPaused(address underlying, bool isPaused) external;
    function setIsSupplyCollateralPaused(address underlying, bool isPaused) external;
    function setIsBorrowPaused(address underlying, bool isPaused) external;
    function setIsRepayPaused(address underlying, bool isPaused) external;
    function setIsWithdrawPaused(address underlying, bool isPaused) external;
    function setIsWithdrawCollateralPaused(address underlying, bool isPaused) external;
    function setIsLiquidateBorrowPaused(address underlying, bool isPaused) external;
    function setIsLiquidateCollateralPaused(address underlying, bool isPaused) external;
    function setIsP2PDisabled(address underlying, bool isP2PDisabled) external;
    function setIsDeprecated(address underlying, bool isDeprecated) external;
}

interface IMorphoAaveV3 is IMorphoGetters, IMorphoSetters {
    function initialize(
        address addressesProvider,
        uint8 eModeCategoryId,
        address newPositionsManager,
        Types.Iterations memory newDefaultIterations
    ) external;

    function supply(address underlying, uint256 amount, address onBehalf, uint256 maxIterations)
        external
        returns (uint256 supplied);
    function supplyWithPermit(
        address underlying,
        uint256 amount,
        address onBehalf,
        uint256 maxIterations,
        uint256 deadline,
        Types.Signature calldata signature
    ) external returns (uint256 supplied);
    function supplyCollateral(address underlying, uint256 amount, address onBehalf)
        external
        returns (uint256 supplied);
    function supplyCollateralWithPermit(
        address underlying,
        uint256 amount,
        address onBehalf,
        uint256 deadline,
        Types.Signature calldata signature
    ) external returns (uint256 supplied);

    function borrow(address underlying, uint256 amount, address onBehalf, address receiver, uint256 maxIterations)
        external
        returns (uint256 borrowed);

    function repay(address underlying, uint256 amount, address onBehalf) external returns (uint256 repaid);
    function repayWithPermit(
        address underlying,
        uint256 amount,
        address onBehalf,
        uint256 deadline,
        Types.Signature calldata signature
    ) external returns (uint256 repaid);

    function withdraw(address underlying, uint256 amount, address onBehalf, address receiver, uint256 maxIterations)
        external
        returns (uint256 withdrawn);
    function withdrawCollateral(address underlying, uint256 amount, address onBehalf, address receiver)
        external
        returns (uint256 withdrawn);

    function approveManager(address manager, bool isAllowed) external;
    function approveManagerWithSig(
        address delegator,
        address manager,
        bool isAllowed,
        uint256 nonce,
        uint256 deadline,
        Types.Signature calldata signature
    ) external;

    function isManagedBy(address delegator, address manager) external view returns(bool);

    function liquidate(address underlyingBorrowed, address underlyingCollateral, address user, uint256 amount)
        external
        returns (uint256 repaid, uint256 seized);

    function claimRewards(address[] calldata assets, address onBehalf)
        external
        returns (address[] memory rewardTokens, uint256[] memory claimedAmounts);
}
