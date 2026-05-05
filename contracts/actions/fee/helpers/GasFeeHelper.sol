// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { FeeRecipient } from "../../../utils/fee/FeeRecipient.sol";
import { TokenPriceHelper } from "../../../utils/token/TokenPriceHelper.sol";
import { GasCostLib } from "./GasCostLib.sol";

/// @title GasFeeHelper
/// @notice Helper contract for calculating the gas cost for strategies
contract GasFeeHelper is TokenPriceHelper {
    using TokenUtils for address;

    FeeRecipient public constant feeRecipient = FeeRecipient(FEE_RECIPIENT);

    /// @dev Divider for input amount, 5 bps
    uint256 public constant MAX_DFS_FEE = 2000;

    function calcGasCost(uint256 _gasUsed, address _feeToken) public view returns (uint256 txCost) {
        uint256 price = _feeToken == TokenUtils.WETH_ADDR ? 0 : getPriceInETH(_feeToken);

        txCost = GasCostLib.calcGasCost(_gasUsed, _feeToken, price, 0, false);
    }
}
