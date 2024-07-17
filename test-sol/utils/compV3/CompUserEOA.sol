// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { CompUserUtils } from "./CompUserUtils.sol";
import { IComet } from "../../../contracts/interfaces/compoundV3/IComet.sol";
import { IERC20 } from "../../../contracts/interfaces/IERC20.sol";

contract CompUserEOA is CompUserUtils {

    IComet public comet;

    constructor(address _comet) CompUserUtils() {
        comet = IComet(_comet);

        // gib allow to wallets
        comet.allow(proxyAddr, true);
        comet.allow(safeAddr, true);
    }

    function supply(
        address _tokenAddr,
        uint256 _amount
    ) public {
        IERC20(_tokenAddr).approve(address(comet), type(uint256).max);

        comet.supply(_tokenAddr, _amount);
    }

    function borrow(uint256 _amount) public {
        comet.withdraw(comet.baseToken(), _amount);
    }
}
