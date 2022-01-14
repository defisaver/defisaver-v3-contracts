// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";
import "./helpers/MStableHelper.sol";

contract MStableDeposit is ActionBase, MStableHelper {
    using TokenUtils for address;

    struct Params {
        address bAsset;         // base asset address
        address mAsset;         // the corresponding meta asset
        address saveAddress;    // save contract address for the mAsset (imAsset address)
        address vaultAddress;   // vault contract address for the imAsset (imAssetVault address)
        address from;           // address from where to pull the entry asset
        address to;             // address that will receive the exit asset
        uint256 amount;         // amount of entry asset to deposit
        uint256 minOut;         // minimum amount of mAsset to accept (if entry asset is base asset)
        AssetPair assetPair;    // entry and exit asset pair enum
    }

    function executeAction(
        bytes[] memory _callData,
        bytes[] memory _subData,
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
        
        uint256 deposited = _mStableDeposit(params);
        return bytes32(deposited);
    }

    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        _mStableDeposit(params);
    }
    
    /// @notice Action that deposits an entry asset and withdraws an exit asset from mStable
    function _mStableDeposit(Params memory _params) internal returns (uint256) {
        require(_params.to != address(0), "Recipient can't be address(0)");
        
        AssetPair assetPair = _params.assetPair;
        uint256 amount = _params.amount;
        if (assetPair == AssetPair.BASSET_MASSET) {
            amount = _params.bAsset.pullTokensIfNeeded(_params.from, amount);
            amount = _mintMAsset(_params.bAsset, _params.mAsset, amount, _params.minOut, _params.to);
        } 
        else
        if (assetPair == AssetPair.BASSET_IMASSET) {
            amount = _params.bAsset.pullTokensIfNeeded(_params.from, amount);
            amount = _mintMAsset(_params.bAsset, _params.mAsset, amount, _params.minOut, address(this));
            amount = _saveMAsset(_params.mAsset, _params.saveAddress, amount, _params.to);
        }
        else
        if (assetPair == AssetPair.BASSET_IMASSETVAULT) {
            amount = _params.bAsset.pullTokensIfNeeded(_params.from, amount);
            amount = _mintMAsset(_params.bAsset, _params.mAsset, amount, _params.minOut, address(this));
            amount = _saveMAsset(_params.mAsset, _params.saveAddress, amount, address(this));
            amount = _stakeImAsset(_params.saveAddress, _params.vaultAddress, amount, _params.to);
        }
        else
        if (assetPair == AssetPair.MASSET_IMASSET) {
            amount = _params.mAsset.pullTokensIfNeeded(_params.from, amount);
            amount = _saveMAsset(_params.mAsset, _params.saveAddress, amount, _params.to);
        }
        else
        if (assetPair == AssetPair.MASSET_IMASSETVAULT) {
            amount = _params.mAsset.pullTokensIfNeeded(_params.from, amount);
            amount = _saveMAsset(_params.mAsset, _params.saveAddress, amount, address(this));
            amount = _stakeImAsset(_params.saveAddress, _params.vaultAddress, amount, _params.to);
        }
        else {
            assert(assetPair == AssetPair.IMASSET_IMASSETVAULT);
            amount = _params.saveAddress.pullTokensIfNeeded(_params.from, amount);
            amount = _stakeImAsset(_params.saveAddress, _params.vaultAddress, amount, _params.to);
        }

        logger.Log(
            address(this),
            msg.sender,
            "MStableDeposit",
            abi.encode(
                amount
            )
        );

        return amount;
    }

    function actionType() public pure override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseInputs(bytes[] memory _callData)
        internal
        pure
        returns (
            Params memory params
        )
    {
        params = abi.decode(_callData[0], (Params));
    }
}