// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../UserWallet.sol";

import "../../Const.sol";
import "../../../contracts/interfaces/compoundV3/IComet.sol";
import "../../../contracts/actions/compoundV3/CompV3SubProxy.sol";

contract CompUserUtils is UserWallet {

    //solhint-disable-next-line no-empty-blocks
    constructor() UserWallet() {}

    function subToAutomationBundles(
        bool _isSafe,
        address _subProxy,
        uint128 _minRatio,
        uint128 _maxRatio,
        uint128 _targetRatioBoost,
        uint128 _targetRatioRepay,
        bool _isEOA
    ) public returns (CompV3SubProxy.CompV3SubData memory params) {
        params = CompV3SubProxy.CompV3SubData({
            market: Const.COMET_USDC,
            baseToken: Const.USDC_ADDR,
            minRatio: _minRatio,
            maxRatio: _maxRatio,
            targetRatioBoost: _targetRatioBoost,
            targetRatioRepay: _targetRatioRepay,
            boostEnabled: true,
            isEOA: _isEOA
        });

        bytes memory fnData = abi.encodeWithSignature(
            "subToCompV3Automation((address,address,uint128,uint128,uint128,uint128,bool,bool))",
            params
        );
        executeWithWallet(_isSafe, _subProxy, fnData, 0);
    }
}