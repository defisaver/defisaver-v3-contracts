// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { AaveV3SubProxy } from "../../../contracts/actions/aaveV3/AaveV3SubProxy.sol";
import { UserWallet } from "../UserWallet.sol";

contract AaveV3UserUtils is UserWallet {

    //solhint-disable-next-line no-empty-blocks
    constructor() UserWallet() {}

    function subToAutomationBundles(
        bool _isSafe,
        address _subProxy,
        uint128 _minRatio,
        uint128 _maxRatio,
        uint128 _targetRatioBoost,
        uint128 _targetRatioRepay
    ) public returns (AaveV3SubProxy.AaveSubData memory params) {
        params = AaveV3SubProxy.AaveSubData({
            minRatio: _minRatio,
            maxRatio: _maxRatio,
            targetRatioBoost: _targetRatioBoost,
            targetRatioRepay: _targetRatioRepay,
            boostEnabled: true
        });

        bytes memory fnData = abi.encodeWithSignature(
            "subToAaveAutomation(bytes)",
            encodeSubData(params)
        );

        executeWithWallet(_isSafe, _subProxy, fnData, 0);
    }

    ///////////////////////////////// HELPER FUNCTIONS /////////////////////////////////

    function encodeSubData(AaveV3SubProxy.AaveSubData memory user) public pure returns (bytes memory) {
        return abi.encodePacked(
            bytes16(uint128(user.minRatio)),
            bytes16(uint128(user.maxRatio)),
            bytes16(uint128(user.targetRatioBoost)),
            bytes16(uint128(user.targetRatioRepay)),
            bytes1(user.boostEnabled ? 0x01 : 0x00)
        );
    }
}
