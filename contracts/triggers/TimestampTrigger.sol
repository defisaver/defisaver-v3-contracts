// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;

import "../auth/AdminAuth.sol";
import "../interfaces/ITrigger.sol";
import "../interfaces/IERC20.sol";

contract TimestampTrigger is ITrigger, AdminAuth {
    struct Params {
        uint256 timestamp;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        Params memory inputData = parseInputs(_subData);

        if (inputData.timestamp < block.timestamp) return true;

        return false;
    }

    function parseInputs(bytes memory _subData) public pure returns (Params memory params) {
        params = abi.decode(_subData, (Params));
    }
}
