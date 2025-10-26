// SPDX-License-Identifier: MIT
pragma solidity =0.8.24;

import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import { ActionBase } from "../ActionBase.sol";
import { IEtherFiClaim } from "../../interfaces/protocols/etherFi/IEtherFiClaim.sol";

/// @title Action to Claim KING token as EtherFi reward on behalf of smart wallet
contract KingClaim is ActionBase {
    using TokenUtils for address;

    address constant KING_CLAIM_CONTRACT = 0x6Db24Ee656843E3fE03eb8762a54D86186bA6B64;
    address constant KING_TOKEN = 0x8F08B70456eb22f6109F57b8fafE862ED28E6040;

    /// @param to Address where to send the KING token
    /// @param amount Amount of KING token to claim
    /// @param merkleRoot Merkle root of the claim
    /// @param merkleProof Merkle proof of the claim
    struct Params {
        address to;
        uint256 amount;
        bytes32 merkleRoot;
        bytes32[] merkleProof;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.to = _parseParamAddr(inputData.to, _paramMapping[0], _subData, _returnValues);
        inputData.amount = _parseParamUint(inputData.amount, _paramMapping[1], _subData, _returnValues);

        _claim(inputData);

        return bytes32(inputData.amount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);

        _claim(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////

    function _claim(Params memory params) internal {
        uint256 startingBalance = KING_TOKEN.getBalance(address(this));
        IEtherFiClaim(KING_CLAIM_CONTRACT).claim(address(this), params.amount, params.merkleRoot, params.merkleProof);
        uint256 claimedAmount = KING_TOKEN.getBalance(address(this)) - startingBalance;
        KING_TOKEN.withdrawTokens(params.to, claimedAmount);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
