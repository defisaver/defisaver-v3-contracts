// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "contracts/interfaces/mstable/ImAsset.sol";
import "contracts/interfaces/mstable/IBoostedVaultWithLockup.sol";
import "contracts/interfaces/mstable/ISavingsContractV2.sol";
import "contracts/utils/TokenUtils.sol";
import "../ActionBase.sol";

contract MStableDeposit is ActionBase {
    using TokenUtils for address;

    struct Params {
        address bAsset;
        address mAsset;
        address saveAddress;
        address vaultAddress;
        address from;
        address to;
        uint256 amount;
        uint256 minOut;
        bool stake;
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
        params.stake = _parseParamUint(params.stake ? 1 : 0, _paramMapping[8], _subData, _returnValues) == 0 ? false : true;
        
        uint256 credits = _mStableDeposit(params);
        return bytes32(credits);
    }

    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        _mStableDeposit(params);
    }

    function _mStableDeposit(Params memory _params) internal returns (uint256 credits) {
        // _params.to = 0 will revert
        // _params.amount = 0 will revert
        if (_params.amount == type(uint256).max) {
            _params.amount = _params.bAsset.getBalance(_params.from);
        }
        _params.bAsset.pullTokensIfNeeded(_params.from, _params.amount);
        _params.bAsset.approveToken(_params.mAsset, _params.amount);

        uint256 mAssetsMinted = ImAsset(_params.mAsset).mint(_params.bAsset, _params.amount, _params.minOut, address(this));

        _params.mAsset.approveToken(_params.saveAddress, mAssetsMinted);
        if (_params.stake) {
            credits = ISavingsContractV2(_params.saveAddress).depositSavings(mAssetsMinted, address(this));
            _params.saveAddress.approveToken(_params.vaultAddress, credits);
            IBoostedVaultWithLockup(_params.vaultAddress).stake(_params.to, credits);
        } else {
            credits = ISavingsContractV2(_params.saveAddress).depositSavings(mAssetsMinted, _params.to);
        }

        logger.Log(
            address(this),
            msg.sender,
            "MStableDeposit",
            abi.encode(
                _params,
                credits
            )
        );
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