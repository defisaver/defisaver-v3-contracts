// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT2 } from "../../../interfaces/fluid/IFluidVaultT2.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Withdraw assets from Fluid Vault T2 (2_col:1_debt)
contract FluidVaultT2Withdraw is ActionBase, FluidHelper {
    using TokenUtils for address;

    enum ShareType {
        VARIABLE,
        EXACT
    }

    /// @param collAmount0 Amount of collateral 0 to withdraw. If 0, withdraw only in collateral 1.
    /// @param collAmount1 Amount of collateral 1 to withdraw. If 0, withdraw only in collateral 0.
    /// @param maxCollSharesToBurn Max amount of collateral shares to burn.
    struct ShareVariableData {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 maxCollSharesToBurn;
    }

    /// @param perfectCollShares Exact amount of shares to burn. For max withdrawal pass type(uint256).max.
    /// @param minCollAmount0 Min amount of collateral 0 to withdraw. If 0, withdraw only in collateral 1.
    /// @param minCollAmount1 Min amount of collateral 1 to withdraw. If 0, withdraw only in collateral 0.
    struct ShareExactData {
        uint256 perfectCollShares;
        uint256 minCollAmount0;
        uint256 minCollAmount1;
    }

    struct Params {
        address vault;
        uint256 nftId;
        ShareType shareType;
        ShareVariableData variableData;
        ShareExactData exactData;
        address to;
    }

    /// @inheritdoc ActionBase
    function executeAction(
        bytes memory _callData,
        bytes32[] memory _subData,
        uint8[] memory _paramMapping,
        bytes32[] memory _returnValues
    ) public payable virtual override returns (bytes32) {
        Params memory params = parseInputs(_callData);

        params.vault = _parseParamAddr(params.vault, _paramMapping[0], _subData, _returnValues);
        params.nftId = _parseParamUint(params.nftId, _paramMapping[1], _subData, _returnValues);
        params.shareType = ShareType(_parseParamUint(uint8(params.shareType), _paramMapping[2], _subData, _returnValues));
        params.variableData.collAmount0 = _parseParamUint(
            params.variableData.collAmount0,
            _paramMapping[3],
            _subData,
            _returnValues
        );
        params.variableData.collAmount1 = _parseParamUint(
            params.variableData.collAmount1,
            _paramMapping[4],
            _subData,
            _returnValues
        );
        params.variableData.maxCollSharesToBurn = _parseParamUint(
            params.variableData.maxCollSharesToBurn,
            _paramMapping[5],
            _subData,
            _returnValues
        );
        params.exactData.perfectCollShares = _parseParamUint(
            params.exactData.perfectCollShares,
            _paramMapping[6],
            _subData,
            _returnValues
        );
        params.exactData.minCollAmount0 = _parseParamUint(
            params.exactData.minCollAmount0,
            _paramMapping[7],
            _subData,
            _returnValues
        );
        params.exactData.minCollAmount1 = _parseParamUint(
            params.exactData.minCollAmount1,
            _paramMapping[8],
            _subData,
            _returnValues
        );
        params.to = _parseParamAddr(params.to, _paramMapping[9], _subData, _returnValues);

        (uint256 shares, bytes memory logData) = _withdraw(params);
        emit ActionEvent("FluidVaultT2Withdraw", logData);
        return bytes32(shares);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _withdraw(params);
        logger.logActionDirectEvent("FluidVaultT2Withdraw", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _withdraw(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVaultT2.ConstantViews memory constants = IFluidVaultT2(_params.vault).constantsView();

        // TODO: Check which data to return here. We can't return both collateral amounts, so we will return the burned shares for now.
        uint256 sharesBurned = _params.shareType == ShareType.VARIABLE
            ? _withdrawVariable(_params, constants.supplyToken)
            : _withdrawExact(_params, constants.supplyToken);

        return (sharesBurned, abi.encode(_params));
    }

    function _withdrawVariable(
        Params memory _params,
        IFluidVaultT2.Tokens memory _tokens
    ) internal returns (uint256 collSharesBurned) {
        bool sendColl0AsWrapped =
            _tokens.token0 == TokenUtils.ETH_ADDR &&
            _params.variableData.collAmount0 > 0;

        bool sendColl1AsWrapped =
            _tokens.token1 == TokenUtils.ETH_ADDR &&
            _params.variableData.collAmount1 > 0;

        address sendTokensTo = (sendColl0AsWrapped || sendColl1AsWrapped) ? address(this) : _params.to;

        ( , int256 collShares , ) = IFluidVaultT2(_params.vault).operate(
            _params.nftId,
            -signed256(_params.variableData.collAmount0),
            -signed256(_params.variableData.collAmount1),
            -signed256(_params.variableData.maxCollSharesToBurn),
            0, /* newDebt_ */
            sendTokensTo
        );

        if (sendColl0AsWrapped) {
            TokenUtils.depositWeth(_params.variableData.collAmount0);
            TokenUtils.WETH_ADDR.withdrawTokens(_params.to, _params.variableData.collAmount0);

            if (_params.variableData.collAmount1 > 0) {
                _tokens.token1.withdrawTokens(_params.to, _params.variableData.collAmount1);
            }
        }

        if (sendColl1AsWrapped) {
            TokenUtils.depositWeth(_params.variableData.collAmount1);
            TokenUtils.WETH_ADDR.withdrawTokens(_params.to, _params.variableData.collAmount1);

            if (_params.variableData.collAmount0 > 0) {
                _tokens.token0.withdrawTokens(_params.to, _params.variableData.collAmount0);
            }
        }

        collSharesBurned = uint256(-collShares);
    }

    function _withdrawExact(
        Params memory _params,
        IFluidVaultT2.Tokens memory _tokens
    ) internal returns (uint256 collSharesBurned) {
        bool sendColl0AsWrapped =
            _tokens.token0 == TokenUtils.ETH_ADDR &&
            _params.exactData.minCollAmount0 > 0;

        bool sendColl1AsWrapped =
            _tokens.token1 == TokenUtils.ETH_ADDR &&
            _params.exactData.minCollAmount1 > 0;

        address sendTokensTo = (sendColl0AsWrapped || sendColl1AsWrapped) ? address(this) : _params.to;

        // type(int256).min will burn all the user's shares inside the vault
        int256 sharesToBurn = _params.exactData.perfectCollShares == type(uint256).max
            ? type(int256).min
            : -signed256(_params.exactData.perfectCollShares);

        ( , int256[] memory retVals ) = IFluidVaultT2(_params.vault).operatePerfect(
            _params.nftId,
            sharesToBurn,
            -signed256(_params.exactData.minCollAmount0),
            -signed256(_params.exactData.minCollAmount1),
            0, /* newDebt_ */
            sendTokensTo
        );

        uint256 collAmount0Withdrawn = uint256(-retVals[1]);
        uint256 collAmount1Withdrawn = uint256(-retVals[2]);

        if (sendColl0AsWrapped) {
            TokenUtils.depositWeth(collAmount0Withdrawn);
            TokenUtils.WETH_ADDR.withdrawTokens(_params.to, collAmount0Withdrawn);

            if (collAmount1Withdrawn > 0) {
                _tokens.token1.withdrawTokens(_params.to, collAmount1Withdrawn);
            }
        }

        if (sendColl1AsWrapped) {
            TokenUtils.depositWeth(collAmount1Withdrawn);
            TokenUtils.WETH_ADDR.withdrawTokens(_params.to, collAmount1Withdrawn);

            if (collAmount0Withdrawn > 0) {
                _tokens.token0.withdrawTokens(_params.to, collAmount0Withdrawn);
            }
        }

        collSharesBurned = uint256(-retVals[0]);
    }
 
    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}
