// SPDX-License-Identifier: MIT

pragma solidity =0.8.24;

import { IFluidVaultT2 } from "../../../interfaces/fluid/IFluidVaultT2.sol";
import { FluidHelper } from "../helpers/FluidHelper.sol";
import { ActionBase } from "../../ActionBase.sol";
import { TokenUtils } from "../../../utils/TokenUtils.sol";

/// @title Open position on Fluid Vault T2 (2_col:1_debt)
contract FluidVaultT2Open is ActionBase, FluidHelper {
    using TokenUtils for address;

    enum ShareType {
        VARIABLE,
        EXACT
    }

    /// @param collAmount0 Amount of collateral 0 to deposit.
    /// @param collAmount1 Amount of collateral 1 to deposit.
    /// @param minCollShares Min amount of collateral shares to mint.
    struct ShareVariableData {
        uint256 collAmount0;
        uint256 collAmount1;
        uint256 minCollShares;
    }

    /// @param perfectCollShares Exact amount of shares to mint.
    /// @param maxCollAmount0 Max amount of collateral 0 to deposit.
    /// @param maxCollAmount1 Max amount of collateral 1 to deposit.
    struct ShareExactData {
        uint256 perfectCollShares;
        uint256 maxCollAmount0;
        uint256 maxCollAmount1;
    }

    struct Params {
        address vault;
        ShareType shareType;
        ShareVariableData variableData;
        ShareExactData exactData;
        uint256 debtAmount;
        address from;
        address to;
        bool wrapBorrowedEth;
    }

    // Helper struct to store local variables
    struct PulledCollateralVars {
        uint256 collAmount0;
        uint256 collAmount1;
        bool isColl0Native;
        bool isColl1Native;
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
        params.shareType = ShareType(
            _parseParamUint(uint8(params.shareType), _paramMapping[1], _subData, _returnValues)
        );
        params.variableData.collAmount0 = _parseParamUint(
            params.variableData.collAmount0,
            _paramMapping[2],
            _subData,
            _returnValues
        );
        params.variableData.collAmount1 = _parseParamUint(
            params.variableData.collAmount1,
            _paramMapping[3],
            _subData,
            _returnValues
        );
        params.variableData.minCollShares = _parseParamUint(
            params.variableData.minCollShares,
            _paramMapping[4],
            _subData,
            _returnValues
        );
        params.exactData.perfectCollShares = _parseParamUint(
            params.exactData.perfectCollShares,
            _paramMapping[5],
            _subData,
            _returnValues
        );
        params.exactData.maxCollAmount0 = _parseParamUint(
            params.exactData.maxCollAmount0,
            _paramMapping[6],
            _subData,
            _returnValues
        );
        params.exactData.maxCollAmount1 = _parseParamUint(
            params.exactData.maxCollAmount1,
            _paramMapping[7],
            _subData,
            _returnValues
        );

        params.debtAmount = _parseParamUint(params.debtAmount, _paramMapping[8], _subData, _returnValues);
        params.from = _parseParamAddr(params.from, _paramMapping[9], _subData, _returnValues);
        params.to = _parseParamAddr(params.to, _paramMapping[10], _subData, _returnValues);
        params.wrapBorrowedEth = _parseParamUint(
            params.wrapBorrowedEth ? 1 : 0,
            _paramMapping[11],
            _subData,
            _returnValues
        ) == 1;

        (uint256 nftId, bytes memory logData) = _open(params);
        emit ActionEvent("FluidVaultT2Open", logData);
        return bytes32(nftId);
    }

    /// @inheritdoc ActionBase
    function executeActionDirect(bytes memory _callData) public payable override {
        Params memory params = parseInputs(_callData);
        (, bytes memory logData) = _open(params);
        logger.logActionDirectEvent("FluidVaultT2Open", logData);
    }

    /// @inheritdoc ActionBase
    function actionType() public pure virtual override returns (uint8) {
        return uint8(ActionType.STANDARD_ACTION);
    }

    /*//////////////////////////////////////////////////////////////
                            ACTION LOGIC
    //////////////////////////////////////////////////////////////*/
    function _open(Params memory _params) internal returns (uint256, bytes memory) {
        IFluidVaultT2.ConstantViews memory constants = IFluidVaultT2(_params.vault).constantsView();

        bool shouldWrapBorrowedEth = 
            _params.wrapBorrowedEth &&
            _params.debtAmount > 0 &&
            constants.borrowToken.token0 == TokenUtils.ETH_ADDR;

        uint256 nftId = _params.shareType == ShareType.VARIABLE
            ? _openVariable(_params, constants.supplyToken, shouldWrapBorrowedEth)
            : _openExact(_params, constants.supplyToken, shouldWrapBorrowedEth);

        if (shouldWrapBorrowedEth) {
            TokenUtils.depositWeth(_params.debtAmount);
            TokenUtils.WETH_ADDR.withdrawTokens(_params.to, _params.debtAmount);    
        }

        return (nftId, abi.encode(_params));
    }

    function _openVariable(
        Params memory _params,
        IFluidVaultT2.Tokens memory _tokens,
        bool _shouldWrapBorrowedEth
    ) internal returns (uint256 nftId) {
        PulledCollateralVars memory vars;

        (vars.collAmount0, vars.isColl0Native) = _pullTokensIfNeededWithApproval(
            _params.variableData.collAmount0,
            _tokens.token0,
            _params.from,
            _params.vault
        );

        (vars.collAmount1, vars.isColl1Native) = _pullTokensIfNeededWithApproval(
            _params.variableData.collAmount1,
            _tokens.token1,
            _params.from,
            _params.vault
        );

        uint256 msgValue = vars.isColl0Native
            ? vars.collAmount0
            : (vars.isColl1Native ? vars.collAmount1 : 0);

        (nftId , , ) = IFluidVaultT2(_params.vault).operate{ value: msgValue }(
            0, /* _nftId */
            int256(vars.collAmount0),
            int256(vars.collAmount1),
            int256(_params.variableData.minCollShares),
            int256(_params.debtAmount),
            _shouldWrapBorrowedEth ? address(this) : _params.to
        );
    }

    function _openExact(
        Params memory _params,
        IFluidVaultT2.Tokens memory _tokens,
        bool _shouldWrapBorrowedEth
    ) internal returns (uint256 nftId) {
        PulledCollateralVars memory vars;

        // We always pull the max amount of collateral0 and refund the difference later
        (vars.collAmount0, vars.isColl0Native) = _pullTokensIfNeededWithApproval(
            _params.exactData.maxCollAmount0,
            _tokens.token0,
            _params.from,
            _params.vault
        );
        // We always pull the max amount of collateral1 and refund the difference later
        (vars.collAmount1, vars.isColl1Native) = _pullTokensIfNeededWithApproval(
            _params.exactData.maxCollAmount1,
            _tokens.token1,
            _params.from,
            _params.vault
        );

        uint256 msgValue = vars.isColl0Native
            ? vars.collAmount0
            : (vars.isColl1Native ? vars.collAmount1 : 0);

        int256[] memory retVals;

        (nftId, retVals) = IFluidVaultT2(_params.vault).operatePerfect{ value: msgValue }(
            0, /* _nftId */
            int256(_params.exactData.perfectCollShares),
            int256(vars.collAmount0),
            int256(vars.collAmount1),
            int256(_params.debtAmount),
            _shouldWrapBorrowedEth ? address(this) : _params.to
        );

        {   // Refund any excess collateral0
            uint256 pulledCollAmount0 = uint256(retVals[1]);
            if (pulledCollAmount0 < vars.collAmount0) {
                uint256 refund = vars.collAmount0 - pulledCollAmount0;
                // Refund ETH as WETH
                if (vars.isColl0Native) {
                    TokenUtils.depositWeth(refund);
                    TokenUtils.WETH_ADDR.withdrawTokens(_params.from, refund);
                } else {
                    _tokens.token0.withdrawTokens(_params.from, refund);
                    _tokens.token0.approveToken(_params.vault, 0);
                }
            }
        }
        {   // Refund any excess collateral1
            uint256 pulledCollAmount1 = uint256(retVals[2]);
            if (pulledCollAmount1 < vars.collAmount1) {
                uint256 refund = vars.collAmount1 - pulledCollAmount1;
                // Refund ETH as WETH
                if (vars.isColl1Native) {
                    TokenUtils.depositWeth(refund);
                    TokenUtils.WETH_ADDR.withdrawTokens(_params.from, refund);
                } else {
                    _tokens.token1.withdrawTokens(_params.from, refund);
                    _tokens.token1.approveToken(_params.vault, 0);
                }
            }
        }
    }

    function _pullTokensIfNeededWithApproval(
        uint256 _amount,
        address _token,
        address _from,
        address _approvalTarget
    ) internal returns (uint256 amount, bool isNative) {
        if (_amount == 0) return (0, false);

        if (_token == TokenUtils.ETH_ADDR) {
            _amount = TokenUtils.WETH_ADDR.pullTokensIfNeeded(_from, _amount);
            TokenUtils.withdrawWeth(_amount);
            return (_amount, true);
        }

        _amount = _token.pullTokensIfNeeded(_from, _amount);
        _token.approveToken(_approvalTarget, _amount);

        return (_amount, false);
    }

    function parseInputs(bytes memory _callData) public pure returns (Params memory params) {
        params = abi.decode(_callData, (Params));
    }
}