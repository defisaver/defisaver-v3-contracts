// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IAddressesRegistry } from "../../../interfaces/liquityV2/IAddressesRegistry.sol";
import { IBorrowerOperations } from "../../../interfaces/liquityV2/IBorrowerOperations.sol";

import { LiquityV2Helper } from "../helpers/LiquityV2Helper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Opens a LiquityV2 trove on a specific market
/// @notice Opening a trove requires fixed fee of 0.0375 WETH on LiquityV2, regardless of market used.
contract LiquityV2Open is ActionBase, LiquityV2Helper {
    using TokenUtils for address;

    error NotEnoughWethForCollateralAndGasCompensation(uint256 amount);

    /// @param market The address of the LiquityV2 market (collateral branch)
    /// @param from The address to pull the tokens from
    /// @param to The address to send the bold tokens to
    /// @param interestBatchManager The address of the interest batch manager
    ///                             (optional - set to address(0) if trove will not join the batch)
    /// @param ownerIndex The index of the owner used to calculate the trove ID
    ///                   troveId = keccak256(owner, ownerIndex)
    /// @param collAmount The amount of collateral to deposit
    /// @param boldAmount The amount of BOLD to mint
    /// @param upperHint The upper hint for the trove
    /// @param lowerHint The lower hint for the trove. See LiquityV2View for fetching hints
    /// @param annualInterestRate The annual interest rate for the trove
    ///                           (in 1e16) - 50000000000000000 => 5% annual interest
    ///                           Optional if joining interest batch manager
    /// @param maxUpfrontFee The maximum upfront fee to pay
    ///                      (see IHintHelpers:predictOpenTroveUpfrontFee && predictOpenTroveAndJoinBatchUpfrontFee)
    struct Params {
        address market;
        address from;
        address to;
        address interestBatchManager;
        uint256 ownerIndex;
        uint256 collAmount;
        uint256 boldAmount;
        uint256 upperHint;
        uint256 lowerHint;
        uint256 annualInterestRate;
        uint256 maxUpfrontFee;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.market = _parseParamAddr(params.market, _paramMapping[0], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[1], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[2], _subData, _returnValues);
        params.interestBatchManager =
            _parseParamAddr(params.interestBatchManager, _paramMapping[3], _subData, _returnValues);
        params.ownerIndex = _parseParamUint(params.ownerIndex, _paramMapping[4], _subData, _returnValues);
        params.collAmount = _parseParamUint(params.collAmount, _paramMapping[5], _subData, _returnValues);
        params.boldAmount = _parseParamUint(params.boldAmount, _paramMapping[6], _subData, _returnValues);
        params.upperHint = _parseParamUint(params.upperHint, _paramMapping[7], _subData, _returnValues);
        params.lowerHint = _parseParamUint(params.lowerHint, _paramMapping[8], _subData, _returnValues);
        params.annualInterestRate =
            _parseParamUint(params.annualInterestRate, _paramMapping[9], _subData, _returnValues);
        params.maxUpfrontFee = _parseParamUint(params.maxUpfrontFee, _paramMapping[10], _subData, _returnValues);

        (uint256 collAmount, bytes memory logData) = _liquityOpen(params);
        emit ActionEvent("LiquityV2Open", logData);
        return bytes32(collAmount);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _liquityOpen(params);
        logger.logActionDirectEvent("LiquityV2Open", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _liquityOpen(Params memory _params) internal returns (uint256, bytes memory) {
        address collToken = IAddressesRegistry(_params.market).collToken();

        _pullCollateralAndGasCompensation(_params, collToken);

        address borrowerOperations = IAddressesRegistry(_params.market).borrowerOperations();

        _approveCollateralAndGasCompensation(_params, collToken, borrowerOperations);

        if (_params.interestBatchManager != address(0)) {
            IBorrowerOperations(borrowerOperations).openTroveAndJoinInterestBatchManager(
                IBorrowerOperations.OpenTroveAndJoinInterestBatchManagerParams({
                    owner: address(this),
                    ownerIndex: _params.ownerIndex,
                    collAmount: _params.collAmount,
                    boldAmount: _params.boldAmount,
                    upperHint: _params.upperHint,
                    lowerHint: _params.lowerHint,
                    interestBatchManager: _params.interestBatchManager,
                    maxUpfrontFee: _params.maxUpfrontFee,
                    addManager: address(0),
                    removeManager: address(0),
                    receiver: address(0)
                })
            );
        } else {
            IBorrowerOperations(borrowerOperations).openTrove(
                address(this),
                _params.ownerIndex,
                _params.collAmount,
                _params.boldAmount,
                _params.upperHint,
                _params.lowerHint,
                _params.annualInterestRate,
                _params.maxUpfrontFee,
                address(0),
                address(0),
                address(0)
            );
        }

        BOLD_ADDR.withdrawTokens(_params.to, _params.boldAmount);

        return (_params.collAmount, abi.encode(_params));
    }

    function _pullCollateralAndGasCompensation(Params memory _params, address _collToken) internal {
        if (_collToken == TokenUtils.WETH_ADDR) {
            bool isMaxPull = _params.collAmount == type(uint256).max;

            // when pulling max amount, we need to leave some WETH for gas compensation
            if (isMaxPull) {
                _params.collAmount = _collToken.pullTokensIfNeeded(_params.from, _params.collAmount);

                // This will revert on underflow anyway, added here to better communicate the error to the caller
                if (_params.collAmount <= ETH_GAS_COMPENSATION) {
                    revert NotEnoughWethForCollateralAndGasCompensation(_params.collAmount);
                }
                _params.collAmount -= ETH_GAS_COMPENSATION;
            } else {
                _collToken.pullTokensIfNeeded(_params.from, _params.collAmount + ETH_GAS_COMPENSATION);
            }
        } else {
            _params.collAmount = _collToken.pullTokensIfNeeded(_params.from, _params.collAmount);
            TokenUtils.WETH_ADDR.pullTokensIfNeeded(_params.from, ETH_GAS_COMPENSATION);
        }
    }

    function _approveCollateralAndGasCompensation(
        Params memory _params,
        address _collToken,
        address _borrowerOperations
    ) internal {
        if (_collToken == TokenUtils.WETH_ADDR) {
            _collToken.approveToken(_borrowerOperations, _params.collAmount + ETH_GAS_COMPENSATION);
        } else {
            _collToken.approveToken(_borrowerOperations, _params.collAmount);
            TokenUtils.WETH_ADDR.approveToken(_borrowerOperations, ETH_GAS_COMPENSATION);
        }
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
