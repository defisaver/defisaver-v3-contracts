// SPDX-License-Identifier: MIT

pragma solidity ^0.7.0;

import "../interfaces/IGasToken.sol";

contract GasBurner {
    IGasToken public constant gasToken = IGasToken(0x0000000000b3F879cb30FE243b4Dfee438691c04);

    modifier burnGas {
        uint gasBefore = gasleft();

        _;

        uint gasSpent = 21000 + gasBefore - gasleft() + 16 * msg.data.length;
        uint gasTokenAmount = (gasSpent + 14154) / 41130;

        if (gasToken.balanceOf(address(this)) >= gasTokenAmount) {
            gasToken.free(gasTokenAmount);
        }
    }
}
