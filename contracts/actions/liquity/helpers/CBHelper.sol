// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "./MainnetLiquityAddresses.sol";
import "../../../interfaces/liquity/IBondNFT.sol";
import "../../../interfaces/curve/ISwaps.sol";
import "../../../views/ChickenBondsView.sol";
import "../../../utils/Sqrt.sol";
import "../../../DS/DSMath.sol";
import "../../../core/strategy/StrategyModel.sol";

/// @title Chicken Bonds helper contract that fetches market price and optimal rebonding calculations
contract CBHelper is DSMath, MainnetLiquityAddresses {

    using Sqrt for uint256;

    uint64 public constant REBOND_STRATEGY_ID = 31; 

    struct CBInfo {
        uint256 chickenInAMMFee;
        uint256 accrualParameter;
        uint256 totalReserveLUSD;
        uint256 bLUSDSupply;
    }

    IChickenBondManager constant public CBManager = IChickenBondManager(CB_MANAGER_ADDRESS);

    /// @notice Calculates bLUSD price in Curve pool based on the amount we are swapping
    function getBLusdPriceFromCurve(uint256 _amount) public view returns (uint256) {
        address[9] memory routes;
        routes[0] = BLUSD_ADDRESS;
        routes[1] = BLUSD_AMM_ADDRESS;
        routes[2] = LUSD_3CRV_POOL_ADDRESS;
        routes[3] = LUSD_3CRV_POOL_ADDRESS;
        routes[4] = LUSD_TOKEN_ADDRESS;
        // rest is 0x0 by default

        uint256[3][4] memory swapParams;
        swapParams[0] = [uint256(0), uint256(1), uint256(3)];
        swapParams[1] = [uint256(0), uint256(0), uint256(9)];
        swapParams[2] = [uint256(0), uint256(0), uint256(0)];
        swapParams[3] = [uint256(0), uint256(0), uint256(0)];

        uint256 outputAmount = ISwaps(CURVE_REGISTRY_SWAP_ADDRESS).get_exchange_multiple_amount(
            routes,
            swapParams,
            _amount
        );

        return wdiv(outputAmount, _amount);
    }

    /// @notice Calculates 'optimal' amount of LUSD for an lusdAmount to accrue based on the market price
    function getOptimalLusdAmount(uint256 _lusdAmount) public view returns (uint256, uint256) {
        CBInfo memory systemInfo = getCbInfo();
        uint256 marketPrice = getBLusdPriceFromCurve(_lusdAmount);
        uint256 optimalRebondTime = _getOptimalRebondTime(systemInfo, marketPrice);

        uint256 feeAmount = marketPrice * systemInfo.chickenInAMMFee;
        uint256 marketPriceMinusFee = (marketPrice * 10**18) - feeAmount;

        uint256 res = wmul(
            wdiv(
                wmul(_lusdAmount, optimalRebondTime),
                (systemInfo.accrualParameter + optimalRebondTime)
            ),
            marketPriceMinusFee
        );

        return (res / 1e18, marketPrice);
    }

    /// @notice Internal function calculated optimal wait time for the user to accrue bLUSD
    function _getOptimalRebondTime(CBInfo memory systemInfo, uint256 _marketPrice)
        internal
        pure
        returns (uint256)
    {
        uint256 marketPricePremium = _calcMarketPricePremium(systemInfo, _marketPrice);

        uint256 feeAmount = systemInfo.chickenInAMMFee * marketPricePremium;
        uint256 premiumMinusFee = (marketPricePremium * 1e18) - feeAmount;

        uint256 premiumSqrt = premiumMinusFee.sqrt();
        uint256 premiumScaled = (premiumMinusFee / 1e18);

        uint256 res = wmul(
            systemInfo.accrualParameter,
            wmul((premiumSqrt + 1e18), wdiv(1e18, (premiumScaled - 1e18)))
        );

        return res;
    }

    /// @notice Calculates market price premium based on the floor price and the current market price
    function _calcMarketPricePremium(CBInfo memory systemInfo, uint256 _marketPrice)
        public
        pure
        returns (uint256 marketPricePremium)
    {
        uint256 floorPrice = wdiv(systemInfo.totalReserveLUSD, systemInfo.bLUSDSupply);
        marketPricePremium = wdiv(_marketPrice, floorPrice);
    }

    /// @notice View helper for calculating rebond time without input params
    function getOptimalRebondTime() public view returns (uint256) {
        CBInfo memory systemInfo = getCbInfo();
        uint256 marketPrice = getBLusdPriceFromCurve(1000 * 1e18);

        return _getOptimalRebondTime(systemInfo, marketPrice);
    }

    /// @notice Returns info about cb system needed for the calculations
    function getCbInfo() public view returns (CBInfo memory systemInfo) {
        (, uint256 totalReserveLUSD, ) = CBManager.getTreasury();

        systemInfo = CBInfo({
            totalReserveLUSD: totalReserveLUSD,
            accrualParameter: CBManager.calcUpdatedAccrualParameter(),
            chickenInAMMFee: CBManager.CHICKEN_IN_AMM_FEE(),
            bLUSDSupply: IERC20(BLUSD_ADDRESS).totalSupply()
        });
    }

    function formatRebondSub(uint256 _newSubId, uint256 _bondID) public pure returns (StrategyModel.StrategySub memory rebondSub) {
        rebondSub.strategyOrBundleId = REBOND_STRATEGY_ID;
        rebondSub.isBundle = false;

        bytes memory triggerData = abi.encode(_bondID);
        rebondSub.triggerData =  new bytes[](1);
        rebondSub.triggerData[0] = triggerData;

        rebondSub.subData =  new bytes32[](4);
        rebondSub.subData[0] = bytes32(_newSubId);
        rebondSub.subData[1] = bytes32(_bondID);
        rebondSub.subData[2] = bytes32(uint256(uint160(BLUSD_ADDRESS)));
        rebondSub.subData[3] = bytes32(uint256(uint160(LUSD_TOKEN_ADDRESS)));
    }
}