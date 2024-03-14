// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "./CompUserUtils.sol";
import "../../../contracts/interfaces/compoundV3/IComet.sol";

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
