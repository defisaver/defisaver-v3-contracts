// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import "../../../utils/TokenUtils.sol";
import "../../../interfaces/liquity/ITroveManager.sol";
import "../../../interfaces/liquity/IBorrowerOperations.sol";
import "../../../interfaces/liquity/IPriceFeed.sol";
import "../../../interfaces/liquity/IHintHelpers.sol";
import "../../../interfaces/liquity/ISortedTroves.sol";
import "../../../interfaces/liquity/ICollSurplusPool.sol";
import "../../../interfaces/liquity/IStabilityPool.sol";
import "../../../interfaces/liquity/ILQTYStaking.sol";
import "../../../interfaces/liquity/IChickenBondManager.sol";
import "./MainnetLiquityAddresses.sol";

contract LiquityHelper is MainnetLiquityAddresses {
    using TokenUtils for address;

    uint constant public LUSD_GAS_COMPENSATION = 200e18;
    uint constant public MIN_DEBT = 2000e18; // MIN_NET_DEBT (1800e18) + LUSD_GAS_COMP (200e18)

    IPriceFeed constant public PriceFeed = IPriceFeed(PRICE_FEED_ADDRESS);
    IBorrowerOperations constant public BorrowerOperations = IBorrowerOperations(BORROWER_OPERATIONS_ADDRESS);
    ITroveManager constant public TroveManager = ITroveManager(TROVE_MANAGER_ADDRESS);
    ISortedTroves constant public SortedTroves = ISortedTroves(SORTED_TROVES_ADDRESS);
    IHintHelpers constant public HintHelpers = IHintHelpers(HINT_HELPERS_ADDRESS);
    ICollSurplusPool constant public CollSurplusPool = ICollSurplusPool(COLL_SURPLUS_POOL_ADDRESS);
    IStabilityPool constant public StabilityPool = IStabilityPool(STABILITY_POOL_ADDRESS);
    ILQTYStaking constant public LQTYStaking = ILQTYStaking(LQTY_STAKING_ADDRESS);
    IChickenBondManager constant public CBManager = IChickenBondManager(CB_MANAGER_ADDRESS);

    function withdrawStaking(uint256 _ethGain, uint256 _lusdGain, address _wethTo, address _lusdTo) internal {
        if (_ethGain > 0) {
            TokenUtils.depositWeth(_ethGain);
            TokenUtils.WETH_ADDR.withdrawTokens(_wethTo, _ethGain);
        }
        if (_lusdGain > 0) {
            LUSD_TOKEN_ADDRESS.withdrawTokens(_lusdTo, _lusdGain);
        }
    }
    
    function withdrawStabilityGains(uint256 _ethGain, uint256 _lqtyGain, address _wethTo, address _lqtyTo) internal {
        if (_ethGain > 0) {
            TokenUtils.depositWeth(_ethGain);
            TokenUtils.WETH_ADDR.withdrawTokens(_wethTo, _ethGain);
        }      
        if (_lqtyGain > 0) {
            LQTY_TOKEN_ADDRESS.withdrawTokens(_lqtyTo, _lqtyGain);
        }
    }
}