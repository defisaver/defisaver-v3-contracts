// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { TokenUtils } from "../../../utils/token/TokenUtils.sol";
import { FeeRecipient } from "../../../utils/fee/FeeRecipient.sol";
import { TokenPriceHelperL2 } from "../../../utils/token/TokenPriceHelperL2.sol";
import { GasCostLib } from "./GasCostLib.sol";

contract GasFeeHelperL2 is TokenPriceHelperL2 {
    using TokenUtils for address;

    FeeRecipient public constant feeRecipient = FeeRecipient(FEE_RECIPIENT);

    /// @dev Divider for input amount, 5 bps
    uint256 public constant MAX_DFS_FEE = 2000;

    function calcGasCost(uint256 _gasUsed, address _feeToken, uint256 _l1GasCostInEth)
        public
        view
        returns (uint256 txCost)
    {
        uint256 price = _feeToken == TokenUtils.WETH_ADDR ? 0 : getPriceInETH(_feeToken);

        txCost = GasCostLib.calcGasCost(_gasUsed, _feeToken, price, _l1GasCostInEth, false);
    }
}
