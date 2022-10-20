// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;


import "../../interfaces/mstable/IBoostedVaultWithLockup.sol";
import "./helpers/MStableHelper.sol";
import "../../utils/TokenUtils.sol";
import "../../utils/SafeMath.sol";
import "../ActionBase.sol";

/// @title Claim staking rewards from the Savings Vault
contract MStableClaim is ActionBase, MStableHelper {
    using TokenUtils for address;
    using SafeMath for uint256;

    /// @param vaultAddress Vault contract address for the imAsset (imAssetVault address)
    /// @param to  The address that will receive the claimed MTA rewards
    /// @param first Index of the first array element to claim
    /// @param last Index of the last array element to claim
    struct Params {
        address vaultAddress;   
        address to;            
        uint256 first;
        uint256 last;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.vaultAddress = _parseParamAddr(params.vaultAddress, _paramMapping[0], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[1], _subData, _returnValues);
        
        (uint256 claimed, bytes memory logData) = _mStableClaim(params);
        emit ActionEvent("MStableClaim", logData);
        return bytes32(claimed);
    }

    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _mStableClaim(params);
        logger.logActionDirectEvent("MStableClaim", logData);
    }

    /// @notice Action that claims staking rewards from the Savings Vault
    function _mStableClaim(Params memory _params) internal returns (uint256 claimed, bytes memory logData) {
        claimed = MTA.getBalance(address(this));
        IBoostedVaultWithLockup(_params.vaultAddress).claimRewards(_params.first, _params.last);

        claimed = MTA.getBalance(address(this)).sub(claimed);
        
        MTA.withdrawTokens(_params.to, claimed);

        logData = abi.encode(_params, claimed);
    }

    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseInputs(bytes memory _callData)
        internal
        pure
        returns (
            Params memory params
        )
    {
        params = abi.decode(_callData, (Params));
    }
}