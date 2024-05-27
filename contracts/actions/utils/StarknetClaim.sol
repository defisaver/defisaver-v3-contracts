// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { IStarknet } from "../../interfaces/IStarknet.sol";

/// @title Action that helps Smart wallets claim Starknet tokens
contract StarknetClaim is ActionBase {
    struct Params {
        uint256[] payload;
        uint256 gasPrice;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory,
        bytes32[] memory,
        uint8[] memory,
        bytes32[] memory
    ) public virtual override payable returns (bytes32) {}

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public override payable {
        Params memory inputData = parseInputs(_callData);
        _starknetClaim(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public virtual override pure returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _starknetClaim(Params memory _params) internal{
        IStarknet(0xc662c410C0ECf747543f5bA90660f6ABeBD9C8c4).sendMessageToL2{value: 4000 * _params.gasPrice}(
            uint256(0x026942155437167f8a18c2602637e30d636f0ce7a88d5ed465f8d1f08f1ea015),
            uint256(0x00828430c65c40cba334d4723a4c5c02a62f612d73d564a1c7dc146f1d0053f9),
            _params.payload
        );
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
