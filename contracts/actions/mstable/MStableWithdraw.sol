// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;


import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/MStableHelper.sol";

/// @title Action that withdraws the base asset from the Savings Contract, or if unstaking, from the Savings Vault
contract MStableWithdraw is ActionBase, MStableHelper {
    using TokenUtils for address;

    /// @param bAsset base asset address
    /// @param mAsset the corresponding meta asset
    /// @param saveAddress save contract address for the mAsset (imAsset address)
    /// @param vaultAddress vault contract address for the imAsset (imAssetVault address)
    /// @param from address from where to pull the entry asset
    /// @param to address that will receive the exit asset
    /// @param amount amount of entry asset to deposit
    /// @param minOut minimum amount of mAsset to accept (if entry asset is base asset)
    /// @param assetPair entry and exit asset pair enum
    struct Params {
        address bAsset;       
        address mAsset;      
        address saveAddress;    
        address vaultAddress;
        address from;          
        address to;             
        uint256 amount;        
        uint256 minOut;        
        AssetPair assetPair;    
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable override returns (bytes32) {
        Params memory params = parseInputs(_callData);
        params.bAsset = _parseParamAddr(params.bAsset, _paramMapping[0], _subData, _returnValues);
        params.mAsset = _parseParamAddr(params.mAsset, _paramMapping[1], _subData, _returnValues);
        params.saveAddress = _parseParamAddr(params.saveAddress, _paramMapping[2], _subData, _returnValues);
        params.vaultAddress = _parseParamAddr(params.vaultAddress, _paramMapping[3], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[4], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[5], _subData, _returnValues);
        params.amount = _parseParamUint(params.amount, _paramMapping[6], _subData, _returnValues);
        params.minOut = _parseParamUint(params.minOut, _paramMapping[7], _subData, _returnValues);
        params.assetPair = AssetPair(
            _parseParamUint(uint256(params.assetPair), _paramMapping[8], _subData, _returnValues)
        );
        
        (uint256 withdrawn, bytes memory logData) = _mStableWithdraw(params);
        emit ActionEvent("MStableWithdraw", logData);
        return bytes32(withdrawn);
    }

    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _mStableWithdraw(params);
        logger.logActionDirectEvent("MStableWithdraw", logData);
    }

    /// @notice Action that withdraws the base asset from the Savings Contract, or if unstaking, from the Savings Vault
    /// @dev If AssetPair == BASSET_IMASSET || AssetPair == MASSET_IMASSET the address from where we're pulling imAsset must approve proxy
    /// @dev If AssetPair == BASSET_MASSET the address from where we're pulling mAsset must approve proxy
    function _mStableWithdraw(Params memory _params) internal returns (uint256 amount, bytes memory logData) {
        require(_params.to != address(0), "Recipient can't be address(0)");

        AssetPair assetPair = _params.assetPair;
        amount = _params.amount;
        if (assetPair == AssetPair.IMASSET_IMASSETVAULT) {
            amount = _vaultBalance(_params.vaultAddress, address(this), amount);
            amount = _unstakeImAsset(_params.vaultAddress, amount);
            amount = _params.saveAddress.withdrawTokens(_params.to, amount);
        }
        else
        if (assetPair == AssetPair.MASSET_IMASSETVAULT) {
            amount = _vaultBalance(_params.vaultAddress, address(this), amount);
            amount = _unstakeImAsset(_params.vaultAddress, amount);
            amount = _withdrawSavedMAsset(_params.saveAddress, amount);
            amount = _params.mAsset.withdrawTokens(_params.to, amount);
        }
        else
        if (assetPair == AssetPair.BASSET_IMASSETVAULT) {
            amount = _vaultBalance(_params.vaultAddress, address(this), amount);
            amount = _unstakeImAsset(_params.vaultAddress, amount);
            amount = _withdrawSavedMAsset(_params.saveAddress, amount);
            amount = _redeemMAsset(_params.bAsset, _params.mAsset, amount, _params.minOut, _params.to);
        }
        else
        if (assetPair == AssetPair.MASSET_IMASSET) {
            amount = _params.saveAddress.pullTokensIfNeeded(_params.from, amount);
            amount = _withdrawSavedMAsset(_params.saveAddress, amount);
            amount = _params.mAsset.withdrawTokens(_params.to, amount);
        }
        else
        if (assetPair == AssetPair.BASSET_IMASSET) {
            amount = _params.saveAddress.pullTokensIfNeeded(_params.from, amount);
            amount = _withdrawSavedMAsset(_params.saveAddress, amount);
            amount = _redeemMAsset(_params.bAsset, _params.mAsset, amount, _params.minOut, _params.to);
        }
        else {
            assert(assetPair == AssetPair.BASSET_MASSET);
            amount = _params.mAsset.pullTokensIfNeeded(_params.from, amount);
            amount = _redeemMAsset(_params.bAsset, _params.mAsset, amount, _params.minOut, _params.to);
        }

        logData = abi.encode(amount);
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