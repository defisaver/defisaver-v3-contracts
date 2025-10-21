// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { IERC20Permit } from "../../interfaces/IERC20Permit.sol";
import { ActionBase } from "../ActionBase.sol";

/// @title Helper action to invoke a permit action signed by a user
contract PermitToken is ActionBase {
    /// @param tokenAddr Address of the token to permit
    /// @param owner Address of the owner
    /// @param spender Address of the spender
    /// @param value Amount of tokens to permit
    /// @param deadline Deadline of the permit
    /// @param v ECDSA signature v
    /// @param r ECDSA signature r
    /// @param s ECDSA signature s
    struct Params {
        address tokenAddr;
        address owner;
        address spender;
        uint256 value;
        uint256 deadline;
        uint8 v;
        bytes32 r;
        bytes32 s;
    }

    /// @inheritdoc ActionBase
    function executeAction(bytes memory _callData, bytes32[] memory, uint8[] memory, bytes32[] memory)
        public
        payable
        virtual
        override
        returns (bytes32)
    {
        Params memory inputData = parseInputs(_callData);

        ///@dev nothing will be piped and potentially replaced as we need to have the exact values as signed

        _permitToken(inputData);

        return bytes32(inputData.value);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _permitToken(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _permitToken(Params memory _params) internal {
        uint256 startingNonce = IERC20Permit(_params.tokenAddr).nonces(_params.owner);
        IERC20Permit(_params.tokenAddr)
            .permit(_params.owner, _params.spender, _params.value, _params.deadline, _params.v, _params.r, _params.s);
        /// @notice Every successful call to permit increases owners nonce by one.
        require(IERC20Permit(_params.tokenAddr).nonces(_params.owner) == startingNonce + 1);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
