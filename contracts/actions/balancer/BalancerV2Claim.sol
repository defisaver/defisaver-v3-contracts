// SPDX-License-Identifier: MIT

pragma solidity =0.8.4;
pragma experimental ABIEncoderV2;

import "../ActionBase.sol";
import "../../utils/TokenUtils.sol";
import "../../interfaces/balancer/IMerkleRedeem.sol";
import "./helpers/BalancerV2Helper.sol";

/// @title Claim BAL tokens
contract BalancerV2Claim is ActionBase, BalancerV2Helper {
    using TokenUtils for address;

    IMerkleRedeem public constant merkleRedeemer = IMerkleRedeem(MERKLE_REDEEM_ADDR);

    /// @param liquidityProvider - The address of the liquidity provider that the tokens are claimed for
    /// @param to - The address to which to send Balancer tokens to
    /// @param week - List of weeks for which to claim balancer tokens for
    /// @param balances - Amounts of balances to claim
    /// @param merkleProofs - Array of bytes32[] merkle proofs
    /// @dev week - balances - merkleProofs arrays must be the same lengths
    struct Params {
        address liquidityProvider;
        address to;
        uint256[] week;
        uint256[] balances;
        bytes32[][] merkleProofs;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
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
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory inputData = parseInputs(_callData);
        
        claim(inputData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    //////////////////////////// ACTION LOGIC ////////////////////////////
    function claim(Params memory _inputData) internal returns (uint256 balClaimedAmount) {
        require(_inputData.to != address(0), ADDR_MUST_NOT_BE_ZERO);
        IMerkleRedeem.Claim[] memory claims = packClaims(_inputData.week, _inputData.balances, _inputData.merkleProofs);
        
        balClaimedAmount = balToken.getBalance(_inputData.liquidityProvider);
        merkleRedeemer.claimWeeks(_inputData.liquidityProvider, claims);
        balClaimedAmount = balToken.getBalance(_inputData.liquidityProvider) - balClaimedAmount;
        
        /// @dev if _to isn't the same as _lp, liquidityProvider needs to approve DSProxy to pull BAL tokens
        if (_inputData.to != _inputData.liquidityProvider) {
            balToken.pullTokensIfNeeded(_inputData.liquidityProvider, balClaimedAmount);
            balToken.withdrawTokens(_inputData.to, balClaimedAmount);
        }

        logger.Log(
            address(this),
            msg.sender,
            "BalancerV2Claim",
            abi.encode(_inputData, balClaimedAmount)
        );
    }

    /// @dev Decoding Claims[] from _callData returns stack too deep error, so packing must be done onchain
    function packClaims(uint256[] memory _weeks, uint256[] memory _balances, bytes32[][] memory _merkleProofs) internal pure returns (IMerkleRedeem.Claim[] memory){
        require(_weeks.length == _balances.length && _weeks.length == _merkleProofs.length);

        IMerkleRedeem.Claim[] memory claims = new IMerkleRedeem.Claim[](_weeks.length);

        for (uint256 i = 0; i < _weeks.length; i++){
            claims[i] = IMerkleRedeem.Claim(_weeks[i], _balances[i], _merkleProofs[i]);
        }

        return claims;
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
