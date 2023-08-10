// SPDX-License-Identifier: MIT
pragma solidity =0.8.10;

import "../../interfaces/IERC4626.sol";
import "../../utils/TokenUtils.sol";
import "../ActionBase.sol";


/// @notice Action that handles ERC4626 vault operations
/// @dev MAXUINT amount is possible for DEPOSIT and REDEEM operations
contract TokenizedVaultAdapter is ActionBase {
    using TokenUtils for address;

    error TokenizedVaultSlippageHit(Params, uint256 returnAmount);
    error TokenizedVaultUndefinedAction();

    enum OperationId {
        DEPOSIT,
        MINT,
        WITHDRAW,
        REDEEM
    }

    /// @param amount - For DEPOSIT and REDEEM represents exact input token amount, otherwise represents exact output
    /// @param minOutOrMaxIn - For DEPOSIT and REDEEM represents min output token amount, otherwise represents max input
    /// @param vaultAddress - Address of the ERC4626 vault
    /// @param from - Address from which to pull the input token
    /// @param to - Asset that will receive the output token
    /// @param operationId - Enum id that represents the selected operation (DEPOSIT, MINT, WITHDRAW, REDEEM)
    struct Params {
        uint256 amount;
        uint256 minOutOrMaxIn;
        address vaultAddress;
        address from;
        address to;
        OperationId operationId;
    }

    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.amount = _parseParamUint(params.amount, _paramMapping[0], _subData, _returnValues);
        params.minOutOrMaxIn = _parseParamUint(params.minOutOrMaxIn, _paramMapping[1], _subData, _returnValues);
        params.vaultAddress = _parseParamAddr(params.vaultAddress, _paramMapping[2], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[3], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[4], _subData, _returnValues);
        params.operationId = OperationId(_parseParamUint(uint8(params.operationId), _paramMapping[5], _subData, _returnValues));

        (bytes memory logData, uint256 returnAmount) = _executeOperation(params);
        emit ActionEvent("TokenizedVaultAdapter", logData);
        return bytes32(returnAmount);
    }

    function executeActionDirect(bytes memory _callData) public payable virtual override {
        Params memory params = parseInputs(_callData);
        (bytes memory logData, ) = _executeOperation(params);
        logger.logActionDirectEvent("TokenizedVaultAdapter", logData);
    }

    function _executeOperation(Params memory _params) internal returns (bytes memory logData, uint256) {
        IERC4626 vault = IERC4626(_params.vaultAddress);

        if (_params.from == address(0)) {
            _params.from = address(this);
        }

        if (_params.to == address(0)) {
            _params.to = address(this);
        }

        if (_params.operationId == OperationId.REDEEM) {
            if (_params.amount == type(uint256).max) {
                _params.amount = vault.balanceOf(_params.from);
            }
            uint256 assetsWithdrawn = vault.redeem(_params.amount, _params.to, _params.from);
            if (assetsWithdrawn < _params.minOutOrMaxIn) revert TokenizedVaultSlippageHit(_params, assetsWithdrawn);
            logData = abi.encode(_params, assetsWithdrawn);
            return (logData, assetsWithdrawn);
        }

        if (_params.operationId == OperationId.WITHDRAW) {
            uint256 sharesBurned = vault.withdraw(_params.amount, _params.to, _params.from);
            if (sharesBurned > _params.minOutOrMaxIn) revert TokenizedVaultSlippageHit(_params, sharesBurned);
            logData = abi.encode(_params, sharesBurned);
            return (logData, sharesBurned);
        }

        address assetAddress = vault.asset();

        if (_params.operationId == OperationId.DEPOSIT) {
            _params.amount = assetAddress.pullTokensIfNeeded(_params.from, _params.amount);
            assetAddress.approveToken(address(vault), _params.amount);

            uint256 sharesMinted = vault.deposit(_params.amount, _params.to);
            if (sharesMinted < _params.minOutOrMaxIn) revert TokenizedVaultSlippageHit(_params, sharesMinted);
            logData = abi.encode(_params, sharesMinted);
            return (logData, sharesMinted);
        }

        if (_params.operationId == OperationId.MINT) {
            uint256 assetsToDeposit = vault.previewMint(_params.amount);
            if (assetsToDeposit > _params.minOutOrMaxIn) revert TokenizedVaultSlippageHit(_params, assetsToDeposit);

            uint256 pulledAssetAmount = assetAddress.pullTokensIfNeeded(_params.from, assetsToDeposit);
            assetAddress.approveToken(address(vault), pulledAssetAmount);

            uint256 assetsDeposited = vault.mint(_params.amount, _params.to);
            if (pulledAssetAmount > assetsDeposited) {
                assetAddress.withdrawTokens(_params.to, pulledAssetAmount - assetsDeposited);
            }
            logData = abi.encode(_params, assetsDeposited);
            return (logData, assetsDeposited);
        }

        revert TokenizedVaultUndefinedAction();
    }

    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
