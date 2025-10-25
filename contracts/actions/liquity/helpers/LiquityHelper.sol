// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { ITroveManager } from "../../../interfaces/protocols/liquity/ITroveManager.sol";
import { IBorrowerOperations } from "../../../interfaces/protocols/liquity/IBorrowerOperations.sol";
import { IPriceFeed } from "../../../interfaces/protocols/liquity/IPriceFeed.sol";
import { IHintHelpersV1 } from "../../../interfaces/protocols/liquity/IHintHelpersV1.sol";
import { ISortedTroves } from "../../../interfaces/protocols/liquity/ISortedTroves.sol";
import { ICollSurplusPool } from "../../../interfaces/protocols/liquity/ICollSurplusPool.sol";
import { IStabilityPool } from "../../../interfaces/protocols/liquity/IStabilityPool.sol";
import { ILQTYStaking } from "../../../interfaces/protocols/liquity/ILQTYStaking.sol";
import { MainnetLiquityAddresses } from "./MainnetLiquityAddresses.sol";

contract LiquityHelper is MainnetLiquityAddresses {
    using TokenUtils for address;

    uint64 constant LIQUITY_PAYBACK_BUNDLE_ID = 7;

    uint256 public constant LUSD_GAS_COMPENSATION = 200e18;
    uint256 public constant MIN_DEBT = 2000e18; // MIN_NET_DEBT (1800e18) + LUSD_GAS_COMP (200e18)

    IPriceFeed public constant PriceFeed = IPriceFeed(PRICE_FEED_ADDRESS);
    IBorrowerOperations public constant BorrowerOperations = IBorrowerOperations(BORROWER_OPERATIONS_ADDRESS);
    ITroveManager public constant TroveManager = ITroveManager(TROVE_MANAGER_ADDRESS);
    ISortedTroves public constant SortedTroves = ISortedTroves(SORTED_TROVES_ADDRESS);
    IHintHelpersV1 public constant HintHelpers = IHintHelpersV1(HINT_HELPERS_ADDRESS);
    ICollSurplusPool public constant CollSurplusPool = ICollSurplusPool(COLL_SURPLUS_POOL_ADDRESS);
    IStabilityPool public constant StabilityPool = IStabilityPool(STABILITY_POOL_ADDRESS);
    ILQTYStaking public constant LQTYStaking = ILQTYStaking(LQTY_STAKING_ADDRESS);

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
