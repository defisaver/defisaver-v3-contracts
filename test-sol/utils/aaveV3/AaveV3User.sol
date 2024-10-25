// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { AaveV3Borrow } from "../../../contracts/actions/aaveV3/AaveV3Borrow.sol";
import { AaveV3Supply } from "../../../contracts/actions/aaveV3/AaveV3Supply.sol";
import { UserWallet } from "../UserWallet.sol";
import { AaveV3UserUtils } from "./AaveV3UserUtils.sol";

contract AaveV3User is AaveV3UserUtils {

    //solhint-disable-next-line no-empty-blocks
    constructor() AaveV3UserUtils() {}

    function supply(
        uint256 _amount,
        bool _isSafe,
        uint16 _assetId,
        address _market
    ) public {
        AaveV3Supply aaveV3Supply = new AaveV3Supply();

        AaveV3Supply.Params memory params = AaveV3Supply.Params({
            amount: _amount,
            from: _isSafe ? safeAddr : proxyAddr,
            assetId: _assetId,
            enableAsColl: true,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: _market,
            onBehalf: address(0)
        });

        bytes memory fnData = abi.encodeWithSignature("executeActionDirect(bytes)", abi.encode(params));
        executeWithWallet(_isSafe, address(aaveV3Supply), fnData, 0);
    }

    function borrow(
        bool _isSafe,
        address _market,
        uint256 _amount,
        uint8 _rateMode,
        uint16 _assetId
    ) public {
        AaveV3Borrow aaveV3Borrow = new AaveV3Borrow();

        AaveV3Borrow.Params memory params = AaveV3Borrow.Params({
            amount: _amount,
            to: msg.sender,
            rateMode: _rateMode,
            assetId: _assetId,
            useDefaultMarket: true,
            useOnBehalf: false,
            market: _market,
            onBehalf: address(0)
        });

        bytes memory fnData = abi.encodeWithSignature("executeActionDirect(bytes)", abi.encode(params));
        executeWithWallet(_isSafe, address(aaveV3Borrow), fnData, 0);
    }
}
