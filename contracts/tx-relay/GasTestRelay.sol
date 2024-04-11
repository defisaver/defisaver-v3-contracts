// SPDX-License-Identifier: MIT

pragma solidity =0.8.10;

import { GasFeeHelper } from "../actions/fee/helpers/GasFeeHelper.sol";
import { TokenUtils } from "../utils/TokenUtils.sol";
 
contract GasTestRelay is GasFeeHelper {

    using TokenUtils for address;

    function test_gas(uint256 _gasUsed, address _feeToken, address _pullFrom) external {
        uint256 gasCost = calcGasCost(_gasUsed, _feeToken, 0);

        _feeToken.pullTokensIfNeeded(_pullFrom, 10000);

        _feeToken.withdrawTokens(feeRecipient.getFeeAddr(), gasCost);
    }
}
