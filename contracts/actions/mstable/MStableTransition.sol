// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma experimental ABIEncoderV2;

import "contracts/interfaces/mstable/ImAsset.sol";
import "contracts/interfaces/mstable/IBoostedVaultWithLockup.sol";
import "contracts/interfaces/mstable/ISavingsContractV2.sol";
import "contracts/utils/TokenUtils.sol";
import "../ActionBase.sol";

contract MStableTransition is ActionBase {
    using TokenUtils for address;

    enum AssetType {
        BASSET,
        MASSET,
        IMASSET,
        IMASSETVAULT
    }

    // every two neighbouring AssetTypes form a Transition pair
    enum Transition {
        BASSET_MASSET,
        MASSET_IMASSET,
        IMASSET_IMASSETVAULT
    }

    struct Params {
        address bAsset;         // In order for the call to produce the wanted transition
        address mAsset;         // the caller needs to specify ONLY the addresses of assets used in the transition. 
        address saveAddress;    // Eg. if the caller wants to enter with bAsset and exit with imAsset
        address vaultAddress;   // bAsset, mAsset and saveAddress would need to be specified, leaving vaultAddress = address(0)
        address from;           // Address from which to pull the entry asset
        address to;             // Address that will receive the exit asset
        uint256 amount;         // Amount of entry asset to pull
        uint256 minOut;         // Only used in BASSET_MASSET transition, minimum amount of target token to accept
        bool withdraw;          // Dictates the direction of transition flow
        // Using the previous example, if we wanted to enter with imAsset and exit with bAsset we would specify the same addresses
        // The only difference would be Params.withdraw = true
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
        params.withdraw = _parseParamUint(params.withdraw ? 1 : 0, _paramMapping[8], _subData, _returnValues) == 0 ? false : true;
        
        uint256 transientAmount = _mStableTransition(params);
        return bytes32(transientAmount);
    }

    function executeActionDirect(bytes[] memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        _mStableTransition(params);
    }

    /// @notice Action that enters the mStable protocol with one asset and exits with another
    function _mStableTransition(Params memory _params) internal returns (uint256 transientAmount) {
        // determine first and last AssetType in transition flow
        (AssetType fromAssetType, AssetType toAssetType) = _calcEntryAndExitAssets(_params);
        address[4] memory assets = [
            _params.bAsset,
            _params.mAsset,
            _params.saveAddress,
            _params.vaultAddress
        ];
        // figuring out which assets to pull and send
        // this could be done without an array if we mload the addresses from _params, assembly required
        address fromAsset = assets[uint8(fromAssetType)];
        address toAsset = assets[uint8(toAssetType)];
        
        // first and last transition in transition flow
        // will always be valid Transition enums
        Transition currentTransition = Transition(_params.withdraw ? uint8(fromAssetType) - 1: uint8(fromAssetType));
        Transition lastTransition = Transition(_params.withdraw ? uint8(toAssetType): uint8(toAssetType) - 1);

        // pulling entry asset
        if (fromAssetType == AssetType.IMASSETVAULT) {
            if (_params.amount == type(uint256).max) {
                // not a transferable token, cant pull
                _params.amount = IBoostedVaultWithLockup(_params.vaultAddress).rawBalanceOf(address(this));
            }
        }
        else {
            if (_params.amount == type(uint256).max) {
                _params.amount = fromAsset.getBalance(_params.from);
            }
            fromAsset.pullTokensIfNeeded(_params.from, _params.amount);
        }
        
        // transition flow loop
        // this loop halts
        while (true) {
            bool isLast = currentTransition == lastTransition;
            _params.amount = _executeTransition(
                _params,
                currentTransition,
                isLast
            );
            if (isLast) break;
            currentTransition = (_params.withdraw ?
                Transition(uint8(currentTransition) - 1):
                Transition(uint8(currentTransition) + 1)
            );
        }

        // withdrawing exit asset
        // withdrawing assets resulting from a deposit transition flow is handled in the _executeTransition function
        // withdrawing BASEASSET is also handled in the _executeTransition function (only happens in withdraw transition flow)
        // this design decision was made so that we wouldnt have unneeded token transfers between the proxy and the _params.to address
        // withdrawing to another address is not possible with IMASSET and IMASSETVAULT, hence this logic branch  
        if (_params.withdraw && toAssetType != AssetType.BASSET) {
            toAsset.withdrawTokens(_params.to, _params.amount);
        }

        logger.Log(
            address(this),
            msg.sender,
            "MStableTransition",
            abi.encode(
                _params.amount
            )
        );

        return _params.amount;
    }

    /// @dev This function was made in order to keep the interface of the previous mStable actions
    ///      Decide if we should just add these enums to Params 
    function _calcEntryAndExitAssets(Params memory _params) internal pure returns (
        AssetType fromAssetType,
        AssetType toAssetType
    ) {
        uint8 b = _params.bAsset == address(0) ? 0: 1;
        uint8 m = _params.mAsset == address(0) ? 0: 1;
        uint8 i = _params.saveAddress == address(0) ? 0: 1;
        uint8 v = _params.vaultAddress == address(0) ? 0: 1;
        require(b + m + i + v > 1, "Entry and exit assets must be different");
        
        // logic is correct (used karnaugh maps)
        uint8 valid = ((b ^ 1) | m) & (i | (v ^ 1));
        require(valid == 1, "Must specify every asset used in the transition");

        // these expresions make a 2 bit number, so they will always be valid AssetType enums
        fromAssetType = AssetType(
            (((b ^ 1) & (m ^ 1)) << 1) | (b ^ 1) & m
        );
        toAssetType = AssetType(
            (i << 1) | ((i ^ 1) | v)
        );

        // flow direction reversed if withdrawing (withdraw transition flow)
        if (_params.withdraw) {
            (fromAssetType, toAssetType) = (toAssetType, fromAssetType);
        }
    }

    /// @notice Converts an AssetType to its immediate neighbour AssetType
    /// @dev The direction of conversion is determined by _params.withdraw
    function _executeTransition(
        Params memory _params,
        Transition _currentTransition,
        bool _isLastTransition
    ) internal returns (
        uint256 transientAmount
    ) {
        address currentTo = _isLastTransition ? _params.to : address(this);
        if (_params.withdraw) {
            if (_currentTransition == Transition.BASSET_MASSET) {
                // if we want to log transientAmounts, a struct containing them must be passed between internal functions
                assert(_isLastTransition);
                return ImAsset(
                    _params.mAsset
                ).redeem(_params.bAsset, _params.amount, _params.minOut, _params.to);
            }
            if (_currentTransition == Transition.MASSET_IMASSET) {
                return ISavingsContractV2(
                    _params.saveAddress
                ).redeemCredits(_params.amount);
            }
            if (_currentTransition == Transition.IMASSET_IMASSETVAULT) {
                IBoostedVaultWithLockup(
                    _params.vaultAddress
                ).withdraw(_params.amount);
                return _params.amount;
            }
        }
        else {
            if (_currentTransition == Transition.BASSET_MASSET) {
                _params.bAsset.approveToken(_params.mAsset, _params.amount);
                return ImAsset(_params.mAsset).mint(
                    _params.bAsset,
                    _params.amount,
                    _params.minOut,
                    currentTo
                );
            }
            if (_currentTransition == Transition.MASSET_IMASSET) {
                _params.mAsset.approveToken(_params.saveAddress, _params.amount);
                return ISavingsContractV2(_params.saveAddress).depositSavings(
                    _params.amount,
                    currentTo
                );
            }
            if (_currentTransition == Transition.IMASSET_IMASSETVAULT) {
                assert(_isLastTransition);
                _params.saveAddress.approveToken(_params.vaultAddress, _params.amount);
                IBoostedVaultWithLockup(_params.vaultAddress).stake(_params.to, _params.amount);
                return _params.amount;
            }
        }
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