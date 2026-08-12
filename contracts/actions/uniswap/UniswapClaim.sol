// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { ActionBase } from "../ActionBase.sol";
import { TokenUtils } from "../../utils/token/TokenUtils.sol";
import {
    IUniswapMerkleDistributor
} from "../../interfaces/protocols/uniswap/IUniswapMerkleDistributor.sol";

/// @title UniswapClaim
contract UniswapClaim is ActionBase {
    using TokenUtils for address;

    address constant UNISWAP_CLAIM_CONTRACT = 0x090D4613473dEE047c3f2706764f49E0821D256e;
    address constant UNI_TOKEN = 0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984;

    /// @param index Index of the claim in the merkle tree
    /// @param to Address where to send the claimed UNI
    /// @param amount Amount of UNI allocated to the smart wallet in the merkle tree
    /// @param merkleProof Merkle proof of the claim
    struct Params {
        uint256 index;
        address to;
        uint256 amount;
        bytes32[] merkleProof;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.index = _parseParamUint(params.index, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[2], _subData, _returnValues);

        (uint256 claimedAmount, bytes memory logData) = _claim(params);

        emit ActionEvent("UniswapClaim", logData);
        return bytes32(claimedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);

        (, bytes memory logData) = _claim(params);

        logger.logActionDirectEvent("UniswapClaim", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/

    function _claim(Params memory _params)
        internal
        returns (uint256 claimedAmount, bytes memory logData)
    {
        uint256 startingBalance = UNI_TOKEN.getBalance(address(this));
        IUniswapMerkleDistributor(UNISWAP_CLAIM_CONTRACT)
            .claim(_params.index, address(this), _params.amount, _params.merkleProof);
        claimedAmount = UNI_TOKEN.getBalance(address(this)) - startingBalance;
        UNI_TOKEN.withdrawTokens(_params.to, claimedAmount);

        logData = abi.encode(claimedAmount, _params);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
