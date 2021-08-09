// SPDX-License-Identifier: MIT

pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../DS/DSMath.sol";
import "../../interfaces/balancer/IMerkleReedem.sol";

/// @title Claim BAL tokens
contract BalancerV2ClaimAction is ActionBase, DSMath {
    using TokenUtils for address;
    IMerkleReedem public constant merkleReedemer = IMerkleReedem(0x6d19b2bF3A36A61530909Ae65445a906D98A2Fa8);
    address public constant balToken = 0xba100000625a3754423978a60c9317c58a424e3D;

    struct Params {
        address liquidityProvider;
        address to;
        IMerkleReedem.Claim[] claims;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory inputData = parseInputs(_callData);

        inputData.liquidityProvider = _parseParamAddr(inputData.liquidityProvider, _paramMapping[0], _subData, _returnValues);
        inputData.to = _parseParamAddr(inputData.to, _paramMapping[1], _subData, _returnValues);
        
        uint256 balClaimedAmount = claim(inputData);
        return bytes32(balClaimedAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        
        claim(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
    function claim(Params memory _inputData) internal returns (uint256 balClaimedAmount) {
        balClaimedAmount = balToken.getBalance(_inputData.liquidityProvider);
        merkleReedemer.claimWeeks(_inputData.liquidityProvider, _inputData.claims);
        balClaimedAmount = sub(balToken.getBalance(_inputData.liquidityProvider), balClaimedAmount);
        
        if (_inputData.to != _inputData.liquidityProvider && _inputData.to != address(0)) {
            balToken.withdrawTokens(_inputData.to, balClaimedAmount);
        }
        logger.Log(
            address(this),
            msg.sender,
            "BalancerV2Claim",
            abi.encode(_inputData, balClaimedAmount)
        );
    }

    function parseInputs(bytes[] memory _callData) internal pure returns (Params memory inputData) {
        inputData = abi.decode(_callData[0], (Params));
    }
}
