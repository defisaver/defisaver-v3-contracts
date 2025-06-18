// SPDX-License-Identifier: MIT

pragma solidity =0.8.27;

import { TokenUtils } from "../../../utils/TokenUtils.sol";
import { ITroveManager } from "../../../interfaces/liquity/ITroveManager.sol";
import { IBorrowerOperations } from "../../../interfaces/liquity/IBorrowerOperations.sol";
import { IPriceFeed } from "../../../interfaces/liquity/IPriceFeed.sol";
import { IHintHelpers } from "../../../interfaces/liquity/IHintHelpers.sol";
import { ISortedTroves } from "../../../interfaces/liquity/ISortedTroves.sol";
import { ICollSurplusPool } from "../../../interfaces/liquity/ICollSurplusPool.sol";
import { IStabilityPool } from "../../../interfaces/liquity/IStabilityPool.sol";
import { ILQTYStaking } from "../../../interfaces/liquity/ILQTYStaking.sol";
import { IChickenBondManager } from "../../../interfaces/liquity/IChickenBondManager.sol";
import { MainnetLiquityAddresses } from "./MainnetLiquityAddresses.sol";

contract LiquityHelper is MainnetLiquityAddresses {
    using TokenUtils for address;

    uint64 constant LIQUITY_PAYBACK_BUNDLE_ID = 7;

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