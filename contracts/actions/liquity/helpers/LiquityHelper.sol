// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../../../utils/TokenUtils.sol";
import "../../../interfaces/liquity/ITroveManager.sol";
import "../../../interfaces/liquity/IBorrowerOperations.sol";
import "../../../interfaces/liquity/IPriceFeed.sol";
import "../../../interfaces/liquity/IHintHelpers.sol";
import "../../../interfaces/liquity/ISortedTroves.sol";
import "../../../interfaces/liquity/ICollSurplusPool.sol";
import "../../../interfaces/liquity/IStabilityPool.sol";
import "../../../interfaces/liquity/ILQTYStaking.sol";
import "./MainnetLiquityAddresses.sol";

contract LiquityHelper is MainnetLiquityAddresses {
    using TokenUtils for address;

    uint constant public LUSD_GAS_COMPENSATION = 200e18;

    IPriceFeed constant public PriceFeed = IPriceFeed(PriceFeedAddr);
    IBorrowerOperations constant public BorrowerOperations = IBorrowerOperations(BorrowerOperationsAddr);
    ITroveManager constant public TroveManager = ITroveManager(TroveManagerAddr);
    ISortedTroves constant public SortedTroves = ISortedTroves(SortedTrovesAddr);
    IHintHelpers constant public HintHelpers = IHintHelpers(HintHelpersAddr);
    ICollSurplusPool constant public CollSurplusPool = ICollSurplusPool(CollSurplusPoolAddr);
    IStabilityPool constant public StabilityPool = IStabilityPool(StabilityPoolAddr);
    ILQTYStaking constant public LQTYStaking = ILQTYStaking(LQTYStakingAddr);

    function withdrawStaking(uint256 _ethGain, uint256 _lusdGain, address _wethTo, address _lusdTo) internal {
        if (_ethGain > 0) {
            TokenUtils.depositWeth(_ethGain);
            TokenUtils.WETH_ADDR.withdrawTokens(_wethTo, _ethGain);
        }
        if (_lusdGain > 0) {
            LUSDTokenAddr.withdrawTokens(_lusdTo, _lusdGain);
        }
    }
    
    function withdrawStabilityGains(uint256 _ethGain, uint256 _lqtyGain, address _wethTo, address _lqtyTo) internal {
        if (_ethGain > 0) {
            TokenUtils.depositWeth(_ethGain);
            TokenUtils.WETH_ADDR.withdrawTokens(_wethTo, _ethGain);
        }      
        if (_lqtyGain > 0) {
            LQTYTokenAddr.withdrawTokens(_lqtyTo, _lqtyGain);
        }
    }
}