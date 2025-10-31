// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { AdminAuth } from "../auth/AdminAuth.sol";
import { ITrigger } from "../interfaces/core/ITrigger.sol";

/// @title Trigger contract that verifies if current timestamp is higher than the one in sub data,
/// and also helps change the timestamp for next execution
contract TimestampTrigger is ITrigger, AdminAuth {
    /// @param timestamp The next timestamp in which it should trigger
    /// @param interval How much to increase the next timestamp after executing strategy
    struct SubParams {
        uint256 timestamp;
        uint256 interval;
    }

    function isTriggered(bytes memory, bytes memory _subData) public view override returns (bool) {
        SubParams memory triggerSubData = parseSubInputs(_subData);

        if (triggerSubData.timestamp == 0) return false;

        if (triggerSubData.timestamp < block.timestamp) return true;

        return false;
    }

    function changedSubData(bytes memory _subData) public view override returns (bytes memory) {
        SubParams memory triggerSubData = parseSubInputs(_subData);
        triggerSubData.timestamp = block.timestamp + triggerSubData.interval;
        return abi.encode(triggerSubData);
    }

    function isChangeable() public pure override returns (bool) {
        return true;
    }

    function parseSubInputs(bytes memory _subData) public pure returns (SubParams memory params) {
        params = abi.decode(_subData, (SubParams));
    }
}
